'use strict';

const assert = require('node:assert/strict');
const { before, after, beforeEach, test } = require('node:test');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const AppError = require('../utils/AppError');
const errorHandler = require('../middleware/error.middleware');

// Load the real routes/controllers with explicit boundary stubs. Never load the
// application entry point, Prisma client, SMTP transport, JWT config, or .env.
const loadWithStubs = (relativePath, stubs) => {
  const filename = path.resolve(__dirname, relativePath);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const requireStub = (name) => Object.hasOwn(stubs, name) ? stubs[name] : localRequire(name);
  const load = vm.runInNewContext(
    `(function(require, module, exports) {\n${readFileSync(filename, 'utf8')}\n})`,
    { console },
    { filename }
  );
  load(requireStub, module, module.exports);
  return module.exports;
};

// Synthetic fixtures only; assertion messages and test names never print bodies.
const strongPassword = 'FixturePass1!';
const validEmail = 'student@example.com';
const validOtp = '012345';
const nonStrings = [null, 123456, true, {}, [], [strongPassword]];
const invalidPasswords = [
  undefined, ...nonStrings, '', 'Aa1!abc', 'lowercase1!', 'UPPERCASE1!',
  'NoNumbers!', 'NoSpecial1', `Aa1!${'x'.repeat(125)}`,
];
const invalidEmails = [undefined, ...nonStrings, '', '  ', 'not-an-email', [validEmail]];
const invalidOtps = [
  undefined, ...nonStrings, '', '12345', '1234567', '12a456', '+12345',
  '12.345', '１２３４５６', '١٢٣٤٥٦', [validOtp],
];

let trace = [];
let receivedBody;
const controllerNames = [
  'register', 'login', 'logout', 'refresh', 'getMe', 'forgotPassword',
  'verifyOtp', 'resendOtp', 'resetPassword', 'updateMe', 'updatePassword',
];
const controllers = Object.fromEntries(controllerNames.map((name) => [name, (req, res) => {
  trace.push(name);
  receivedBody = req.body;
  res.status(name === 'register' ? 201 : 200).json({ success: true, data: { message: 'Controller reached.' } });
}]));
const protect = (req, res, next) => {
  trace.push('protect');
  if (req.headers['x-test-authenticated'] !== 'true') {
    return next(new AppError('Authentication required.', 401, 'NOT_AUTHENTICATED'));
  }
  req.user = { id: 'test-user' };
  next();
};
const recordMiddleware = (name) => (req, res, next) => {
  trace.push(name);
  next();
};
const authRoutes = loadWithStubs('../routes/auth.routes.js', {
  '../controllers/auth.controller': controllers,
  '../middleware/auth.middleware': { protect },
  '../middleware/rateLimiter.middleware': {
    authLimiter: recordMiddleware('authLimiter'),
    logAuthRateLimit: recordMiddleware('logAuthRateLimit'),
  },
});
const userRoutes = loadWithStubs('../routes/user.routes.js', {
  '../controllers/user.controller': controllers,
  '../middleware/auth.middleware': { protect },
});
let server;
let origin;

before(async () => {
  const app = express();
  app.use(express.json());
  // Both existing public auth aliases use the same router in app.js.
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
});

beforeEach(() => {
  trace = [];
  receivedBody = undefined;
});

const request = async (url, body, { method = 'POST', authenticated = true } = {}) => {
  trace = [];
  receivedBody = undefined;
  const response = await fetch(`${origin}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-test-authenticated': String(authenticated) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const assertRejected = (response, expectedTrace = ['authLimiter', 'logAuthRateLimit']) => {
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(typeof response.body.error.message, 'string');
  assert.deepEqual(trace, expectedTrace, 'Invalid input must not reach the controller');
  assert.equal(receivedBody, undefined);
};

const validBodies = {
  register: { name: 'Test Student', email: validEmail, password: strongPassword },
  login: { email: validEmail, password: 'legacy' },
  'forgot-password': { email: validEmail },
  'verify-otp': { email: validEmail, otp: validOtp },
  'resend-otp': { email: validEmail },
  'reset-password': { email: validEmail, otp: validOtp, newPassword: strongPassword },
};
const actions = {
  register: 'register', login: 'login', 'forgot-password': 'forgotPassword',
  'verify-otp': 'verifyOtp', 'resend-otp': 'resendOtp', 'reset-password': 'resetPassword',
};

for (const prefix of ['/api/v1/auth', '/api/auth']) {
  test(`${prefix}: missing and malformed emails are rejected before every auth controller`, async () => {
    for (const [route, body] of Object.entries(validBodies)) {
      assertRejected(await request(`${prefix}/${route}`, undefined));
      for (const email of invalidEmails) {
        assertRejected(await request(`${prefix}/${route}`, { ...body, email }));
      }
    }
  });

  test(`${prefix}: registration rejects invalid names and weak or non-string passwords`, async () => {
    for (const name of [undefined, ...nonStrings, '', '  ', 'x'.repeat(61)]) {
      assertRejected(await request(`${prefix}/register`, { ...validBodies.register, name }));
    }
    for (const password of invalidPasswords) {
      assertRejected(await request(`${prefix}/register`, { ...validBodies.register, password }));
    }
  });

  test(`${prefix}: login validates types but allows legacy passwords without modification`, async () => {
    for (const password of [undefined, ...nonStrings, '']) {
      assertRejected(await request(`${prefix}/login`, { ...validBodies.login, password }));
    }
    for (const password of ['legacy', ' x ', 'x'.repeat(129)]) {
      const response = await request(`${prefix}/login`, { ...validBodies.login, password });
      assert.equal(response.status, 200);
      assert.equal(receivedBody.password === password, true, 'Login must not rewrite passwords');
      assert.deepEqual(trace, ['authLimiter', 'logAuthRateLimit', 'login']);
    }
  });

  test(`${prefix}: OTP verification and reset require six ASCII digits`, async () => {
    for (const route of ['verify-otp', 'reset-password']) {
      for (const otp of invalidOtps) {
        assertRejected(await request(`${prefix}/${route}`, { ...validBodies[route], otp }));
      }
    }
    for (const newPassword of invalidPasswords) {
      assertRejected(await request(`${prefix}/reset-password`, { ...validBodies['reset-password'], newPassword }));
    }
  });

  test(`${prefix}: OTP purposes stay optional and retain both supported values`, async () => {
    for (const route of ['verify-otp', 'resend-otp']) {
      for (const purpose of [undefined, 'password_reset', 'email_verification']) {
        const response = await request(`${prefix}/${route}`, { ...validBodies[route], purpose });
        assert.equal(response.status, 200);
        assert.deepEqual(trace, ['authLimiter', 'logAuthRateLimit', actions[route]]);
      }
      for (const purpose of [null, 'unsupported', true, {}, ['password_reset']]) {
        assertRejected(await request(`${prefix}/${route}`, { ...validBodies[route], purpose }));
      }
    }
  });

  test(`${prefix}: valid frontend payloads reach controllers without rewriting email identities`, async () => {
    for (const email of ['Student.Name+fixture@gmail.com', 'Student.Name+fixture@googlemail.com', 'Student-fixture@yahoo.com', validEmail]) {
      for (const [route, body] of Object.entries(validBodies)) {
        const response = await request(`${prefix}/${route}`, { ...body, email: ` ${email} ` });
        assert.equal(response.status, route === 'register' ? 201 : 200);
        // Controllers already lowercase emails; dots, aliases, and domains must survive validation.
        assert.equal(receivedBody.email.toLowerCase() === email.toLowerCase(), true);
        assert.deepEqual(trace, ['authLimiter', 'logAuthRateLimit', actions[route]]);
      }
    }
  });
}

test('password change is protected and rejects invalid input before its controller', async () => {
  const url = '/api/v1/users/me/password';
  const body = { currentPassword: 'legacy', newPassword: strongPassword };
  const denied = await request(url, body, { method: 'PATCH', authenticated: false });
  assert.equal(denied.status, 401);
  assert.deepEqual(trace, ['protect']);
  for (const currentPassword of [undefined, ...nonStrings, '']) {
    assertRejected(await request(url, { ...body, currentPassword }, { method: 'PATCH' }), ['protect']);
  }
  for (const newPassword of invalidPasswords) {
    assertRejected(await request(url, { ...body, newPassword }, { method: 'PATCH' }), ['protect']);
  }
  const response = await request(url, body, { method: 'PATCH' });
  assert.equal(response.status, 200);
  assert.deepEqual(trace, ['protect', 'updatePassword']);
  assert.equal(receivedBody.currentPassword === body.currentPassword, true);
});

test('new-password boundaries and whitespace are consistent across registration, reset, and change', async () => {
  for (const password of ['Aa1!abcd', `Aa1!${'x'.repeat(124)}`, ' FixturePass1! ']) {
    for (const [url, field, body, method, status] of [
      ['/api/v1/auth/register', 'password', validBodies.register, 'POST', 201],
      ['/api/v1/auth/reset-password', 'newPassword', validBodies['reset-password'], 'POST', 200],
      ['/api/v1/users/me/password', 'newPassword', { currentPassword: 'legacy' }, 'PATCH', 200],
    ]) {
      const response = await request(url, { ...body, [field]: password }, { method });
      assert.equal(response.status, status);
      assert.equal(receivedBody[field] === password, true, 'New passwords must not be trimmed');
    }
  }
});

// Exercise the real password-writing controllers separately, with in-memory
// persistence and crypto/mail boundaries. No production services are imported.
const makePasswordController = (kind, { credentialsMatch = true } = {}) => {
  const effects = { reads: 0, hashes: 0, writes: [] };
  const user = {
    id: 'test-user', password: 'fixture-hash', otpHash: 'fixture-otp-hash',
    otpExpiresAt: new Date(Date.now() + 60_000), otpAttempts: 0,
  };
  const stubs = {
    '../config/prisma': {
      prisma: { user: {
        findUnique: async () => { effects.reads++; return user; },
        update: async ({ data }) => { effects.writes.push(data); return user; },
      } },
      comparePassword: async () => credentialsMatch,
      hashPassword: async () => { effects.hashes++; return 'new-fixture-hash'; },
    },
  };
  if (kind === 'reset') {
    Object.assign(stubs, {
      jsonwebtoken: {},
      '../config/jwt': {},
      '../utils/otp': { compareOTP: async () => credentialsMatch },
      '../services/email.service': {},
    });
  }
  const controller = loadWithStubs(`../controllers/${kind === 'reset' ? 'auth' : 'user'}.controller.js`, stubs);
  return { effects, handler: kind === 'reset' ? controller.resetPassword : controller.updatePassword };
};

const invokeController = (handler, body) => new Promise((resolve) => {
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(payload) { resolve({ status: this.statusCode, body: payload }); },
  };
  handler({ body, user: { id: 'test-user' } }, res, (error) => resolve({ error }));
});

for (const kind of ['change', 'reset']) {
  const body = kind === 'reset'
    ? { email: validEmail, otp: validOtp, newPassword: strongPassword }
    : { currentPassword: 'legacy', newPassword: strongPassword };

  test(`${kind} controller rejects weak passwords without hashing or writing`, async () => {
    for (const newPassword of invalidPasswords.filter((value) => typeof value === 'string' && value)) {
      const { handler, effects } = makePasswordController(kind);
      const result = await invokeController(handler, { ...body, newPassword });
      assert.equal(result.error?.statusCode, 400);
      assert.equal(['WEAK_PASSWORD', 'PASSWORD_TOO_LONG'].includes(result.error?.code), true);
      assert.equal(effects.hashes, 0);
      assert.equal(effects.writes.length, 0);
    }
  });

  test(`${kind} controller still verifies credentials before saving a valid new password`, async () => {
    const { handler, effects } = makePasswordController(kind, { credentialsMatch: false });
    const result = await invokeController(handler, body);
    assert.equal(result.error?.code, kind === 'reset' ? 'INVALID_OTP' : 'WRONG_PASSWORD');
    assert.equal(effects.hashes, 0);
    assert.equal(effects.writes.some((data) => Object.hasOwn(data, 'password')), false);
  });

  test(`${kind} controller preserves the success response and persistence behavior`, async () => {
    const { handler, effects } = makePasswordController(kind);
    const result = await invokeController(handler, body);
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.message, kind === 'reset'
      ? 'Password updated successfully. Please login with your new password.'
      : 'Password updated successfully.');
    assert.equal(effects.hashes, 1);
    assert.equal(effects.writes.length, 1);
    assert.equal(effects.writes[0].password === 'new-fixture-hash', true);
    if (kind === 'reset') {
      assert.equal(effects.writes[0].otpHash, null);
      assert.equal(effects.writes[0].otpExpiresAt, null);
      assert.equal(effects.writes[0].otpAttempts, 0);
      assert.equal(effects.writes[0].refreshToken, null);
    }
  });
}
