'use strict';

const { prisma } = require('../config/prisma');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET /api/v1/subjects ─────────────────────────────────────────────────────
exports.getSubjects = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id, isDeleted: false };
  
  // Optional query params to filter by active / archived status
  if (req.query.active !== undefined) {
    filter.active = req.query.active === 'true';
  }
  if (req.query.isArchived !== undefined) {
    filter.isArchived = req.query.isArchived === 'true';
  }

  const subjects = await prisma.subject.findMany({
    where: filter,
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Map to format that the frontend expects
  const formattedSubjects = subjects.map(s => ({
    ...s,
    _id: s.id,
    completionThreshold: {
      sessions: s.completionThresholdSessions,
      hours: s.completionThresholdHours,
    },
  }));

  res.status(200).json({
    success: true,
    data: { subjects: formattedSubjects },
  });
});

// ─── POST /api/v1/subjects ────────────────────────────────────────────────────
exports.createSubject = asyncHandler(async (req, res) => {
  const { name, completionThreshold, completionRule, active, order } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Subject name is required.', 400);
  }

  // Verify active semester exists
  const activeSemester = await prisma.semester.findFirst({
    where: { userId: req.user.id, active: true, isDeleted: false },
  });
  if (!activeSemester) {
    throw new AppError('Please configure your semester first.', 400);
  }

  const subject = await prisma.subject.create({
    data: {
      userId: req.user.id,
      semesterId: activeSemester.id,
      name: name.trim(),
      completionThresholdSessions: completionThreshold?.sessions !== undefined ? Number(completionThreshold.sessions) : 3,
      completionThresholdHours: completionThreshold?.hours !== undefined ? Number(completionThreshold.hours) : 5.0,
      completionRule: completionRule || 'first_session',
      active: active !== undefined ? active : true,
      order: order || 0,
    },
  });

  const formattedSubject = {
    ...subject,
    _id: subject.id,
    completionThreshold: {
      sessions: subject.completionThresholdSessions,
      hours: subject.completionThresholdHours,
    },
  };

  res.status(201).json({
    success: true,
    data: { subject: formattedSubject },
  });
});

// ─── PUT /api/v1/subjects/:id ─────────────────────────────────────────────────
exports.updateSubject = asyncHandler(async (req, res) => {
  const subject = await prisma.subject.findUnique({
    where: { id: req.params.id },
  });

  if (!subject) throw new AppError('Subject not found.', 404, 'NOT_FOUND');
  if (subject.userId !== req.user.id) {
    throw new AppError('You do not have permission to modify this subject.', 403, 'FORBIDDEN');
  }

  const { name, active, isArchived, completionThreshold, completionRule, order } = req.body;

  const dataToUpdate = {};
  if (name !== undefined) dataToUpdate.name = name.trim();
  if (active !== undefined) dataToUpdate.active = active;
  if (isArchived !== undefined) dataToUpdate.isArchived = isArchived;
  if (completionRule !== undefined) dataToUpdate.completionRule = completionRule;
  if (order !== undefined) dataToUpdate.order = order;
  if (completionThreshold?.sessions !== undefined) dataToUpdate.completionThresholdSessions = Number(completionThreshold.sessions);
  if (completionThreshold?.hours !== undefined) dataToUpdate.completionThresholdHours = Number(completionThreshold.hours);

  const updatedSubject = await prisma.subject.update({
    where: { id: req.params.id },
    data: dataToUpdate,
  });

  const formattedSubject = {
    ...updatedSubject,
    _id: updatedSubject.id,
    completionThreshold: {
      sessions: updatedSubject.completionThresholdSessions,
      hours: updatedSubject.completionThresholdHours,
    },
  };

  res.status(200).json({
    success: true,
    data: { subject: formattedSubject },
  });
});

// ─── DELETE /api/v1/subjects/:id ──────────────────────────────────────────────
exports.deleteSubject = asyncHandler(async (req, res) => {
  const subject = await prisma.subject.findUnique({
    where: { id: req.params.id },
  });

  if (!subject) throw new AppError('Subject not found.', 404, 'NOT_FOUND');
  if (subject.userId !== req.user.id) {
    throw new AppError('You do not have permission to delete this subject.', 403, 'FORBIDDEN');
  }

  // Soft delete subject
  await prisma.subject.update({
    where: { id: req.params.id },
    data: { isDeleted: true },
  });

  // Soft delete all chapters under this subject
  await prisma.chapter.updateMany({
    where: { subjectId: req.params.id, userId: req.user.id },
    data: { isDeleted: true },
  });

  res.status(200).json({
    success: true,
    message: 'Subject and its chapters soft-deleted successfully. Historical session logging is preserved.',
  });
});
