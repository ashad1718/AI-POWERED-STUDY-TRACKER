'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');

const loadWithStubs = (relativePath, stubs) => {
  const filename = path.resolve(__dirname, relativePath);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const requireStub = (name) => Object.hasOwn(stubs, name) ? stubs[name] : localRequire(name);
  const load = vm.runInNewContext(
    `(function(require, module, exports) {\n${readFileSync(filename, 'utf8')}\n})`,
    { console, process, setTimeout, clearTimeout },
    { filename }
  );
  load(requireStub, module, module.exports);
  return module.exports;
};

const invoke = (handler, req) => new Promise((resolve) => {
  let settled = false;
  const finish = (result) => {
    if (!settled) {
      settled = true;
      resolve(result);
    }
  };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { finish({ status: this.statusCode, body }); },
    cookie(name, value) { this.cookieValue = { name, value }; },
    clearCookie() {},
  };
  handler(req, res, (error) => finish({ error }));
});

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });
const jwtStubs = {
  signAccessToken: () => 'access-fixture-token',
  signRefreshToken: () => 'refresh-fixture-token',
  verifyRefreshToken: () => ({ id: 'user-a' }),
  hashRefreshToken: (token) => `hash:${token}`,
  compareRefreshToken: () => ({ matches: true }),
  refreshCookieOptions: { httpOnly: true },
  clearCookieOptions: { httpOnly: true },
};

test('registration persists the user and issues the existing token response contract', async () => {
  const calls = { create: [], updates: [] };
  const prisma = {
    user: {
      findUnique: async () => null,
      create: async ({ data }) => {
        calls.create.push(data);
        return { id: 'user-a', name: data.name, email: data.email, password: data.password };
      },
      update: async ({ data }) => { calls.updates.push(data); return { id: 'user-a' }; },
    },
  };
  const controller = loadWithStubs('../controllers/auth.controller.js', {
    '../config/prisma': {
      prisma,
      toPublicJSON: publicUser,
      comparePassword: async () => true,
      hashPassword: async () => 'password-hash',
    },
    '../config/jwt': jwtStubs,
    '../utils/otp': {},
    '../services/email.service': {},
  });

  const result = await invoke(controller.register, {
    body: { name: 'Student', email: 'student@example.com', password: 'FixturePass1!' },
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.accessToken, 'access-fixture-token');
  assert.equal(calls.create[0].password, 'password-hash');
  assert.equal(calls.updates[0].refreshToken, 'hash:refresh-fixture-token');
});

test('login preserves the 401 contract for incorrect credentials', async () => {
  const controller = loadWithStubs('../controllers/auth.controller.js', {
    '../config/prisma': {
      prisma: { user: { findUnique: async () => ({ id: 'user-a', email: 'student@example.com', password: 'hash' }) } },
      toPublicJSON: publicUser,
      comparePassword: async () => false,
      hashPassword: async () => 'unused',
    },
    '../config/jwt': jwtStubs,
    '../utils/otp': {},
    '../services/email.service': {},
  });

  const result = await invoke(controller.login, {
    body: { email: 'student@example.com', password: 'WrongPass1!' },
  });

  assert.equal(result.error?.statusCode, 401);
  assert.equal(result.error?.code, 'PASSWORD_MISMATCH');
});

test('forgot-password, OTP verification, and reset-password use isolated fixture persistence', async () => {
  const updates = [];
  const sentEmails = [];
  const user = {
    id: 'user-a', email: 'student@example.com', name: 'Student', password: 'old-hash',
    otpHash: null, otpExpiresAt: null, otpAttempts: 0,
  };
  const prisma = {
    user: {
      findUnique: async () => user,
      update: async ({ data }) => {
        updates.push(data);
        Object.assign(user, data);
        return user;
      },
    },
  };
  const controller = loadWithStubs('../controllers/auth.controller.js', {
    '../config/prisma': {
      prisma,
      toPublicJSON: publicUser,
      comparePassword: async () => true,
      hashPassword: async () => 'new-password-hash',
    },
    '../config/jwt': jwtStubs,
    '../utils/otp': {
      generateOTP: () => '123456',
      hashOTP: async () => 'otp-hash',
      compareOTP: async () => true,
    },
    '../services/email.service': {
      sendOTP: async (email, otp) => sentEmails.push({ email, otp }),
    },
  });

  const forgot = await invoke(controller.forgotPassword, { body: { email: user.email } });
  assert.equal(forgot.status, 200);
  assert.deepEqual(sentEmails[0], { email: user.email, otp: '123456' });

  const verify = await invoke(controller.verifyOtp, { body: { email: user.email, otp: '123456' } });
  assert.equal(verify.status, 200);

  const reset = await invoke(controller.resetPassword, {
    body: { email: user.email, otp: '123456', newPassword: 'FixturePass1!' },
  });
  assert.equal(reset.status, 200);
  assert.equal(updates.at(-1).password, 'new-password-hash');
  assert.equal(updates.at(-1).otpHash, null);
  assert.equal(updates.at(-1).refreshToken, null);
});

test('access-token middleware loads the authenticated user and rejects expired tokens', async () => {
  const user = { id: 'user-a', email: 'student@example.com' };
  const loadMiddleware = (verifyAccessToken) => loadWithStubs('../middleware/auth.middleware.js', {
    '../config/jwt': { verifyAccessToken },
    '../config/prisma': { prisma: { user: { findUnique: async () => user } } },
  });

  const accepted = loadMiddleware(() => ({ id: 'user-a' }));
  const acceptedRequest = { headers: { authorization: 'Bearer access-token' } };
  await new Promise((resolve) => accepted.protect(acceptedRequest, {}, (error) => resolve(error)));
  assert.equal(acceptedRequest.user.id, 'user-a');

  const expiredError = new Error('expired');
  expiredError.name = 'TokenExpiredError';
  const rejected = loadMiddleware(() => { throw expiredError; });
  const rejectedResult = await invoke(rejected.protect, { headers: { authorization: 'Bearer expired' } });
  assert.equal(rejectedResult.error?.name, 'TokenExpiredError');
});
