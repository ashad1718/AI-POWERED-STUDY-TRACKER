'use strict';

const Session       = require('../models/Session');
const AppError      = require('../utils/AppError');
const asyncHandler  = require('../utils/asyncHandler');
const { checkAndUnlockAchievements } = require('../services/achievement.service');

// ─── POST /api/v1/sessions ────────────────────────────────────────────────────
exports.createSession = asyncHandler(async (req, res) => {
  const { subject, duration, date } = req.body;

  const session = await Session.create({
    userId:   req.user.id,
    subject,
    duration: Number(duration),
    date,
  });

  // Check and unlock achievements asynchronously (don't block response)
  checkAndUnlockAchievements(req.user.id);

  res.status(201).json({
    success: true,
    data: { session },
  });
});

// ─── GET /api/v1/sessions ─────────────────────────────────────────────────────
exports.getSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, from, to } = req.query;

  const filter = { userId: req.user.id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to)   filter.date.$lte = to;
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Session.countDocuments(filter);
  const sessions = await Session.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: { sessions },
    pagination: {
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

// ─── GET /api/v1/sessions/:id ─────────────────────────────────────────────────
exports.getSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) throw new AppError('Session not found.', 404, 'NOT_FOUND');
  if (session.userId.toString() !== req.user.id.toString()) {
    throw new AppError('You do not have permission to access this session.', 403, 'FORBIDDEN');
  }

  res.status(200).json({ success: true, data: { session } });
});

// ─── DELETE /api/v1/sessions/:id ─────────────────────────────────────────────
exports.deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) throw new AppError('Session not found.', 404, 'NOT_FOUND');
  if (session.userId.toString() !== req.user.id.toString()) {
    throw new AppError('You do not have permission to delete this session.', 403, 'FORBIDDEN');
  }

  await session.deleteOne();
  res.status(204).send();
});
