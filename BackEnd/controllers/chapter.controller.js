'use strict';

const Chapter      = require('../models/Chapter');
const Subject      = require('../models/Subject');
const Semester     = require('../models/Semester');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { checkAndUpdateChapterAutoCompletion } = require('../services/chapterCompletion.service');

// ─── GET /api/v1/chapters ─────────────────────────────────────────────────────
exports.getChapters = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id, isDeleted: false };
  
  if (req.query.subjectId) {
    filter.subjectId = req.query.subjectId;
  }

  const chapters = await Chapter.find(filter).sort({ order: 1, createdAt: -1 });

  const Session = require('../models/Session');
  const chapterIds = chapters.map(c => c._id);
  const sessionStats = await Session.aggregate([
    { $match: { chapterId: { $in: chapterIds } } },
    {
      $group: {
        _id: '$chapterId',
        sessionCount: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);

  const statsMap = {};
  sessionStats.forEach(stat => {
    if (stat._id) {
      statsMap[stat._id.toString()] = stat;
    }
  });

  const chaptersWithStats = chapters.map(c => {
    const stat = statsMap[c._id.toString()] || { sessionCount: 0, totalDuration: 0 };
    let status = 'not_started';
    if (c.completed) {
      status = 'completed';
    } else if (stat.sessionCount > 0) {
      status = 'in_progress';
    }

    const estimated = c.estimatedTime || 2;
    const actual = c.actualTime || parseFloat((stat.totalDuration / 60).toFixed(2));
    const difference = parseFloat((actual - estimated).toFixed(2));

    return {
      ...c.toObject(),
      estimatedTime: estimated,
      actualTime: actual,
      difference,
      sessionCount: stat.sessionCount,
      totalDuration: stat.totalDuration,
      status
    };
  });

  res.status(200).json({
    success: true,
    data: { chapters: chaptersWithStats },
  });
});

// ─── POST /api/v1/chapters ────────────────────────────────────────────────────
exports.createChapter = asyncHandler(async (req, res) => {
  const { subjectId, name, completed, order, estimatedTime } = req.body;

  if (!subjectId) {
    throw new AppError('Subject ID is required.', 400);
  }
  if (!name || !name.trim()) {
    throw new AppError('Chapter name is required.', 400);
  }
  if (estimatedTime === undefined || estimatedTime === null) {
    throw new AppError('Estimated completion time is required.', 400);
  }
  const estNum = Number(estimatedTime);
  if (isNaN(estNum) || estNum < 0.1) {
    throw new AppError('Estimated completion time must be at least 0.1 hours.', 400);
  }

  // Verify active semester exists
  const activeSemester = await Semester.findOne({ userId: req.user.id, active: true, isDeleted: false });
  if (!activeSemester) {
    throw new AppError('Please configure your semester first.', 400);
  }

  // Verify subject exists and belongs to user
  const subject = await Subject.findOne({ _id: subjectId, userId: req.user.id, isDeleted: false });
  if (!subject) {
    throw new AppError('Associated subject not found.', 404, 'NOT_FOUND');
  }

  const chapter = await Chapter.create({
    userId: req.user.id,
    subjectId,
    name: name.trim(),
    estimatedTime: estNum,
    completed: completed || false,
    completedMethod: completed ? 'manual' : 'none',
    order: order || 0,
  });

  // Re-evaluate auto-completion in case there are already sessions
  await checkAndUpdateChapterAutoCompletion(req.user.id, subjectId, chapter._id);

  res.status(201).json({
    success: true,
    data: { chapter },
  });
});

// ─── PUT /api/v1/chapters/:id ─────────────────────────────────────────────────
exports.updateChapter = asyncHandler(async (req, res) => {
  const chapter = await Chapter.findById(req.params.id);

  if (!chapter) throw new AppError('Chapter not found.', 404, 'NOT_FOUND');
  if (chapter.userId.toString() !== req.user.id.toString()) {
    throw new AppError('You do not have permission to modify this chapter.', 403, 'FORBIDDEN');
  }

  const { name, completed, completedMethod, order, estimatedTime } = req.body;

  if (name !== undefined) chapter.name = name.trim();
  if (order !== undefined) chapter.order = order;
  
  if (estimatedTime !== undefined) {
    const estNum = Number(estimatedTime);
    if (isNaN(estNum) || estNum < 0.1) {
      throw new AppError('Estimated completion time must be at least 0.1 hours.', 400);
    }
    chapter.estimatedTime = estNum;
  }

  if (completed !== undefined) {
    chapter.completed = completed;
    if (completed) {
      chapter.completedMethod = completedMethod || 'manual';
    } else {
      chapter.completedMethod = 'none';
    }
  } else if (completedMethod !== undefined) {
    chapter.completedMethod = completedMethod;
    chapter.completed = completedMethod !== 'none';
  }

  await chapter.save();

  // Re-evaluate auto-completion status
  await checkAndUpdateChapterAutoCompletion(req.user.id, chapter.subjectId, chapter._id);

  res.status(200).json({
    success: true,
    data: { chapter },
  });
});

// ─── DELETE /api/v1/chapters/:id ──────────────────────────────────────────────
exports.deleteChapter = asyncHandler(async (req, res) => {
  const chapter = await Chapter.findById(req.params.id);

  if (!chapter) throw new AppError('Chapter not found.', 404, 'NOT_FOUND');
  if (chapter.userId.toString() !== req.user.id.toString()) {
    throw new AppError('You do not have permission to delete this chapter.', 403, 'FORBIDDEN');
  }

  // Soft delete chapter
  chapter.isDeleted = true;
  await chapter.save();

  res.status(200).json({
    success: true,
    message: 'Chapter soft-deleted successfully.',
  });
});
