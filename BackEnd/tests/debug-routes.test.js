'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');

const originalEnv = { ...process.env };
const originalArgv = [...process.argv];

const restoreRuntime = () => {
  for (const key of Object.keys(process.env)) {
    if (!Object.hasOwn(originalEnv, key)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  process.argv = [...originalArgv];
};

const setRuntime = ({ nodeEnv, vercel, vercelEnv, enableFlag }) => {
  process.env.NODE_ENV = nodeEnv;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  if (vercel !== undefined) process.env.VERCEL = vercel;
  if (vercelEnv !== undefined) process.env.VERCEL_ENV = vercelEnv;
  process.argv = originalArgv.filter((arg) => arg !== '--enable-local-debug-routes');
  if (enableFlag) process.argv.push('--enable-local-debug-routes');
};

const loadWithStubs = (relativePath, stubs) => {
  const filename = path.resolve(__dirname, relativePath);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const requireStub = (name) => Object.hasOwn(stubs, name) ? stubs[name] : localRequire(name);
  const load = vm.runInNewContext(
    `(function(require, module, exports) {\n${readFileSync(filename, 'utf8')}\n})`,
    { console, process },
    { filename }
  );
  load(requireStub, module, module.exports);
  return module.exports;
};

const routeStub = (name) => {
  const router = express.Router();
  router.get('/sentinel', (req, res) => res.status(200).json({ route: name }));
  return router;
};

const loadApp = ({ debugRouter = routeStub('debug') } = {}) => loadWithStubs('../app.js', {
  './routes/auth.routes': routeStub('auth'),
  './routes/user.routes': routeStub('users'),
  './routes/session.routes': routeStub('sessions'),
  './routes/stats.routes': routeStub('stats'),
  './routes/ai.routes': routeStub('ai'),
  './routes/achievement.routes': routeStub('achievements'),
  './routes/gemini.routes': routeStub('gemini'),
  './routes/subject.routes': routeStub('subjects'),
  './routes/chapter.routes': routeStub('chapters'),
  './routes/semester.routes': routeStub('semester'),
  './routes/exam.routes': routeStub('exams'),
  './routes/planner.routes': routeStub('planner'),
  './routes/debug.routes': debugRouter,
  './middleware/rateLimiter.middleware': {
    apiLimiter: (req, res, next) => next(),
    geminiLimiter: (req, res, next) => next(),
  },
});

const request = async (app, url, method = 'GET') => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

const loadDebugRouter = () => loadWithStubs('../routes/debug.routes.js', {
  '../config/prisma': {
    prisma: {
      user: {
        count: async () => 0,
        findMany: async () => [],
        deleteMany: async () => ({ count: 0 }),
        findUnique: async () => null,
      },
    },
    toPublicJSON: (user) => user,
    comparePassword: async () => false,
  },
  '../config/ai': {
    getModelsToTry: () => [],
    PRIMARY_MODEL: 'test-model',
    FALLBACK_MODELS: [],
  },
  '../services/gemini.service': {
    testGeminiConnectivity: async () => ({ model: 'test-model', checkedAt: 'fixture', response: 'ok' }),
    generateGeminiText: async () => ({ text: '{}' }),
  },
  '../utils/plannerParser': {
    parseAndNormalizePlannerResponse: () => ({ parsed: {}, validationStatus: { isValid: true, errors: [] } }),
  },
  '../config/jwt': {
    signAccessToken: () => 'fixture-access-token',
    signRefreshToken: () => 'fixture-refresh-token',
    verifyAccessToken: () => ({}),
  },
});

test('Vercel-style runtime omits every debug endpoint even with NODE_ENV=development', async () => {
  try {
    setRuntime({ nodeEnv: 'development', vercel: '1', vercelEnv: 'production', enableFlag: true });
    const app = loadApp();

    for (const [url, method] of [
      ['/api/debug/users', 'GET'],
      ['/api/debug/clear-users', 'DELETE'],
      ['/api/debug/check-user', 'POST'],
      ['/api/debug/test-login', 'POST'],
      ['/api/debug/auth-status', 'GET'],
      ['/api/debug/gemini', 'GET'],
      ['/api/debug/ai-planner', 'GET'],
    ]) {
      const result = await request(app, url, method);
      assert.equal(result.status, 404, `${method} ${url} must be absent from the deployment app`);
    }

    assert.equal((await request(app, '/api/health')).status, 200);
    assert.equal((await request(app, '/api/v1/auth/sentinel')).status, 200);
  } finally {
    restoreRuntime();
  }
});

test('production runtime omits debug endpoints even without Vercel markers', async () => {
  try {
    setRuntime({ nodeEnv: 'production', enableFlag: true });
    const app = loadApp();
    assert.equal((await request(app, '/api/debug/users')).status, 404);
    assert.equal((await request(app, '/api/health')).status, 200);
    assert.equal((await request(app, '/api/v1/sessions/sentinel')).status, 200);
  } finally {
    restoreRuntime();
  }
});

test('local debug diagnostics require the explicit local flag and remain available only locally', async () => {
  try {
    setRuntime({ nodeEnv: 'development', enableFlag: true });
    const localApp = loadApp();
    assert.equal((await request(localApp, '/api/debug/sentinel')).status, 200);

    const debugRouter = loadDebugRouter();
    const diagnosticApp = express();
    diagnosticApp.use('/api/debug', debugRouter);
    assert.equal((await request(diagnosticApp, '/api/debug/users')).status, 200);

    setRuntime({ nodeEnv: 'development', vercel: '1', vercelEnv: 'preview', enableFlag: true });
    const blockedRouter = loadDebugRouter();
    const blockedApp = express();
    blockedApp.use('/api/debug', blockedRouter);
    assert.equal((await request(blockedApp, '/api/debug/users')).status, 403);
  } finally {
    restoreRuntime();
  }
});
