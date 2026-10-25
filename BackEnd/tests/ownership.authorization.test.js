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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      finish({ status: this.statusCode, body });
    },
  };

  handler(req, res, (error) => finish({ error }));
});

const userId = 'user-a';
const subjectId = 'subject-a';
const otherSubjectId = 'subject-b';
const chapterId = 'chapter-a';
const otherChapterId = 'chapter-b';
const activeSemester = { id: 'semester-a' };
const ownSubject = { id: subjectId, userId, name: 'Operating Systems' };
const ownChapter = { id: chapterId, userId, subjectId, name: 'Scheduling' };

const makeSessionController = ({ subject = ownSubject, chapter = ownChapter } = {}) => {
  const calls = { create: [], subjects: [], chapters: [] };
  const controller = loadWithStubs('../controllers/session.controller.js', {
    '../config/prisma': {
      prisma: {
        semester: {
          findFirst: async () => activeSemester,
        },
        subject: {
          findFirst: async (args) => {
            calls.subjects.push(args);
            return subject;
          },
        },
        chapter: {
          findFirst: async (args) => {
            calls.chapters.push(args);
            return chapter;
          },
        },
        session: {
          create: async ({ data }) => {
            calls.create.push(data);
            return { id: 'session-a', ...data };
          },
        },
      },
    },
    '../services/achievement.service': {
      checkAndUnlockAchievements: () => undefined,
    },
    '../services/chapterCompletion.service': {
      checkAndUpdateChapterAutoCompletion: async () => undefined,
    },
  });
  return { handler: controller.createSession, calls };
};

const sessionRequest = (body) => ({ body, user: { id: userId } });

test('session creation accepts owned subject and chapter references', async () => {
  const { handler, calls } = makeSessionController();
  const result = await invoke(handler, sessionRequest({
    subjectId,
    chapterId,
    duration: 45,
    date: '2026-10-25',
  }));

  assert.equal(result.status, 201);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.session.subjectId, subjectId);
  assert.equal(result.body.data.session.chapterId, chapterId);
  assert.equal(calls.create.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.create[0])), {
    userId,
    subject: ownSubject.name,
    subjectId,
    chapterId,
    chapter: ownChapter.name,
    duration: 45,
    date: '2026-10-25',
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.subjects[0].where)), { id: subjectId, userId, isDeleted: false });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.chapters[0].where)), { id: chapterId, userId, isDeleted: false });
});

test('session creation preserves the existing subject-only workflow', async () => {
  const { handler, calls } = makeSessionController({ chapter: null });
  const result = await invoke(handler, sessionRequest({
    subjectId,
    duration: 30,
    date: '2026-10-25',
  }));

  assert.equal(result.status, 201);
  assert.equal(result.body.success, true);
  assert.equal(calls.create.length, 1);
  assert.equal(calls.create[0].subjectId, subjectId);
  assert.equal(calls.create[0].chapterId, null);
  assert.equal(calls.create[0].chapter, '');
});

test('session creation rejects another user\'s subject before creating a session', async () => {
  const { handler, calls } = makeSessionController({ subject: null });
  const result = await invoke(handler, sessionRequest({
    subjectId: otherSubjectId,
    duration: 30,
    date: '2026-10-25',
  }));

  assert.equal(result.error?.statusCode, 404);
  assert.equal(result.error?.code, 'NOT_FOUND');
  assert.equal(calls.create.length, 0);
  assert.equal(calls.chapters.length, 0);
});

test('session creation rejects another user\'s chapter before creating a session', async () => {
  const { handler, calls } = makeSessionController({ chapter: null });
  const result = await invoke(handler, sessionRequest({
    subjectId,
    chapterId: otherChapterId,
    duration: 30,
    date: '2026-10-25',
  }));

  assert.equal(result.error?.statusCode, 404);
  assert.equal(result.error?.code, 'NOT_FOUND');
  assert.equal(calls.create.length, 0);
});

test('session creation rejects a chapter combined with an unrelated subject', async () => {
  const { handler, calls } = makeSessionController({
    subject: { id: otherSubjectId, userId, name: 'Database Systems' },
  });
  const result = await invoke(handler, sessionRequest({
    subjectId: otherSubjectId,
    chapterId,
    duration: 30,
    date: '2026-10-25',
  }));

  assert.equal(result.error?.statusCode, 400);
  assert.equal(result.error?.code, 'INVALID_RELATIONSHIP');
  assert.equal(calls.create.length, 0);
});

test('chapter statistics scope session aggregation to the authenticated user', async () => {
  const calls = [];
  const controller = loadWithStubs('../controllers/chapter.controller.js', {
    '../config/prisma': {
      prisma: {
        chapter: {
          findMany: async () => [
            {
              id: chapterId,
              userId,
              subjectId,
              name: ownChapter.name,
              estimatedTime: 2,
              actualTime: 0,
              completed: false,
              isDeleted: false,
            },
          ],
        },
        session: {
          groupBy: async ({ where }) => {
            calls.push(where);
            // A missing userId would incorrectly include another user's session.
            return where.userId === userId
              ? [{ chapterId, _count: { _all: 1 }, _sum: { duration: 30 } }]
              : [{ chapterId, _count: { _all: 2 }, _sum: { duration: 90 } }];
          },
        },
      },
    },
    '../services/chapterCompletion.service': {
      checkAndUpdateChapterAutoCompletion: async () => undefined,
    },
  });

  const result = await invoke(controller.getChapters, {
    user: { id: userId },
    query: {},
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userId, userId);
  assert.deepEqual(result.body.data.chapters[0].sessionCount, 1);
  assert.deepEqual(result.body.data.chapters[0].totalDuration, 30);
  assert.deepEqual(result.body.data.chapters[0].actualTime, 0.5);
});
