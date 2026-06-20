'use strict';

const Session      = require('../models/Session');
const Subject      = require('../models/Subject');
const Chapter      = require('../models/Chapter');
const Exam         = require('../models/Exam');
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
  const sessions = await Session.find({ userId }).sort({ date: -1 }).lean();

  const activeSubjects = await Subject.find({
    userId,
    active: true,
    isArchived: false,
    isDeleted: false,
  }).sort({ order: 1 }).lean();

  const activeSubjectIds = activeSubjects.map(s => s._id);
  const chapters = await Chapter.find({
    userId,
    subjectId: { $in: activeSubjectIds },
    isDeleted: false,
  }).sort({ order: 1 }).lean();

  const exams = await Exam.find({ userId }).lean();

  // If no subjects, return empty plan structure
  if (activeSubjects.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        plan: [],
        prioritySubjects: [],
        priorityChapters: [],
        dailyFocusTip: "Please configure subjects and chapters to receive daily plans.",
        isEmpty: true
      }
    });
  }

  let plan;
  try {
    plan = await generateDailyPlanWithGemini(sessions, userName, activeSubjects, chapters, exams);
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

  const sessions = await Session.find({ userId }).sort({ date: -1 }).lean();

  const activeSubjects = await Subject.find({
    userId,
    active: true,
    isArchived: false,
    isDeleted: false,
  }).sort({ order: 1 }).lean();

  const activeSubjectIds = activeSubjects.map(s => s._id);
  const chapters = await Chapter.find({
    userId,
    subjectId: { $in: activeSubjectIds },
    isDeleted: false,
  }).sort({ order: 1 }).lean();

  const exams = await Exam.find({ userId }).lean();

  if (activeSubjects.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        plan: [],
        weeklyMilestones: [],
        weeklyStrategy: "Configure subjects and chapters to receive weekly plans.",
        isEmpty: true
      }
    });
  }

  let plan;
  try {
    plan = await generateWeeklyPlanWithGemini(sessions, userName, activeSubjects, chapters, exams);
  } catch (err) {
    throw new AppError(err.message || 'AI Planner could not generate a valid study plan. Retrying...', 503, 'AI_ERROR');
  }

  res.status(200).json({
    success: true,
    data: plan,
  });
});
