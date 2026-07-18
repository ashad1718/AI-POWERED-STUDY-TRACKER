'use strict';

const { prisma } = require('../config/prisma');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { checkAndUpdateChapterAutoCompletion } = require('../services/chapterCompletion.service');

// ─── GET /api/v1/chapters ─────────────────────────────────────────────────────
exports.getChapters = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id, isDeleted: false };
  
  if (req.query.subjectId) {
    filter.subjectId = req.query.subjectId;
  }

  const chapters = await prisma.chapter.findMany({
    where: filter,
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const chapterIds = chapters.map(c => c.id);
  
  // Aggregate session counts and total durations for these chapters
  const sessionStats = await prisma.session.groupBy({
    by: ['chapterId'],
    where: {
      chapterId: { in: chapterIds },
    },
    _count: {
      _all: true,
    },
    _sum: {
      duration: true,
    },
  });

  const statsMap = {};
  sessionStats.forEach(stat => {
    if (stat.chapterId) {
      statsMap[stat.chapterId] = {
        sessionCount: stat._count._all,
        totalDuration: stat._sum.duration || 0,
      };
    }
  });

  const chaptersWithStats = chapters.map(c => {
    const stat = statsMap[c.id] || { sessionCount: 0, totalDuration: 0 };
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
      ...c,
      _id: c.id, // compatibility with frontend _id
      estimatedTime: estimated,
      actualTime: actual,
      difference,
      sessionCount: stat.sessionCount,
      totalDuration: stat.totalDuration,
      status,
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
  const activeSemester = await prisma.semester.findFirst({
    where: { userId: req.user.id, active: true, isDeleted: false },
  });
  if (!activeSemester) {
    throw new AppError('Please configure your semester first.', 400);
  }

  // Verify subject exists and belongs to user
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId: req.user.id, isDeleted: false },
  });
  if (!subject) {
    throw new AppError('Associated subject not found.', 404, 'NOT_FOUND');
  }

  const chapter = await prisma.chapter.create({
    data: {
      userId: req.user.id,
      subjectId,
      name: name.trim(),
      estimatedTime: estNum,
      completed: completed || false,
      completedMethod: completed ? 'manual' : 'none',
      order: order || 0,
    },
  });

  // Re-evaluate auto-completion in case there are already sessions
  await checkAndUpdateChapterAutoCompletion(req.user.id, subjectId, chapter.id);

  // Fetch the final state of the chapter
  const finalChapter = await prisma.chapter.findUnique({
    where: { id: chapter.id },
  });

  const formattedChapter = {
    ...finalChapter,
    _id: finalChapter.id,
  };

  res.status(201).json({
    success: true,
    data: { chapter: formattedChapter },
  });
});

// ─── PUT /api/v1/chapters/:id ─────────────────────────────────────────────────
exports.updateChapter = asyncHandler(async (req, res) => {
  const chapter = await prisma.chapter.findUnique({
    where: { id: req.params.id },
  });

  if (!chapter) throw new AppError('Chapter not found.', 404, 'NOT_FOUND');
  if (chapter.userId !== req.user.id) {
    throw new AppError('You do not have permission to modify this chapter.', 403, 'FORBIDDEN');
  }

  const { name, completed, completedMethod, order, estimatedTime } = req.body;

  const dataToUpdate = {};
  if (name !== undefined) dataToUpdate.name = name.trim();
  if (order !== undefined) dataToUpdate.order = order;
  
  if (estimatedTime !== undefined) {
    const estNum = Number(estimatedTime);
    if (isNaN(estNum) || estNum < 0.1) {
      throw new AppError('Estimated completion time must be at least 0.1 hours.', 400);
    }
    dataToUpdate.estimatedTime = estNum;
  }

  if (completed !== undefined) {
    dataToUpdate.completed = completed;
    if (completed) {
      dataToUpdate.completedMethod = completedMethod || 'manual';
    } else {
      dataToUpdate.completedMethod = 'none';
    }
  } else if (completedMethod !== undefined) {
    dataToUpdate.completedMethod = completedMethod;
    dataToUpdate.completed = completedMethod !== 'none';
  }

  const updatedChapter = await prisma.chapter.update({
    where: { id: req.params.id },
    data: dataToUpdate,
  });

  // Re-evaluate auto-completion status
  await checkAndUpdateChapterAutoCompletion(req.user.id, updatedChapter.subjectId, updatedChapter.id);

  // Fetch final chapter state
  const finalChapter = await prisma.chapter.findUnique({
    where: { id: updatedChapter.id },
  });

  const formattedChapter = {
    ...finalChapter,
    _id: finalChapter.id,
  };

  res.status(200).json({
    success: true,
    data: { chapter: formattedChapter },
  });
});

// ─── DELETE /api/v1/chapters/:id ──────────────────────────────────────────────
exports.deleteChapter = asyncHandler(async (req, res) => {
  const chapter = await prisma.chapter.findUnique({
    where: { id: req.params.id },
  });

  if (!chapter) throw new AppError('Chapter not found.', 404, 'NOT_FOUND');
  if (chapter.userId !== req.user.id) {
    throw new AppError('You do not have permission to delete this chapter.', 403, 'FORBIDDEN');
  }

  // Soft delete chapter
  await prisma.chapter.update({
    where: { id: req.params.id },
    data: { isDeleted: true },
  });

  res.status(200).json({
    success: true,
    message: 'Chapter soft-deleted successfully.',
  });
});
