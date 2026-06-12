'use strict';

const Session                    = require('../models/Session');
const asyncHandler               = require('../utils/asyncHandler');
const AppError                   = require('../utils/AppError');
const { analyseWithGemini }      = require('../services/gemini.service');

// ── Rate limiting store (in-memory, per user) ─────────────────────────────────
// Prevents users from hammering the Gemini API.
// Simple approach: 1 request per 60 seconds per user.
const lastRequestTime = new Map();
const RATE_LIMIT_MS   = 60 * 1000; // 60 seconds

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze
// Protected — requires valid JWT (protect middleware applied in route).
// Fetches user sessions, runs Gemini analysis, returns structured insights.
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

  // ── Fetch all user sessions from MongoDB ──────────────────────────────────
  const sessions = await Session.find({ userId })
    .select('subject duration date')
    .sort({ date: -1 })
    .lean();  // lean() returns plain JS objects — faster for read-only analysis

  // ── Run Gemini analysis ───────────────────────────────────────────────────
  let result;
  try {
    result = await analyseWithGemini(sessions, userName);
  } catch (err) {
    // Map known Gemini errors to appropriate HTTP codes
    if (err.message.includes('not configured')) {
      throw new AppError(err.message, 503, 'AI_NOT_CONFIGURED');
    }
    if (err.message.includes('quota')) {
      throw new AppError(err.message, 503, 'AI_QUOTA_EXCEEDED');
    }
    if (err.message.includes('Invalid Gemini')) {
      throw new AppError(err.message, 503, 'AI_INVALID_KEY');
    }
    // Generic AI error
    throw new AppError(`AI analysis failed: ${err.message}`, 500, 'AI_ERROR');
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
