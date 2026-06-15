'use strict';

const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
  clearCookieOptions,
} = require('../config/jwt');

// ─── Helper: send tokens to client ────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Save refresh token hash in DB for rotation validation
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false }); // fire-and-forget, don't await

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  console.log(`[AUTH] Tokens issued for user: ${user.email} (ID: ${user._id})`);

  res.status(statusCode).json({
    success: true,
    data: {
      user:        user.toPublicJSON(),
      accessToken,
    },
  });
};

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if email already in use
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
  }

  const user = await User.create({ name, email, password });
  sendTokenResponse(user, 201, res);
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400, 'MISSING_CREDENTIALS');
  }

  // Include password field (excluded by default via select: false in schema)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS');
  }

  sendTokenResponse(user, 200, res);
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  // Clear refresh token from DB
  await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

  // Clear the cookie
  res.clearCookie('refreshToken', clearCookieOptions);

  res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
});

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    console.warn('[AUTH] Refresh failed: No refresh token cookie found.');
    throw new AppError('No refresh token provided. Please log in again.', 401, 'NO_REFRESH_TOKEN');
  }

  // Verify the refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    console.error(`[AUTH] Refresh failed: Invalid or expired refresh token. Error: ${err.message}`);
    // Revoke token if possible by decoding it without verification
    try {
      const parsed = jwt.decode(token);
      if (parsed && parsed.id) {
        await User.findByIdAndUpdate(parsed.id, { refreshToken: null });
        console.log(`[AUTH] Revoked invalid refresh token for user ID: ${parsed.id}`);
      }
    } catch (decodeErr) {
      console.error('[AUTH] Failed to decode refresh token for revocation:', decodeErr.message);
    }
    res.clearCookie('refreshToken', clearCookieOptions);
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Find user and validate token matches what's stored
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    console.error(`[AUTH] Refresh failed: Token mismatch or user not found. User ID: ${decoded?.id}`);
    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
      console.log(`[AUTH] Revoked mismatched refresh token for user: ${user.email}`);
    }
    res.clearCookie('refreshToken', clearCookieOptions);
    throw new AppError('Refresh token mismatch. Please log in again.', 401, 'REFRESH_TOKEN_REUSE');
  }

  // Issue new access token
  const newAccessToken = signAccessToken(user);
  console.log(`[AUTH] Refresh successful. New access token issued for user: ${user.email} (ID: ${user._id})`);

  res.status(200).json({
    success: true,
    data: { accessToken: newAccessToken },
  });
});
