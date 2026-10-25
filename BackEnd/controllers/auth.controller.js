'use strict';

const { prisma, toPublicJSON, comparePassword, hashPassword } = require('../config/prisma');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  refreshCookieOptions,
  clearCookieOptions,
} = require('../config/jwt');
const { generateOTP, hashOTP, compareOTP } = require('../utils/otp');
const { sendOTP } = require('../services/email.service');
const { assertStrongPassword } = require('../utils/passwordValidation');

// ─── Helper: send tokens to client ────────────────────────────────────────────
const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokenHash = hashRefreshToken(refreshToken);

  // Store only the refresh-token hash. The raw token remains in the httpOnly cookie.
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refreshTokenHash },
  });

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  console.log('[AUTH] Authentication tokens issued');

  res.status(statusCode).json({
    success: true,
    data: {
      user:        toPublicJSON(user),
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
    existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  } catch (dbErr) {
    console.error('[REGISTER] Database failure during email lookup');
    throw new AppError('Database failure. Please try again.', 500, 'DATABASE_FAILURE');
  }

  if (existing) {
    console.warn('[REGISTER] Registration failed: email already in use');
    throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
  }

  let user;
  try {
    const hashedPassword = await hashPassword(password);
    user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });
  } catch (dbErr) {
    console.error('[REGISTER] Database failure during user creation');
    throw new AppError('Database failure saving user. Please try again.', 500, 'DATABASE_FAILURE');
  }

  console.log(`[REGISTER] User created`);

  await sendTokenResponse(user, 201, res);
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400, 'MISSING_CREDENTIALS');
  }

  const normalizedEmail = email.toLowerCase().trim();

  console.log(`[LOGIN] User lookup started`);

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  } catch (dbErr) {
    console.error('[LOGIN] Database failure during user search');
    throw new AppError(`Database lookup failed: ${dbErr.message}`, 500, 'DATABASE_FAILURE');
  }

  console.log('[LOGIN] User lookup completed');

  if (!user) {
    console.warn(`[LOGIN] User not found`);
    throw new AppError('User not found.', 401, 'USER_NOT_FOUND');
  }

  let isMatch = false;
  try {
    isMatch = await comparePassword(password, user.password);
  } catch (err) {
    console.error('[LOGIN] Error comparing credentials');
    throw new AppError(`Error verifying credentials: ${err.message}`, 500, 'CRYPTO_ERROR');
  }

  if (!isMatch) {
    console.warn(`[LOGIN] Password mismatch`);
    throw new AppError('Password mismatch.', 401, 'PASSWORD_MISMATCH');
  }

  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokenHash = hashRefreshToken(refreshToken);

  // Save refresh token hash in DB for rotation validation
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshTokenHash },
    });
  } catch (saveErr) {
    console.error('[LOGIN] Failed to save refresh token');
    throw new AppError(`JWT failure (failed to save refresh token): ${saveErr.message}`, 500, 'JWT_FAILURE');
  }

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  console.log(`[LOGIN] Login successful`);

  res.status(200).json({
    success: true,
    data: {
      user:        toPublicJSON(user),
      accessToken,
    },
  });
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  // Clear refresh token from DB
  await prisma.user.update({
    where: { id: req.user.id },
    data: { refreshToken: null },
  });

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

  // Verify the refresh token before trusting its claims.
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    console.error('[AUTH] Refresh failed: Invalid or expired refresh token');
    res.clearCookie('refreshToken', clearCookieOptions);
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (!decoded || typeof decoded.id !== 'string') {
    res.clearCookie('refreshToken', clearCookieOptions);
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Validate the verified token against the stored hash (or migrate a legacy
  // plaintext value after a successful, fully verified refresh).
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  const tokenMatch = user ? compareRefreshToken(token, user.refreshToken) : { matches: false };
  if (!user || !tokenMatch.matches) {
    console.error('[AUTH] Refresh failed: Token mismatch or user not found');
    res.clearCookie('refreshToken', clearCookieOptions);
    throw new AppError('Refresh token mismatch. Please log in again.', 401, 'REFRESH_TOKEN_REUSE');
  }

  // Rotate atomically so only one concurrent request can consume the stored token.
  const newRefreshToken = signRefreshToken(user);
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const rotation = await prisma.user.updateMany({
    where: { id: user.id, refreshToken: user.refreshToken },
    data: { refreshToken: newRefreshTokenHash },
  });

  if (rotation.count !== 1) {
    res.clearCookie('refreshToken', clearCookieOptions);
    throw new AppError('Refresh token mismatch. Please log in again.', 401, 'REFRESH_TOKEN_REUSE');
  }

  const newAccessToken = signAccessToken(user);
  res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);
  console.log('[AUTH] Refresh successful');

  res.status(200).json({
    success: true,
    data: { accessToken: newAccessToken },
  });
});

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const publicUser = toPublicJSON(req.user);
  res.status(200).json({
    success: true,
    data: {
      ...publicUser,
      profile: {
        location: publicUser.location || '',
        avatarUrl: publicUser.avatarUrl || '',
        twoFactorEnabled: publicUser.twoFactorEnabled || false,
        createdAt: publicUser.createdAt,
      },
    },
  });
});

// ─── POST /api/v1/auth/forgot-password ────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Please provide an email address.', 400, 'MISSING_EMAIL');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    console.warn('[OTP] Forgot password lookup failed: Email not found');
    throw new AppError('No account found with this email.', 404, 'EMAIL_NOT_FOUND');
  }

  const otp = generateOTP();
  const hashedOtp = await hashOTP(otp);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpHash: hashedOtp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      otpAttempts: 0,
    },
  });

  console.log(`[OTP] Generated`);

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
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

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
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });
    console.warn('[OTP] Verification failed: Maximum attempts exceeded');
    throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
  }

  const isMatch = await compareOTP(otp, user.otpHash);
  if (!isMatch) {
    const updatedAttempts = user.otpAttempts + 1;
    console.warn('[OTP] Verification failed: Incorrect OTP');
    
    if (updatedAttempts >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      });
      throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { otpAttempts: updatedAttempts },
    });
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
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    throw new AppError('No account found with this email.', 404, 'EMAIL_NOT_FOUND');
  }

  const otp = generateOTP();
  const hashedOtp = await hashOTP(otp);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpHash: hashedOtp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      otpAttempts: 0,
    },
  });

  console.log(`[OTP] Generated`);

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
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

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
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });
    throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
  }

  const isMatch = await compareOTP(otp, user.otpHash);
  if (!isMatch) {
    const updatedAttempts = user.otpAttempts + 1;
    if (updatedAttempts >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      });
      throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400, 'OTP_MAX_ATTEMPTS');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { otpAttempts: updatedAttempts },
    });
    throw new AppError('Invalid verification code.', 400, 'INVALID_OTP');
  }

  // Password Validation
  assertStrongPassword(newPassword);

  // Update password and clear OTP states & refresh token
  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      refreshToken: null,
    },
  });

  console.log(`[PASSWORD] Updated Successfully`);

  res.status(200).json({
    success: true,
    data: {
      message: 'Password updated successfully. Please login with your new password.',
    },
  });
});
