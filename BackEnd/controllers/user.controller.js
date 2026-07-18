'use strict';

const { prisma, toPublicJSON, comparePassword, hashPassword } = require('../config/prisma');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET /api/v1/users/me ─────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: toPublicJSON(req.user) },
  });
});

// ─── PATCH /api/v1/users/me ───────────────────────────────────────────────────
exports.updateMe = asyncHandler(async (req, res) => {
  // Whitelist only safe fields — prevent privilege escalation
  const { name, location, avatarUrl } = req.body;
  const updates = {};
  if (name)      updates.name      = name;
  if (location !== undefined) updates.location  = location;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updates,
  });

  res.status(200).json({
    success: true,
    data: { user: toPublicJSON(user) },
  });
});

// ─── PATCH /api/v1/users/me/password ─────────────────────────────────────────
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide currentPassword and newPassword.', 400);
  }

  // Fetch user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user || !(await comparePassword(currentPassword, user.password))) {
    throw new AppError('Current password is incorrect.', 401, 'WRONG_PASSWORD');
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  res.status(200).json({
    success: true,
    data: { message: 'Password updated successfully.' },
  });
});
