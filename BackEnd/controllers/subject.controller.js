'use strict';

const Subject      = require('../models/Subject');
const Chapter      = require('../models/Chapter');
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

  const subjects = await Subject.find(filter).sort({ order: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    data: { subjects },
  });
});

// ─── POST /api/v1/subjects ────────────────────────────────────────────────────
exports.createSubject = asyncHandler(async (req, res) => {
  const { name, completionThreshold, completionRule, active, order } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Subject name is required.', 400);
  }

  const subject = await Subject.create({
    userId: req.user.id,
    name: name.trim(),
    completionThreshold,
    completionRule,
    active: active !== undefined ? active : true,
    order: order || 0,
  });

  res.status(201).json({
    success: true,
    data: { subject },
  });
});

// ─── PUT /api/v1/subjects/:id ─────────────────────────────────────────────────
exports.updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) throw new AppError('Subject not found.', 404, 'NOT_FOUND');
  if (subject.userId.toString() !== req.user.id.toString()) {
    throw new AppError('You do not have permission to modify this subject.', 403, 'FORBIDDEN');
  }

  const { name, active, isArchived, completionThreshold, completionRule, order } = req.body;

  if (name !== undefined) subject.name = name.trim();
  if (active !== undefined) subject.active = active;
  if (isArchived !== undefined) subject.isArchived = isArchived;
  if (completionThreshold !== undefined) subject.completionThreshold = completionThreshold;
  if (completionRule !== undefined) subject.completionRule = completionRule;
  if (order !== undefined) subject.order = order;

  await subject.save();

  res.status(200).json({
    success: true,
    data: { subject },
  });
});

// ─── DELETE /api/v1/subjects/:id ──────────────────────────────────────────────
exports.deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) throw new AppError('Subject not found.', 404, 'NOT_FOUND');
  if (subject.userId.toString() !== req.user.id.toString()) {
    throw new AppError('You do not have permission to delete this subject.', 403, 'FORBIDDEN');
  }

  // Soft delete subject
  subject.isDeleted = true;
  await subject.save();

  // Soft delete all chapters under this subject
  await Chapter.updateMany(
    { subjectId: subject._id, userId: req.user.id },
    { isDeleted: true }
  );

  res.status(200).json({
    success: true,
    message: 'Subject and its chapters soft-deleted successfully. Historical session logging is preserved.',
  });
});
