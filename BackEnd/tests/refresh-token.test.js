'use strict';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '1h';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  refreshCookieOptions,
  clearCookieOptions,
} = jwtConfig;

const user = {
  id: 'user-a',
  name: 'Test Student',
  email: 'student@example.com',
  password: 'fixture-password-hash',
  refreshToken: null,
};

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
    cookies: [],
    clearedCookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookies.push({ name, options });
      return this;
    },
    json(body) {
      finish({ status: this.statusCode, body, res: this });
    },
  };

  handler(req, res, (error) => finish({ error, res }));
});

const makeHarness = ({ storedRefreshToken = null, comparePassword = true } = {}) => {
  const state = {
    storedRefreshToken,
    updateCalls: [],
    updateManyCalls: [],
    findCalls: [],
  };
  const controller = loadWithStubs('../controllers/auth.controller.js', {
    '../config/prisma': {
      prisma: {
        user: {
          findUnique: async (args) => {
            state.findCalls.push(args);
            return { ...user, refreshToken: state.storedRefreshToken };
          },
          update: async (args) => {
            state.updateCalls.push(args);
            if (args.data.refreshToken !== undefined) {
              state.storedRefreshToken = args.data.refreshToken;
            }
            return { ...user, refreshToken: state.storedRefreshToken };
          },
          updateMany: async (args) => {
            state.updateManyCalls.push(args);
            if (state.storedRefreshToken !== args.where.refreshToken) {
              return { count: 0 };
            }
            state.storedRefreshToken = args.data.refreshToken;
            return { count: 1 };
          },
        },
      },
      toPublicJSON: (record) => ({ id: record.id, name: record.name, email: record.email }),
      comparePassword: async () => comparePassword,
      hashPassword: async () => 'new-fixture-password-hash',
    },
    '../config/jwt': jwtConfig,
    '../services/email.service': { sendOTP: async () => undefined },
    '../utils/otp': {
      generateOTP: () => '012345',
      hashOTP: async () => 'fixture-otp-hash',
      compareOTP: async () => true,
    },
    '../utils/passwordValidation': {
      assertStrongPassword: () => undefined,
    },
  });
  return { controller, state };
};

const refreshRequest = (token) => ({ cookies: { refreshToken: token } });

test('login stores only a refresh-token hash and preserves the cookie/API contract', async () => {
  const { controller, state } = makeHarness();
  const result = await invoke(controller.login, {
    body: { email: user.email, password: 'fixture-password' },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.accessToken.length > 0, true);
  assert.equal(result.res.cookies.length, 1);
  const rawRefreshToken = result.res.cookies[0].value;
  assert.equal(typeof state.storedRefreshToken, 'string');
  assert.equal(state.storedRefreshToken === rawRefreshToken, false);
  assert.equal(state.storedRefreshToken.startsWith('hmac-sha256:'), true);
  assert.equal(compareRefreshToken(rawRefreshToken, state.storedRefreshToken).matches, true);
});

test('successful refresh rotates the refresh token and issues a new access token', async () => {
  const oldToken = signRefreshToken(user);
  const { controller, state } = makeHarness({ storedRefreshToken: hashRefreshToken(oldToken) });
  const result = await invoke(controller.refresh, refreshRequest(oldToken));

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.accessToken.length > 0, true);
  assert.equal(result.res.cookies.length, 1);
  const newToken = result.res.cookies[0].value;
  assert.notEqual(newToken, oldToken);
  assert.equal(compareRefreshToken(newToken, state.storedRefreshToken).matches, true);
  assert.equal(compareRefreshToken(oldToken, state.storedRefreshToken).matches, false);
  assert.equal(state.updateManyCalls.length, 1);
  assert.equal(state.updateManyCalls[0].where.refreshToken, hashRefreshToken(oldToken));
  assert.equal(state.updateManyCalls[0].data.refreshToken === newToken, false);
});

test('a previously rotated token is rejected and cannot revoke the current token', async () => {
  const oldToken = signRefreshToken(user);
  const { controller, state } = makeHarness({ storedRefreshToken: hashRefreshToken(oldToken) });
  const first = await invoke(controller.refresh, refreshRequest(oldToken));
  const currentHash = state.storedRefreshToken;

  const replay = await invoke(controller.refresh, refreshRequest(oldToken));
  assert.equal(replay.error?.statusCode, 401);
  assert.equal(replay.error?.code, 'REFRESH_TOKEN_REUSE');
  assert.equal(replay.res.clearedCookies.length, 1);
  assert.equal(state.storedRefreshToken, currentHash);
  assert.equal(state.updateManyCalls.length, 1);
  assert.equal(first.status, 200);
});

test('invalid-signature and expired tokens are rejected without unverified decoding or database writes', async () => {
  const expiredToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: -1 });

  for (const token of ['not-a-jwt', expiredToken]) {
    const { controller, state } = makeHarness({ storedRefreshToken: hashRefreshToken(signRefreshToken(user)) });
    const result = await invoke(controller.refresh, refreshRequest(token));

    assert.equal(result.error?.statusCode, 401);
    assert.equal(result.error?.code, 'INVALID_REFRESH_TOKEN');
    assert.equal(result.res.clearedCookies.length, 1);
    assert.equal(state.findCalls.length, 0);
    assert.equal(state.updateCalls.length, 0);
    assert.equal(state.updateManyCalls.length, 0);
  }
});

test('a revoked refresh token is rejected', async () => {
  const token = signRefreshToken(user);
  const { controller, state } = makeHarness({ storedRefreshToken: null });
  const result = await invoke(controller.refresh, refreshRequest(token));

  assert.equal(result.error?.statusCode, 401);
  assert.equal(result.error?.code, 'REFRESH_TOKEN_REUSE');
  assert.equal(state.updateManyCalls.length, 0);
  assert.equal(result.res.clearedCookies.length, 1);
});

test('logout revokes the stored refresh-token hash and clears the cookie', async () => {
  const storedHash = hashRefreshToken(signRefreshToken(user));
  const { controller, state } = makeHarness({ storedRefreshToken: storedHash });
  const result = await invoke(controller.logout, { user: { id: user.id } });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(state.updateCalls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.updateCalls[0])), {
    where: { id: user.id },
    data: { refreshToken: null },
  });
  assert.equal(state.storedRefreshToken, null);
  assert.equal(result.res.clearedCookies.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(result.res.clearedCookies[0].options)), JSON.parse(JSON.stringify(clearCookieOptions)));
});

test('concurrent refresh attempts can consume the same stored token only once', async () => {
  const oldToken = signRefreshToken(user);
  const { controller, state } = makeHarness({ storedRefreshToken: hashRefreshToken(oldToken) });

  const [first, second] = await Promise.all([
    invoke(controller.refresh, refreshRequest(oldToken)),
    invoke(controller.refresh, refreshRequest(oldToken)),
  ]);
  const results = [first, second];
  const successes = results.filter((result) => result.status === 200);
  const failures = results.filter((result) => result.error?.code === 'REFRESH_TOKEN_REUSE');

  assert.equal(successes.length, 1);
  assert.equal(failures.length, 1);
  assert.equal(state.updateManyCalls.length, 2);
  assert.equal(state.updateManyCalls.filter((call) => call.where.refreshToken === hashRefreshToken(oldToken)).length, 2);
});

test('a valid legacy plaintext refresh token is upgraded on successful rotation', async () => {
  const legacyToken = signRefreshToken(user);
  const { controller, state } = makeHarness({ storedRefreshToken: legacyToken });
  const result = await invoke(controller.refresh, refreshRequest(legacyToken));

  assert.equal(result.status, 200);
  assert.equal(state.storedRefreshToken === legacyToken, false);
  assert.equal(state.storedRefreshToken.startsWith('hmac-sha256:'), true);
  assert.equal(compareRefreshToken(legacyToken, state.storedRefreshToken).matches, false);
});
