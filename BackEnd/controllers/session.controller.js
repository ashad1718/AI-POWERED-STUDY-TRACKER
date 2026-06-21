'use strict';

const Session       = require('../models/Session');
const Semester      = require('../models/Semester');
const AppError      = require('../utils/AppError');
const asyncHandler  = require('../utils/asyncHandler');
const { checkAndUnlockAchievements } = require('../services/achievement.service');
const { checkAndUpdateChapterAutoCompletion } = require('../services/chapterCompletion.service');

// ─── POST /api/v1/sessions ────────────────────────────────────────────────────
exports.createSession = asyncHandler(async (req, res) => {
  const { subject, subjectId, chapterId, duration, date } = req.body;

  // Verify active semester exists
  const activeSemester = await Semester.findOne({ userId: req.user.id, active: true, isDeleted: false });
  if (!activeSemester) {
    throw new AppError('Please configure your semester first.', 400);
  }

  let resolvedSubject = subject;
  let resolvedChapter = '';

  if (subjectId) {
    const Subject = require('../models/Subject');
    const sub = await Subject.findOne({ _id: subjectId, userId: req.user.id });
    if (sub) {
      resolvedSubject = sub.name;
    }
  }

  if (chapterId) {
    const Chapter = require('../models/Chapter');
    const chap = await Chapter.findOne({ _id: chapterId, userId: req.user.id });
    if (chap) {
      resolvedChapter = chap.name;
    }
  }

  const session = await Session.create({
    userId:   req.user.id,
    subject:  resolvedSubject || 'General Study',
    subjectId: subjectId || null,
    chapterId: chapterId || null,
    chapter:  resolvedChapter,
    duration: Number(duration),
    date,
  });

  console.log('[SESSION] Created');

  if (chapterId && resolvedChapter) {
    console.log('[SESSION] Chapter linked');
  }

  // Re-evaluate chapter auto-completion status
  if (subjectId && chapterId) {
    await checkAndUpdateChapterAutoCompletion(req.user.id, subjectId, chapterId);
    console.log('[SESSION] Progress updated');
  }

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

  const { subjectId, chapterId } = session;

  await session.deleteOne();

  // Re-evaluate chapter auto-completion status after deletion
  if (subjectId && chapterId) {
    await checkAndUpdateChapterAutoCompletion(req.user.id, subjectId, chapterId);
  }

  res.status(204).send();
});
