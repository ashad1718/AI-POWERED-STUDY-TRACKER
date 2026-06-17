'use strict';

const Chapter      = require('../models/Chapter');
const Subject      = require('../models/Subject');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

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
    return {
      ...c.toObject(),
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
  const { subjectId, name, completed, order } = req.body;

  if (!subjectId) {
    throw new AppError('Subject ID is required.', 400);
  }
  if (!name || !name.trim()) {
    throw new AppError('Chapter name is required.', 400);
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
    completed: completed || false,
    completedMethod: completed ? 'manual' : 'none',
    order: order || 0,
  });

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

  const { name, completed, completedMethod, order } = req.body;

  if (name !== undefined) chapter.name = name.trim();
  if (order !== undefined) chapter.order = order;
  
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
