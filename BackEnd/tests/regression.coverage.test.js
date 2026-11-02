'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');

const { todayString, subtractDays, toDateString } = require('../utils/dateHelpers');
const { calculateStreakStats } = require('../services/streak.service');
const { generateRecommendation } = require('../services/ai.service');
const {
  cleanupRawText,
  parseAndNormalizePlannerResponse,
} = require('../utils/plannerParser');

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

const invoke = (handler, req = {}) => new Promise((resolve) => {
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
    send(body) {
      finish({ status: this.statusCode, body });
    },
    cookie() {},
    clearCookie() {},
  };
  handler(req, res, (error) => finish({ error }));
});

const userRequest = (body = {}, extra = {}) => ({
  body,
  query: {},
  params: {},
  user: { id: 'user-a', name: 'Fixture Student' },
  ...extra,
});

test('streak calculations respect the 15-minute day threshold and date boundaries', () => {
  const today = todayString();
  const yesterday = toDateString(subtractDays(new Date(), 1));
  const twoDaysAgo = toDateString(subtractDays(new Date(), 2));
  const fourDaysAgo = toDateString(subtractDays(new Date(), 4));

  const stats = calculateStreakStats([
    { date: today, duration: 10 },
    { date: today, duration: 5 },
    { date: yesterday, duration: 15 },
    { date: twoDaysAgo, duration: 30 },
    { date: fourDaysAgo, duration: 120 },
  ]);

  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.longestStreak, 3);
  assert.equal(stats.totalActiveDays, 4);

  const belowThreshold = calculateStreakStats([{ date: today, duration: 14 }]);
  assert.deepEqual(belowThreshold, { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 });
});

test('rule-based recommendations cover onboarding, short sessions, and focused-subject guidance', () => {
  assert.equal(generateRecommendation([], 0).type, 'onboarding');
  assert.equal(generateRecommendation([{ subject: 'Physics', duration: 20 }], 0).type, 'duration');
  assert.equal(generateRecommendation([
    { subject: 'Physics', duration: 45 },
    { subject: 'Physics', duration: 50 },
  ], 2).type, 'diversity');
  assert.equal(generateRecommendation([
    { subject: 'Physics', duration: 45 },
    { subject: 'Chemistry', duration: 50 },
  ], 7).type, 'streak');
});

test('planner parser handles markdown JSON, truncated responses, and fallback extraction', () => {
  const valid = parseAndNormalizePlannerResponse(
    '```json\n{"dailyPlan":[{"subject":"Physics"}],"weeklyPlan":[],"recommendations":["Review"]}\n```',
    'daily'
  );
  assert.equal(valid.validationStatus.isValid, true);
  assert.equal(valid.isFallback, false);
  assert.equal(valid.parsed.plan.length, 1);

  const truncated = cleanupRawText('{"dailyPlan":[{"subject":"Physics","chapter":"Vectors"}');
  assert.doesNotThrow(() => JSON.parse(truncated));

  const fallback = parseAndNormalizePlannerResponse(
    'Result: {"dailyPlan":[{"subject":"Physics","chapter":"Vectors","duration":45,"reason":"Exam"}],"weeklyPlan":[],"recommendations":[invalid}',
    'daily'
  );
  assert.equal(fallback.isFallback, true);
  assert.equal(fallback.parsed.dailyPlan[0].chapter, 'Vectors');
});

test('subject controller covers retrieval, creation, update, and soft deletion', async () => {
  const calls = { create: [], update: [], chapterUpdate: [] };
  const subject = {
    id: 'subject-a', userId: 'user-a', semesterId: 'semester-a', name: 'Physics',
    active: true, isArchived: false, isDeleted: false, order: 0,
    completionThresholdSessions: 3, completionThresholdHours: 5, completionRule: 'first_session',
  };
  const controller = loadWithStubs('../controllers/subject.controller.js', {
    '../config/prisma': {
      prisma: {
        subject: {
          findMany: async () => [subject],
          findUnique: async () => subject,
          create: async ({ data }) => { calls.create.push(data); return { ...subject, ...data }; },
          update: async ({ data }) => { calls.update.push(data); return { ...subject, ...data }; },
        },
        semester: { findFirst: async () => ({ id: 'semester-a' }) },
        chapter: { updateMany: async (args) => { calls.chapterUpdate.push(args); return { count: 2 }; } },
      },
    },
  });

  const listed = await invoke(controller.getSubjects, userRequest({}, { query: { active: true } }));
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.subjects[0].completionThreshold.hours, 5);

  const created = await invoke(controller.createSubject, userRequest({
    name: '  Mathematics  ',
    completionThreshold: { sessions: 4, hours: 6 },
    completionRule: 'custom_threshold',
  }));
  assert.equal(created.status, 201);
  assert.equal(calls.create[0].name, 'Mathematics');
  assert.equal(calls.create[0].completionThresholdSessions, 4);

  const updated = await invoke(controller.updateSubject, userRequest({
    name: '  Advanced Physics ', active: false,
  }, { params: { id: 'subject-a' } }));
  assert.equal(updated.status, 200);
  assert.equal(calls.update[0].name, 'Advanced Physics');
  assert.equal(calls.update[0].active, false);

  const deleted = await invoke(controller.deleteSubject, userRequest({}, { params: { id: 'subject-a' } }));
  assert.equal(deleted.status, 200);
  assert.equal(calls.chapterUpdate[0].where.userId, 'user-a');
  assert.equal(calls.chapterUpdate[0].data.isDeleted, true);
});

test('chapter completion auto-completes at the estimate and reopens when study time drops', async () => {
  const updates = [];
  const achievementCalls = [];
  let chapter = {
    id: 'chapter-a', userId: 'user-a', estimatedTime: 1,
    completed: false, completedMethod: 'none',
  };
  let sessions = [{ userId: 'user-a', chapterId: 'chapter-a', duration: 60 }];
  const service = loadWithStubs('../services/chapterCompletion.service.js', {
    '../config/prisma': {
      prisma: {
        chapter: {
          findFirst: async () => chapter,
          update: async ({ data }) => {
            updates.push(data);
            chapter = { ...chapter, ...data };
            return chapter;
          },
        },
        session: { findMany: async () => sessions },
        subject: { findFirst: async () => null },
      },
    },
    './achievement.service': {
      checkAndUnlockAchievements: async (userId) => achievementCalls.push(userId),
    },
  });

  await service.checkAndUpdateChapterAutoCompletion('user-a', 'subject-a', 'chapter-a');
  assert.equal(updates[0].completed, true);
  assert.equal(updates[0].completedMethod, 'auto');
  assert.equal(updates[0].actualTime, 1);
  assert.equal(achievementCalls.length, 1, 'achievement processing remains non-blocking');

  sessions = [{ userId: 'user-a', chapterId: 'chapter-a', duration: 30 }];
  await service.checkAndUpdateChapterAutoCompletion('user-a', 'subject-a', 'chapter-a');
  assert.equal(updates[1].completed, false);
  assert.equal(updates[1].completedMethod, 'none');
});

test('manual chapter completion is preserved while actual time is refreshed', async () => {
  const updates = [];
  const service = loadWithStubs('../services/chapterCompletion.service.js', {
    '../config/prisma': {
      prisma: {
        chapter: {
          findFirst: async () => ({
            id: 'chapter-a', userId: 'user-a', estimatedTime: 10,
            completed: true, completedMethod: 'manual',
          }),
          update: async ({ data }) => { updates.push(data); return data; },
        },
        session: { findMany: async () => [{ duration: 30 }] },
      },
    },
    '../services/achievement.service': { checkAndUnlockAchievements: async () => {} },
  });

  await service.checkAndUpdateChapterAutoCompletion('user-a', 'subject-a', 'chapter-a');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].actualTime, 0.5);
});

test('semester setup archives prior subjects and creates trimmed linked subjects', async () => {
  const calls = { semesterUpdates: [], subjectUpdates: [], subjects: [] };
  const controller = loadWithStubs('../controllers/semester.controller.js', {
    '../config/prisma': {
      prisma: {
        semester: {
          updateMany: async (args) => calls.semesterUpdates.push(args),
          create: async ({ data }) => ({ id: 'semester-new', ...data }),
        },
        subject: {
          updateMany: async (args) => calls.subjectUpdates.push(args),
          create: async ({ data }) => {
            calls.subjects.push(data);
            return {
              id: `subject-${calls.subjects.length}`,
              completionThresholdSessions: 3,
              completionThresholdHours: 5,
              ...data,
            };
          },
        },
      },
    },
  });

  const result = await invoke(controller.setupNewSemester, userRequest({
    name: '  Spring 2027 ', startDate: '2027-01-01', endDate: '2027-05-31',
    expectedHoursPerWeek: 8, goalGPA: 3.5, archiveActive: true,
    newSubjects: [' Physics ', ' ', 'Mathematics'],
  }));

  assert.equal(result.status, 201);
  assert.equal(calls.semesterUpdates[0].data.active, false);
  assert.equal(calls.subjectUpdates[0].data.isArchived, true);
  assert.deepEqual(calls.subjects.map(({ name, order, semesterId }) => ({ name, order, semesterId })), [
    { name: 'Physics', order: 0, semesterId: 'semester-new' },
    { name: 'Mathematics', order: 2, semesterId: 'semester-new' },
  ]);
});

test('semester progress computes completion, hours, and chapter performance statuses', async () => {
  const controller = loadWithStubs('../controllers/semester.controller.js', {
    '../config/prisma': {
      prisma: {
        semester: { findFirst: async () => ({ id: 'semester-a', expectedHoursPerWeek: 5, endDate: '2027-05-31' }) },
        subject: { findMany: async () => [{
          id: 'subject-a', name: 'Physics', semesterId: 'semester-a', active: true,
          isArchived: false, isDeleted: false, order: 0,
          completionThresholdSessions: 3, completionThresholdHours: 5,
        }] },
        chapter: { findMany: async () => [
          { id: 'chapter-a', subjectId: 'subject-a', estimatedTime: 2, actualTime: 1, completed: true, order: 0 },
          { id: 'chapter-b', subjectId: 'subject-a', estimatedTime: 1, actualTime: 1, completed: false, order: 1 },
        ] },
      },
    },
  });

  const result = await invoke(controller.getSemesterProgress, userRequest());
  assert.equal(result.status, 200);
  assert.equal(result.body.data.semesterProgress, 50);
  assert.equal(result.body.data.hoursSaved, 1);
  assert.equal(result.body.data.subjectBreakdown[0].chapters[0].status, 'Completed Early');
  assert.equal(result.body.data.subjectBreakdown[0].chapters[1].status, 'In Progress');
});

test('exam controller supports ownership-checked upsert, update, and delete', async () => {
  const calls = { upsert: [], update: [], delete: [] };
  const exam = { id: 'exam-a', userId: 'user-a', subjectId: 'subject-a', date: new Date('2027-06-01T00:00:00Z') };
  const controller = loadWithStubs('../controllers/exam.controller.js', {
    '../config/prisma': {
      prisma: {
        subject: { findFirst: async () => ({ id: 'subject-a', userId: 'user-a' }) },
        exam: {
          upsert: async ({ where, update, create }) => { calls.upsert.push({ where, update, create }); return exam; },
          findFirst: async () => exam,
          update: async ({ data }) => { calls.update.push(data); return { ...exam, ...data }; },
          delete: async ({ where }) => { calls.delete.push(where); return exam; },
        },
      },
    },
    '../services/gemini.service': { generateExamInsightsWithGemini: async () => [] },
  });

  const created = await invoke(controller.createExam, userRequest({ subjectId: 'subject-a', date: '2027-06-01' }));
  assert.equal(created.status, 201);
  assert.equal(calls.upsert[0].where.userId_subjectId.userId, 'user-a');
  assert.equal(calls.upsert[0].where.userId_subjectId.subjectId, 'subject-a');

  const updated = await invoke(controller.updateExam, userRequest({ date: '2027-06-02' }, { params: { id: 'exam-a' } }));
  assert.equal(updated.status, 200);
  assert.equal(calls.update.length, 1);

  const deleted = await invoke(controller.deleteExam, userRequest({}, { params: { id: 'exam-a' } }));
  assert.equal(deleted.status, 200);
  assert.equal(calls.delete[0].id, 'exam-a');
});

test('weekly statistics aggregate only the requested Monday-Sunday range', async () => {
  const calls = [];
  const controller = loadWithStubs('../controllers/stats.controller.js', {
    '../config/prisma': {
      prisma: {
        session: {
          findMany: async ({ where }) => {
            calls.push(where);
            return [
              { date: '2026-02-23', duration: 30 },
              { date: '2026-02-25', duration: 90 },
            ];
          },
        },
      },
    },
    '../services/streak.service': { calculateConsistencyScore: () => 0, calculateStreakStats: () => ({ currentStreak: 0, longestStreak: 0, totalActiveDays: 0 }) },
  });

  const result = await invoke(controller.getWeekly, userRequest({}, { query: { week: '2026-02-25' } }));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data.weeklyData.map((day) => day.hours), [0.5, 0, 1.5, 0, 0, 0, 0]);
  assert.equal(calls[0].date.gte, '2026-02-23');
  assert.equal(calls[0].date.lte, '2026-03-01');
});

test('achievement retrieval marks new awards notified and returns definitions', async () => {
  const updates = [];
  const controller = loadWithStubs('../controllers/achievement.controller.js', {
    '../config/prisma': {
      prisma: {
        achievement: {
          findMany: async () => [{ id: 'achievement-a', slug: 'first-session', notified: false, createdAt: '2027-01-01' }],
          updateMany: async (args) => updates.push(args),
        },
      },
    },
  });

  const result = await invoke(controller.getAchievements, userRequest());
  assert.equal(result.status, 200);
  assert.equal(result.body.data.achievements.find((item) => item.slug === 'first-session').earned, true);
  assert.equal(result.body.data.newlyUnlocked[0].name, 'First Step');
  assert.equal(updates[0].data.notified, true);
});

test('planner returns empty state without Gemini and maps Gemini failures to a safe error', async () => {
  const makeController = (subjects, generate) => loadWithStubs('../controllers/planner.controller.js', {
    '../config/prisma': {
      prisma: {
        session: { findMany: async () => [] },
        subject: { findMany: async () => subjects },
        chapter: { findMany: async () => [] },
        exam: { findMany: async () => [] },
        user: { update: async () => ({}) },
      },
    },
    '../services/gemini.service': {
      generateDailyPlanWithGemini: generate,
      generateWeeklyPlanWithGemini: generate,
    },
  });

  const emptyController = makeController([], async () => { throw new Error('must not call AI'); });
  const empty = await invoke(emptyController.getDailyPlan, userRequest({}, { query: { initial: true } }));
  assert.equal(empty.status, 200);
  assert.equal(empty.body.data.isEmpty, true);

  const failingController = makeController([{ id: 'subject-a' }], async () => {
    throw new Error('simulated Gemini failure');
  });
  const failed = await invoke(failingController.getDailyPlan, userRequest({}, { query: { initial: true } }));
  assert.equal(failed.error?.statusCode, 503);
  assert.equal(failed.error?.code, 'AI_ERROR');
  assert.equal(failed.error?.message, 'AI Planner is temporarily unavailable. Please try again.');
});

test('Gemini service fails safely when the API key is absent', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const { generateGeminiText } = require('../services/gemini.service');
    await assert.rejects(
      generateGeminiText({ contents: 'fixture' }),
      /Gemini AI is not configured/
    );
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
