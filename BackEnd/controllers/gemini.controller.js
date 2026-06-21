'use strict';

const Session                    = require('../models/Session');
const Subject                    = require('../models/Subject');
const Chapter                    = require('../models/Chapter');
const Achievement                = require('../models/Achievement');
const asyncHandler               = require('../utils/asyncHandler');
const AppError                   = require('../utils/AppError');
const { analyseWithGemini, chatWithGemini } = require('../services/gemini.service');
const { calculateStreakStats } = require('../services/streak.service');

// ── Rate limiting store (in-memory, per user) ─────────────────────────────────
const lastRequestTime = new Map();
const RATE_LIMIT_MS   = 60 * 1000; // 60 seconds

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze
// Protected — requires valid JWT.
// ─────────────────────────────────────────────────────────────────────────────
exports.analyzeStudy = asyncHandler(async (req, res) => {
  const userId   = req.user.id;
  const userName = req.user.name;

  // ── Per-user rate limit ───────────────────────────────────────────────────
  const lastTime = lastRequestTime.get(userId);
  if (lastTime && Date.now() - lastTime < RATE_LIMIT_MS) {
    const waitSecs = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastTime)) / 1000);
    throw new AppError(
      `Please wait ${waitSecs} seconds before requesting another analysis.`,
      429,
      'RATE_LIMITED'
    );
  }
  lastRequestTime.set(userId, Date.now());

  // ── Fetch user sessions, subjects, and chapters ───────────────────────────
  const sessions = await Session.find({ userId })
    .sort({ date: -1 })
    .lean();

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

  // ── Run Gemini analysis ───────────────────────────────────────────────────
  let result;
  try {
    const streakStats = calculateStreakStats(sessions);
    const achievements = await Achievement.find({ userId }).lean();
    result = await analyseWithGemini(sessions, userName, activeSubjects, chapters, streakStats, achievements);
  } catch (err) {
    if (err.message.includes('not configured')) {
      throw new AppError(err.message, 503, 'AI_NOT_CONFIGURED');
    }
    if (err.message.includes('busy') || err.message.includes('quota') || err.message.includes('temporarily busy')) {
      throw new AppError('AI Coach is temporarily busy. Please try again in a moment.', 503, 'AI_BUSY');
    }
    if (err.message.includes('Invalid Gemini')) {
      throw new AppError(err.message, 503, 'AI_INVALID_KEY');
    }
    throw new AppError('AI Coach is temporarily busy. Please try again in a moment.', 503, 'AI_BUSY');
  }

  // ── Empty state response ──────────────────────────────────────────────────
  if (result.isEmpty) {
    return res.status(200).json({
      success: true,
      data: {
        isEmpty:  true,
        message:  'Start logging study sessions to receive AI-powered recommendations.',
        stats:    null,
        insights: null,
      },
    });
  }

  // ── Success response ──────────────────────────────────────────────────────
  res.status(200).json({
    success: true,
    data: {
      isEmpty:    false,
      stats:      result.stats,
      insights:   result.insights,
      analysedAt: new Date().toISOString(),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat
// Protected — requires valid JWT.
// ─────────────────────────────────────────────────────────────────────────────
exports.chatStudy = asyncHandler(async (req, res) => {
  const userId   = req.user.id;
  const userName = req.user.name;
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new AppError('Message is required.', 400);
  }

  // ── Fetch user sessions, subjects, and chapters ───────────────────────────
  const sessions = await Session.find({ userId })
    .sort({ date: -1 })
    .lean();

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

  // ── Run Gemini chat ───────────────────────────────────────────────────────
  let result;
  try {
    const streakStats = calculateStreakStats(sessions);
    const achievements = await Achievement.find({ userId }).lean();
    result = await chatWithGemini(sessions, userName, message.trim(), activeSubjects, chapters, streakStats, achievements);
  } catch (err) {
    if (err.message.includes('not configured')) {
      throw new AppError(err.message, 503, 'AI_NOT_CONFIGURED');
    }
    if (err.message.includes('busy') || err.message.includes('quota') || err.message.includes('temporarily busy')) {
      throw new AppError('AI Coach is temporarily busy. Please try again in a moment.', 503, 'AI_BUSY');
    }
    if (err.message.includes('Invalid Gemini')) {
      throw new AppError(err.message, 503, 'AI_INVALID_KEY');
    }
    throw new AppError('AI Coach is temporarily busy. Please try again in a moment.', 503, 'AI_BUSY');
  }

  // ── Success response ──────────────────────────────────────────────────────
  res.status(200).json({
    success: true,
    data: result,
  });
});
