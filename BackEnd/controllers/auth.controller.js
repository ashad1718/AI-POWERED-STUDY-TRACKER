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
const { generateOTP, hashOTP, compareOTP } = require('../utils/otp');
const { sendOTP } = require('../services/email.service');
const { assertStrongPassword } = require('../utils/passwordValidation');

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

  if (!email || !password || !name) {
    throw new AppError('Please provide name, email, and password.', 400, 'MISSING_FIELDS');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already in use
  let existing;
  try {
    existing = await User.findOne({ email: normalizedEmail });
  } catch (dbErr) {
    console.error(`[REGISTER] Database failure during email lookup: ${dbErr.message}`);
    throw new AppError('Database failure. Please try again.', 500, 'DATABASE_FAILURE');
  }

  if (existing) {
    console.warn(`[REGISTER] Registration failed: email already in use: ${normalizedEmail}`);
    throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
  }

  let user;
  try {
    user = await User.create({ name, email: normalizedEmail, password });
  } catch (dbErr) {
    console.error(`[REGISTER] Database failure during user creation: ${dbErr.message}`);
    throw new AppError('Database failure saving user. Please try again.', 500, 'DATABASE_FAILURE');
  }

  console.log(`[REGISTER] User created`);
  console.log(`[REGISTER] Email saved: ${user.email}`);
  console.log(`[REGISTER] User ID: ${user._id}`);

  sendTokenResponse(user, 201, res);
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400, 'MISSING_CREDENTIALS');
  }

  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[LOGIN] Email received: ${normalizedEmail}`);
  console.log(`[LOGIN] User lookup started`);

  let user;
  try {
    user = await User.findOne({ email: normalizedEmail }).select('+password');
  } catch (dbErr) {
    console.error(`[LOGIN] Database failure during user search: ${dbErr.message}`);
    throw new AppError(`Database lookup failed: ${dbErr.message}`, 500, 'DATABASE_FAILURE');
  }

  if (!user) {
    console.warn(`[LOGIN] User not found`);
    throw new AppError('User not found.', 401, 'USER_NOT_FOUND');
  }

  console.log(`[LOGIN] User found`);

  let isMatch = false;
  try {
    isMatch = await user.comparePassword(password);
  } catch (err) {
    console.error(`[LOGIN] Error comparing passwords: ${err.message}`);
    throw new AppError(`Error verifying credentials: ${err.message}`, 500, 'CRYPTO_ERROR');
  }

  console.log(`[LOGIN] Password comparison result: ${isMatch}`);

  if (!isMatch) {
    console.warn(`[LOGIN] Password mismatch`);
    throw new AppError('Password mismatch.', 401, 'PASSWORD_MISMATCH');
  }

  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  console.log(`[LOGIN] JWT generated`);

  // Save refresh token hash in DB for rotation validation
  user.refreshToken = refreshToken;
  try {
    await user.save({ validateBeforeSave: false });
  } catch (saveErr) {
    console.error(`[LOGIN] JWT failure (failed to save refresh token): ${saveErr.message}`);
    throw new AppError(`JWT failure (failed to save refresh token): ${saveErr.message}`, 500, 'JWT_FAILURE');
  }

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  console.log(`[LOGIN] Login successful`);

  res.status(200).json({
    success: true,
    data: {
      user:        user.toPublicJSON(),
      accessToken,
    },
  });
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

// ─── POST /api/v1/auth/forgot-password ────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Please provide an email address.', 400, 'MISSING_EMAIL');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    console.warn(`[OTP] Forgot password lookup failed: Email not found: ${normalizedEmail}`);
    throw new AppError('No account found with this email.', 404, 'EMAIL_NOT_FOUND');
  }

  const otp = generateOTP();
  const hashedOtp = await hashOTP(otp);

  user.otpHash = hashedOtp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  console.log(`[OTP] Generated`);
  console.log(`[DEBUG OTP] Generated OTP: ${otp}`);

  // Send email
  await sendOTP(normalizedEmail, otp);
  console.log(`[OTP] Sent`);

  res.status(200).json({
    success: true,
    data: {
      message: 'Verification code sent successfully.',
    },
  });
});

// ─── POST /api/v1/auth/verify-otp ─────────────────────────────────────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new AppError('Please provide email and verification code.', 400, 'MISSING_FIELDS');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+otpHash');

  if (!user) {
    throw new AppError('No account found with this email.', 404, 'EMAIL_NOT_FOUND');
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new AppError('No active OTP verification session found. Please request a new code.', 400, 'NO_OTP_SESSION');
  }

  if (Date.now() > new Date(user.otpExpiresAt)) {
    throw new AppError('Verification code has expired.', 400, 'OTP_EXPIRED');
  }

  if (user.otpAttempts >= 5) {
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });
    console.warn(`[OTP] Verification Failed: Maximum attempts exceeded for: ${normalizedEmail}`);
    throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
  }

  const isMatch = await compareOTP(otp, user.otpHash);
  if (!isMatch) {
    user.otpAttempts += 1;
    console.warn(`[OTP] Verification Failed: Incorrect OTP for ${normalizedEmail}. Attempt ${user.otpAttempts}/5`);
    
    if (user.otpAttempts >= 5) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
    }
    
    await user.save({ validateBeforeSave: false });
    throw new AppError('Invalid verification code.', 400, 'INVALID_OTP');
  }

  console.log(`[OTP] Verification Success`);
  res.status(200).json({
    success: true,
    data: {
      message: 'OTP verified successfully.',
    },
  });
});

// ─── POST /api/v1/auth/resend-otp ─────────────────────────────────────────────
exports.resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Please provide an email address.', 400, 'MISSING_EMAIL');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError('No account found with this email.', 404, 'EMAIL_NOT_FOUND');
  }

  const otp = generateOTP();
  const hashedOtp = await hashOTP(otp);

  user.otpHash = hashedOtp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  console.log(`[OTP] Generated`);
  console.log(`[DEBUG OTP] Generated OTP: ${otp}`);

  // Send email
  await sendOTP(normalizedEmail, otp);
  console.log(`[OTP] Sent`);

  res.status(200).json({
    success: true,
    data: {
      message: 'Verification code sent successfully.',
    },
  });
});

// ─── POST /api/v1/auth/reset-password ─────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    throw new AppError('Please provide all required fields.', 400, 'MISSING_FIELDS');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+otpHash');

  if (!user) {
    throw new AppError('No account found with this email.', 404, 'EMAIL_NOT_FOUND');
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new AppError('No active OTP verification session found. Please request a new code.', 400, 'NO_OTP_SESSION');
  }

  if (Date.now() > new Date(user.otpExpiresAt)) {
    throw new AppError('Verification code has expired.', 400, 'OTP_EXPIRED');
  }

  if (user.otpAttempts >= 5) {
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
  }

  const isMatch = await compareOTP(otp, user.otpHash);
  if (!isMatch) {
    user.otpAttempts += 1;
    if (user.otpAttempts >= 5) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
    }
    await user.save({ validateBeforeSave: false });
    throw new AppError('Invalid verification code.', 400, 'INVALID_OTP');
  }

  // Password Validation
  assertStrongPassword(newPassword);

  // Update password and clear OTP states & refresh token
  user.password = newPassword;
  user.otpHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.refreshToken = null;

  await user.save(); // pre-save hook will hash the password

  console.log(`[PASSWORD] Updated Successfully`);

  res.status(200).json({
    success: true,
    data: {
      message: 'Password updated successfully. Please login with your new password.',
    },
  });
});
