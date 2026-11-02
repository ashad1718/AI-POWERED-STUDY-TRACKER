'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const express = require('express');
const { Prisma } = require('@prisma/client');

const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const errorHandler = require('../middleware/error.middleware');
const { createShutdownHandler } = require('../utils/shutdown');

const loadServerlessHandler = (stubs) => {
  const filename = path.resolve(__dirname, '../../api/index.js');
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

const request = (server, { method = 'GET', path = '/' } = {}) => new Promise((resolve, reject) => {
  const address = server.address();
  const req = http.request({
    hostname: '127.0.0.1',
    port: address.port,
    method,
    path,
  }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = body;
      }
      resolve({ statusCode: res.statusCode, body: parsed });
    });
  });
  req.on('error', reject);
  req.end();
});

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    server.removeListener('error', reject);
    resolve();
  });
});

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
});

const requestThroughErrorHandler = async (error, { environment = 'production', useAsyncHandler = false } = {}) => {
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = environment;

  const app = express();
  const handler = useAsyncHandler
    ? asyncHandler(() => Promise.reject(error))
    : (req, res, next) => next(error);
  app.get('/failure', handler);
  app.use(errorHandler);

  const server = http.createServer(app);
  await listen(server);
  try {
    return await request(server, { path: '/failure' });
  } finally {
    await close(server);
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
};

test('unknown API routes return the standard JSON 404 response', async () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgresql://fixture-host/fixture-database';

  // The app is safe to load without connecting: database connection is owned by
  // the traditional/serverless entry points, not the Express app factory.
  const app = require('../app');
  const server = http.createServer(app);
  await listen(server);

  try {
    const response = await request(server, { path: '/api/v1/not-a-real-route' });
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.body, {
      success: false,
      error: {
        message: 'Route GET /api/v1/not-a-real-route not found',
        code: 'NOT_FOUND',
      },
    });
  } finally {
    await close(server);
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test('validation errors retain the existing response shape and status', async () => {
  const response = await requestThroughErrorHandler(
    new AppError('Email must be valid.', 400, 'VALIDATION_ERROR')
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      message: 'Email must be valid.',
      code: 'VALIDATION_ERROR',
    },
  });
});

test('malformed JSON is returned as a validation error instead of an internal error', async () => {
  const response = await requestThroughErrorHandler(
    Object.assign(new SyntaxError('raw parser details'), { type: 'entity.parse.failed' })
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      message: 'Request body contains invalid JSON.',
      code: 'VALIDATION_ERROR',
    },
  });
});

test('authentication errors preserve their status and error code', async () => {
  const response = await requestThroughErrorHandler(
    new AppError('You are not logged in.', 401, 'NOT_AUTHENTICATED')
  );

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error.code, 'NOT_AUTHENTICATED');
  assert.equal(response.body.error.message, 'You are not logged in.');
});

test('Prisma known errors map to safe API responses', async () => {
  const duplicate = new Prisma.PrismaClientKnownRequestError(
    'raw duplicate database detail',
    { code: 'P2002', clientVersion: '7.8.0', meta: { target: ['email'] } }
  );
  const notFound = new Prisma.PrismaClientKnownRequestError(
    'raw missing-record database detail',
    { code: 'P2025', clientVersion: '7.8.0' }
  );

  const duplicateResponse = await requestThroughErrorHandler(duplicate);
  assert.equal(duplicateResponse.statusCode, 409);
  assert.equal(duplicateResponse.body.error.code, 'DUPLICATE_FIELD');
  assert.equal(duplicateResponse.body.error.message, 'A record with these details already exists.');
  assert.equal(JSON.stringify(duplicateResponse.body).includes('raw duplicate'), false);

  const notFoundResponse = await requestThroughErrorHandler(notFound);
  assert.equal(notFoundResponse.statusCode, 404);
  assert.equal(notFoundResponse.body.error.code, 'NOT_FOUND');
});

test('database connection errors become a safe 503 without raw details', async () => {
  const unavailable = new Prisma.PrismaClientKnownRequestError(
    'raw connection detail',
    { code: 'P1001', clientVersion: '7.8.0' }
  );
  const response = await requestThroughErrorHandler(unavailable, { environment: 'development' });

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'DATABASE_UNAVAILABLE');
  assert.equal(response.body.error.message, 'Database temporarily unavailable. Please try again later.');
  assert.equal(JSON.stringify(response.body).includes('raw connection detail'), false);
});

test('serverless initialization reports database unavailability without connection details', async () => {
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const handler = loadServerlessHandler({
    '../BackEnd/app': () => {},
    '../BackEnd/config/prisma': {
      prisma: {
        $connect: async () => {
          throw new Error('Can\'t reach database server at secret-host.example');
        },
      },
    },
    '../BackEnd/services/gemini.service': { initGemini: () => {} },
  });
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await handler({}, response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Service temporarily unavailable. Please try again later.');
    assert.equal(response.body.error.message, 'Service temporarily unavailable. Please try again later.');
    assert.equal(response.body.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(JSON.stringify(response.body).includes('secret-host'), false);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('unexpected production errors are generic while development keeps diagnostics', async () => {
  const productionResponse = await requestThroughErrorHandler(
    new Error('internal implementation detail'),
    { environment: 'production' }
  );
  assert.equal(productionResponse.statusCode, 500);
  assert.deepEqual(productionResponse.body, {
    success: false,
    error: {
      message: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR',
    },
  });

  const developmentResponse = await requestThroughErrorHandler(
    new Error('development diagnostic'),
    { environment: 'development' }
  );
  assert.equal(developmentResponse.statusCode, 500);
  assert.equal(developmentResponse.body.error.message, 'development diagnostic');
  assert.match(developmentResponse.body.error.stack, /development diagnostic/);
});

test('asyncHandler forwards rejected and synchronous controller failures', async () => {
  const rejectedResponse = await requestThroughErrorHandler(
    new Error('rejected controller failure'),
    { useAsyncHandler: true }
  );
  assert.equal(rejectedResponse.statusCode, 500);
  assert.equal(rejectedResponse.body.error.code, 'INTERNAL_ERROR');

  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = express();
  app.get('/sync-failure', asyncHandler(() => {
    throw new Error('synchronous controller failure');
  }));
  app.use(errorHandler);
  const server = http.createServer(app);
  await listen(server);

  try {
    const response = await request(server, { path: '/sync-failure' });
    assert.equal(response.statusCode, 500);
    assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  } finally {
    await close(server);
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('shutdown is idempotent, closes HTTP before Prisma, and exits once', async () => {
  const events = [];
  const exits = [];
  const server = {
    listening: true,
    close(callback) {
      events.push('server.close');
      setImmediate(() => {
        events.push('server.closed');
        callback();
      });
    },
  };
  const prisma = {
    async $disconnect() {
      events.push('prisma.disconnect');
    },
  };
  const shutdown = createShutdownHandler({
    getServer: () => server,
    prisma,
    logger: { log: () => {}, error: () => {} },
    exit: (code) => exits.push(code),
  });

  const first = shutdown('SIGTERM', 0);
  const second = shutdown('SIGINT', 1);
  await Promise.all([first, second]);

  assert.deepEqual(events, ['server.close', 'server.closed', 'prisma.disconnect']);
  assert.deepEqual(exits, [0]);
});

test('shutdown times out safely and still disconnects Prisma', async () => {
  const events = [];
  const exits = [];
  const server = {
    listening: true,
    close() {
      events.push('server.close');
    },
  };
  const prisma = {
    async $disconnect() {
      events.push('prisma.disconnect');
    },
  };
  const shutdown = createShutdownHandler({
    getServer: () => server,
    prisma,
    timeoutMs: 5,
    logger: { log: () => {}, error: () => {} },
    exit: (code) => exits.push(code),
  });

  await shutdown('SIGTERM', 0);

  assert.deepEqual(events, ['server.close', 'prisma.disconnect']);
  assert.deepEqual(exits, [1]);
});
