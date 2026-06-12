'use strict';

const User         = require('../models/User');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET /api/v1/users/me ─────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user.toPublicJSON() },
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

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: { user: user.toPublicJSON() },
  });
});

// ─── PATCH /api/v1/users/me/password ─────────────────────────────────────────
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide currentPassword and newPassword.', 400);
  }

  // Fetch user with password field
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect.', 401, 'WRONG_PASSWORD');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'Password updated successfully.' },
  });
});
