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
const configuredProductionOrigin = 'https://ai-powered-study-tracker.vercel.app';

const restoreRuntime = () => {
  for (const key of Object.keys(process.env)) {
    if (!Object.hasOwn(originalEnv, key)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  process.argv = [...originalArgv];
};

const setRuntime = ({ nodeEnv, clientOrigin }) => {
  process.env.NODE_ENV = nodeEnv;
  delete process.env.CLIENT_ORIGIN;
  if (clientOrigin !== undefined) process.env.CLIENT_ORIGIN = clientOrigin;
  process.argv = originalArgv.filter((arg) => arg !== '--enable-local-debug-routes');
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

const routeStub = () => {
  const router = express.Router();
  router.get('/sentinel', (req, res) => res.status(200).json({ route: 'sentinel' }));
  return router;
};

const loadApp = () => loadWithStubs('../app.js', {
  './routes/auth.routes': routeStub(),
  './routes/user.routes': routeStub(),
  './routes/session.routes': routeStub(),
  './routes/stats.routes': routeStub(),
  './routes/ai.routes': routeStub(),
  './routes/achievement.routes': routeStub(),
  './routes/gemini.routes': routeStub(),
  './routes/subject.routes': routeStub(),
  './routes/chapter.routes': routeStub(),
  './routes/semester.routes': routeStub(),
  './routes/exam.routes': routeStub(),
  './routes/planner.routes': routeStub(),
  './routes/debug.routes': routeStub(),
  './middleware/rateLimiter.middleware': {
    apiLimiter: (req, res, next) => next(),
    geminiLimiter: (req, res, next) => next(),
  },
});

const request = async (app, { origin, url = '/api/v1/auth/sentinel' } = {}) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const headers = origin === undefined ? {} : { Origin: origin };
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { headers });
    return {
      status: response.status,
      allowOrigin: response.headers.get('access-control-allow-origin'),
      allowCredentials: response.headers.get('access-control-allow-credentials'),
    };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

test('configured production origin is accepted with an exact credentialed CORS response', async () => {
  try {
    setRuntime({ nodeEnv: 'production', clientOrigin: configuredProductionOrigin });
    const result = await request(loadApp(), { origin: configuredProductionOrigin });

    assert.equal(result.status, 200);
    assert.equal(result.allowOrigin, configuredProductionOrigin);
    assert.equal(result.allowCredentials, 'true');
    assert.notEqual(result.allowOrigin, '*');
  } finally {
    restoreRuntime();
  }
});

test('unrelated origins containing vercel.app are rejected', async () => {
  try {
    setRuntime({ nodeEnv: 'production', clientOrigin: configuredProductionOrigin });
    const app = loadApp();

    for (const origin of [
      'https://vercel.app.attacker.example',
      'https://unrelated-preview.vercel.app',
    ]) {
      const result = await request(app, { origin });
      assert.notEqual(result.status, 200, `${origin} must not reach the route`);
      assert.equal(result.allowOrigin, null);
      assert.notEqual(result.allowOrigin, '*');
    }

    const explicitlyTrustedPreview = 'https://trusted-preview.vercel.app';
    setRuntime({ nodeEnv: 'production', clientOrigin: explicitlyTrustedPreview });
    const trustedPreviewResult = await request(loadApp(), { origin: explicitlyTrustedPreview });
    assert.equal(trustedPreviewResult.status, 200);
    assert.equal(trustedPreviewResult.allowOrigin, explicitlyTrustedPreview);
    assert.equal(trustedPreviewResult.allowCredentials, 'true');
  } finally {
    restoreRuntime();
  }
});

test('local development origins work only in development', async () => {
  try {
    setRuntime({ nodeEnv: 'development' });
    const developmentApp = loadApp();

    for (const origin of ['http://localhost:5173', 'http://localhost:3000']) {
      const result = await request(developmentApp, { origin });
      assert.equal(result.status, 200);
      assert.equal(result.allowOrigin, origin);
      assert.equal(result.allowCredentials, 'true');
    }

    setRuntime({ nodeEnv: 'production', clientOrigin: configuredProductionOrigin });
    const productionApp = loadApp();
    for (const origin of ['http://localhost:5173', 'http://localhost:3000']) {
      const result = await request(productionApp, { origin });
      assert.notEqual(result.status, 200, `${origin} must not be trusted in production`);
      assert.equal(result.allowOrigin, null);
    }
  } finally {
    restoreRuntime();
  }
});

test('requests without an Origin header preserve the existing behavior without a wildcard', async () => {
  try {
    setRuntime({ nodeEnv: 'production', clientOrigin: configuredProductionOrigin });
    const result = await request(loadApp());

    assert.equal(result.status, 200);
    assert.equal(result.allowOrigin, null);
    assert.notEqual(result.allowOrigin, '*');
  } finally {
    restoreRuntime();
  }
});
