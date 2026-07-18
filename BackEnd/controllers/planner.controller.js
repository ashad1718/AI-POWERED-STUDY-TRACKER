'use strict';

const { prisma } = require('../config/prisma');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { generateDailyPlanWithGemini, generateWeeklyPlanWithGemini } = require('../services/gemini.service');

// Rate limiting map (in-memory, per user) to prevent spamming Gemini
const lastPlannerRequestTime = new Map();
const RATE_LIMIT_MS = 15 * 1000; // 15 seconds rate limit for planner

const checkRateLimit = (userId) => {
  const lastTime = lastPlannerRequestTime.get(userId);
  if (lastTime && Date.now() - lastTime < RATE_LIMIT_MS) {
    const waitSecs = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastTime)) / 1000);
    throw new AppError(
      `Please wait ${waitSecs} seconds before updating your study plan.`,
      429,
      'RATE_LIMITED'
    );
  }
  lastPlannerRequestTime.set(userId, Date.now());
};

// ─── GET /api/planner/daily ───────────────────────────────────────────────────
exports.getDailyPlan = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userName = req.user.name;

  // Optional query to bypass/ignore rate limit on initial load (not on force re-generation)
  const isInitialLoad = req.query.initial === 'true';
  if (!isInitialLoad) {
    checkRateLimit(userId);
  }

  // Fetch all user sessions, active subjects, chapters, and exams
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  const activeSubjects = await prisma.subject.findMany({
    where: {
      userId,
      active: true,
      isArchived: false,
      isDeleted: false,
    },
    orderBy: { order: 'asc' },
  });

  const activeSubjectIds = activeSubjects.map(s => s.id);
  const chapters = await prisma.chapter.findMany({
    where: {
      userId,
      subjectId: { in: activeSubjectIds },
      isDeleted: false,
    },
    orderBy: { order: 'asc' },
  });

  const exams = await prisma.exam.findMany({
    where: { userId },
  });

  // If no subjects, return empty plan structure
  if (activeSubjects.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        plan: [],
        prioritySubjects: [],
        priorityChapters: [],
        dailyFocusTip: "Please configure subjects and chapters to receive daily plans.",
        isEmpty: true,
      },
    });
  }

  let plan;
  try {
    // Map objects for gemini service compatibility
    const compatibleSubjects = activeSubjects.map(s => ({ ...s, _id: s.id }));
    const compatibleChapters = chapters.map(c => ({ ...c, _id: c.id }));
    const compatibleExams = exams.map(e => ({ ...e, _id: e.id }));

    plan = await generateDailyPlanWithGemini(sessions, userName, compatibleSubjects, compatibleChapters, compatibleExams);
    await prisma.user.update({
      where: { id: userId },
      data: { hasUsedPlanner: true },
    });
  } catch (err) {
    throw new AppError(err.message || 'AI Planner could not generate a valid study plan. Retrying...', 503, 'AI_ERROR');
  }

  res.status(200).json({
    success: true,
    data: plan,
  });
});

// ─── GET /api/planner/weekly ──────────────────────────────────────────────────
exports.getWeeklyPlan = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userName = req.user.name;

  const isInitialLoad = req.query.initial === 'true';
  if (!isInitialLoad) {
    checkRateLimit(userId);
  }

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  const activeSubjects = await prisma.subject.findMany({
    where: {
      userId,
      active: true,
      isArchived: false,
      isDeleted: false,
    },
    orderBy: { order: 'asc' },
  });

  const activeSubjectIds = activeSubjects.map(s => s.id);
  const chapters = await prisma.chapter.findMany({
    where: {
      userId,
      subjectId: { in: activeSubjectIds },
      isDeleted: false,
    },
    orderBy: { order: 'asc' },
  });

  const exams = await prisma.exam.findMany({
    where: { userId },
  });

  if (activeSubjects.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        plan: [],
        weeklyMilestones: [],
        weeklyStrategy: "Configure subjects and chapters to receive weekly plans.",
        isEmpty: true,
      },
    });
  }

  let plan;
  try {
    // Map objects for gemini service compatibility
    const compatibleSubjects = activeSubjects.map(s => ({ ...s, _id: s.id }));
    const compatibleChapters = chapters.map(c => ({ ...c, _id: c.id }));
    const compatibleExams = exams.map(e => ({ ...e, _id: e.id }));

    plan = await generateWeeklyPlanWithGemini(sessions, userName, compatibleSubjects, compatibleChapters, compatibleExams);
    await prisma.user.update({
      where: { id: userId },
      data: { hasUsedPlanner: true },
    });
  } catch (err) {
    throw new AppError(err.message || 'AI Planner could not generate a valid study plan. Retrying...', 503, 'AI_ERROR');
  }

  res.status(200).json({
    success: true,
    data: plan,
  });
});
