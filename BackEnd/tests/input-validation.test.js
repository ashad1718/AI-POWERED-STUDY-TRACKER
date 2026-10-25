'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const errorHandler = require('../middleware/error.middleware');

const VALID_USER_ID = '11111111-1111-4111-8111-111111111111';
const VALID_SUBJECT_ID = '22222222-2222-4222-8222-222222222222';
const VALID_CHAPTER_ID = '33333333-3333-4333-8333-333333333333';
const VALID_EXAM_ID = '44444444-4444-4444-8444-444444444444';

const originalNodeEnv = process.env.NODE_ENV;

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

const protect = (req, res, next) => {
  req.user = { id: VALID_USER_ID, name: 'Fixture Student' };
  next();
};

const controllerSet = (names, calls) => Object.fromEntries(names.map((name) => [name, (req, res) => {
  calls.push({ name, body: req.body, query: req.query, params: req.params });
  res.status(200).json({ success: true, data: { route: name } });
}]));

const loadRouteApp = (routePath, controllerPath, controllerNames) => {
  const calls = [];
  const router = loadWithStubs(routePath, {
    [controllerPath]: controllerSet(controllerNames, calls),
    '../middleware/auth.middleware': { protect },
  });
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use(errorHandler);
  return { app, calls };
};

const request = async (app, url, { method = 'GET', body } = {}) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
    };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

const assertRejected = (result, calls, message = '') => {
  assert.equal(result.status, 400, message);
  assert.equal(result.body.success, false, message);
  assert.equal(result.body.error.code, 'VALIDATION_ERROR', message);
  assert.equal(calls.length, 0, `Invalid input reached a controller: ${message}`);
};

test('subject routes validate UUIDs, filters, numeric thresholds, and protected fields', async () => {
  const { app, calls } = loadRouteApp('../routes/subject.routes.js', '../controllers/subject.controller', [
    'getSubjects', 'createSubject', 'updateSubject', 'deleteSubject',
  ]);

  let result = await request(app, '/', {
    method: 'POST',
    body: {
      name: 'Physics',
      completionThreshold: { sessions: 1, hours: 0.1 },
      completionRule: 'custom_threshold',
      active: true,
      order: 0,
    },
  });
  assert.equal(result.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.completionThreshold.sessions, 1);

  calls.length = 0;
  result = await request(app, '/', { method: 'POST', body: {
    name: 'Physics', completionThreshold: { sessions: 'NaN', hours: 1 },
  } });
  assertRejected(result, calls, 'non-finite completion threshold');

  result = await request(app, '/', { method: 'POST', body: {
    name: 'Physics', userId: VALID_USER_ID,
  } });
  assertRejected(result, calls, 'protected subject field');

  result = await request(app, '/', { method: 'POST', body: {
    name: 'Physics', completionThreshold: { sessions: 1, userId: VALID_USER_ID },
  } });
  assertRejected(result, calls, 'protected nested subject field');

  result = await request(app, `/${VALID_SUBJECT_ID}`, { method: 'PUT', body: { name: 'Updated' } });
  assert.equal(result.status, 200);

  calls.length = 0;
  result = await request(app, '/not-a-uuid', { method: 'DELETE' });
  assertRejected(result, calls, 'malformed subject ID');

  result = await request(app, '/?active=maybe');
  assertRejected(result, calls, 'invalid subject filter');

  calls.length = 0;
  result = await request(app, '/?active=true');
  assert.equal(result.status, 200);
  assert.equal(calls[0].query.active, true);
});

test('chapter routes validate relationship IDs, durations, completion state, and fields', async () => {
  const { app, calls } = loadRouteApp('../routes/chapter.routes.js', '../controllers/chapter.controller', [
    'getChapters', 'createChapter', 'updateChapter', 'deleteChapter',
  ]);

  let result = await request(app, '/', {
    method: 'POST',
    body: { subjectId: VALID_SUBJECT_ID, name: 'Vectors', estimatedTime: 0.1, order: 0 },
  });
  assert.equal(result.status, 200);

  calls.length = 0;
  result = await request(app, '/', { method: 'POST', body: {
    subjectId: 'subject-1', name: 'Vectors', estimatedTime: 1,
  } });
  assertRejected(result, calls, 'malformed subject relationship ID');

  result = await request(app, '/', { method: 'POST', body: {
    subjectId: VALID_SUBJECT_ID, name: 'Vectors', estimatedTime: 'Infinity',
  } });
  assertRejected(result, calls, 'non-finite estimated time');

  result = await request(app, `/${VALID_CHAPTER_ID}`, { method: 'PUT', body: {
    completed: true, completedMethod: 'auto',
  } });
  assertRejected(result, calls, 'client-controlled automatic completion method');

  result = await request(app, `/${VALID_CHAPTER_ID}`, { method: 'PUT', body: {
    completed: true, completedMethod: 'manual',
  } });
  assert.equal(result.status, 200);

  result = await request(app, '/', { body: undefined });
  assert.equal(result.status, 200);
  calls.length = 0;
  result = await request(app, '/?subjectId=bad-id');
  assertRejected(result, calls, 'malformed chapter filter ID');
});

test('session routes validate UUIDs, date-only values, duration bounds, and pagination', async () => {
  const { app, calls } = loadRouteApp('../routes/session.routes.js', '../controllers/session.controller', [
    'createSession', 'getSessions', 'getSession', 'deleteSession',
  ]);

  let result = await request(app, '/', {
    method: 'POST',
    body: {
      subjectId: VALID_SUBJECT_ID,
      chapterId: VALID_CHAPTER_ID,
      duration: 1,
      date: '2026-02-28',
    },
  });
  assert.equal(result.status, 200);
  assert.equal(calls[0].body.duration, 1);

  calls.length = 0;
  result = await request(app, '/', { method: 'POST', body: {
    subjectId: VALID_SUBJECT_ID, duration: 0, date: '2026-02-28',
  } });
  assertRejected(result, calls, 'zero session duration');

  result = await request(app, '/', { method: 'POST', body: {
    subjectId: VALID_SUBJECT_ID, duration: 30, date: '2026-02-30',
  } });
  assertRejected(result, calls, 'impossible session date');

  result = await request(app, '/?limit=101');
  assertRejected(result, calls, 'unreasonable page size');

  result = await request(app, '/?from=2026-03-01&to=2026-02-01');
  assertRejected(result, calls, 'reversed session date range');

  result = await request(app, '/not-a-uuid');
  assertRejected(result, calls, 'malformed session ID');
});

test('semester setup validates dates, finite numeric ranges, subjects, and protected fields', async () => {
  const { app, calls } = loadRouteApp('../routes/semester.routes.js', '../controllers/semester.controller', [
    'getSemesterProgress', 'setupNewSemester',
  ]);

  let result = await request(app, '/setup', {
    method: 'POST',
    body: {
      name: 'Spring 2026',
      startDate: '2026-01-01',
      endDate: '2026-05-31',
      expectedHoursPerWeek: 0.5,
      goalGPA: 0,
      archiveActive: false,
      newSubjects: ['Physics'],
    },
  });
  assert.equal(result.status, 200);
  assert.equal(calls[0].body.expectedHoursPerWeek, 0.5);
  assert.equal(calls[0].body.goalGPA, 0);

  calls.length = 0;
  result = await request(app, '/setup', { method: 'POST', body: {
    name: 'Spring 2026', startDate: '2026-05-31', endDate: '2026-05-31',
    expectedHoursPerWeek: 10, newSubjects: ['Physics'],
  } });
  assertRejected(result, calls, 'same semester start and end date');

  result = await request(app, '/setup', { method: 'POST', body: {
    name: 'Spring 2026', startDate: '2026-01-01', endDate: '2026-05-31',
    expectedHoursPerWeek: 'Infinity', newSubjects: ['Physics'],
  } });
  assertRejected(result, calls, 'non-finite weekly hours');

  result = await request(app, '/setup', { method: 'POST', body: {
    name: 'Spring 2026', startDate: '2026-01-01', endDate: '2026-05-31',
    expectedHoursPerWeek: 10, newSubjects: [],
  } });
  assertRejected(result, calls, 'empty subject list');

  result = await request(app, '/setup', { method: 'POST', body: {
    name: 'Spring 2026', startDate: '2026-01-01', endDate: '2026-05-31',
    expectedHoursPerWeek: 10, newSubjects: ['Physics'], userId: VALID_USER_ID,
  } });
  assertRejected(result, calls, 'protected semester field');
});

test('exam routes validate UUIDs and date values before controller access', async () => {
  const { app, calls } = loadRouteApp('../routes/exam.routes.js', '../controllers/exam.controller', [
    'getPredictions', 'createExam', 'updateExam', 'deleteExam',
  ]);

  let result = await request(app, '/', {
    method: 'POST',
    body: { subjectId: VALID_SUBJECT_ID, date: '2026-12-31' },
  });
  assert.equal(result.status, 200);

  calls.length = 0;
  result = await request(app, '/', { method: 'POST', body: {
    subjectId: 'subject-1', date: '2026-12-31',
  } });
  assertRejected(result, calls, 'malformed exam subject ID');

  result = await request(app, '/', { method: 'POST', body: {
    subjectId: VALID_SUBJECT_ID, date: '2026-02-30',
  } });
  assertRejected(result, calls, 'impossible exam date');

  result = await request(app, `/${VALID_EXAM_ID}`, { method: 'PUT', body: { date: '2026-12-31' } });
  assert.equal(result.status, 200);
  calls.length = 0;
  result = await request(app, '/not-a-uuid', { method: 'DELETE' });
  assertRejected(result, calls, 'malformed exam ID');
});

test('profile and password updates reject unexpected protected fields', async () => {
  const { app, calls } = loadRouteApp('../routes/user.routes.js', '../controllers/user.controller', [
    'getMe', 'updateMe', 'updatePassword',
  ]);

  let result = await request(app, '/me', {
    method: 'PATCH',
    body: { name: 'Updated Student', location: '', avatarUrl: '' },
  });
  assert.equal(result.status, 200);

  calls.length = 0;
  result = await request(app, '/me', { method: 'PATCH', body: {
    name: 'Updated Student', role: 'admin',
  } });
  assertRejected(result, calls, 'protected profile field');

  result = await request(app, '/me/password', { method: 'PATCH', body: {
    currentPassword: 'OldPass1!', newPassword: 'NewPass1!', role: 'admin',
  } });
  assertRejected(result, calls, 'protected password field');
});

test('AI chat, planner, and weekly stats validate user-controlled payloads', async () => {
  const gemini = loadRouteApp('../routes/gemini.routes.js', '../controllers/gemini.controller', [
    'analyzeStudy', 'chatStudy',
  ]);
  const planner = loadRouteApp('../routes/planner.routes.js', '../controllers/planner.controller', [
    'getDailyPlan', 'getWeeklyPlan',
  ]);
  const stats = loadRouteApp('../routes/stats.routes.js', '../controllers/stats.controller', [
    'getOverview', 'getWeekly', 'getSubjects', 'getHeatmap',
  ]);

  let result = await request(gemini.app, '/chat', { method: 'POST', body: { message: 'Help me study.' } });
  assert.equal(result.status, 200);

  result = await request(gemini.app, '/analyze', { method: 'POST' });
  assert.equal(result.status, 200);

  gemini.calls.length = 0;
  result = await request(gemini.app, '/chat', { method: 'POST', body: { message: 123 } });
  assertRejected(result, gemini.calls, 'non-string AI chat message');

  result = await request(gemini.app, '/chat', { method: 'POST', body: { message: 'x'.repeat(4001) } });
  assertRejected(result, gemini.calls, 'oversized AI chat message');

  result = await request(gemini.app, '/chat', { method: 'POST', body: { message: 'Hello', systemPrompt: 'unsafe' } });
  assertRejected(result, gemini.calls, 'unexpected AI chat field');

  result = await request(planner.app, '/daily?initial=maybe');
  assertRejected(result, planner.calls, 'invalid planner initial flag');

  result = await request(planner.app, '/daily?initial=true');
  assert.equal(result.status, 200);
  assert.equal(planner.calls[0].query.initial, true);

  result = await request(stats.app, '/weekly?week=2026-02-30');
  assertRejected(result, stats.calls, 'impossible weekly stats date');

  result = await request(stats.app, '/weekly?week=2026-02-28');
  assert.equal(result.status, 200);
});

test.after(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});
