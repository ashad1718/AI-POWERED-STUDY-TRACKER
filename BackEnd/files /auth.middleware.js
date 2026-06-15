'use strict';

const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * protect — Express middleware that guards private routes.
 *
 * Reads the JWT from the Authorization header:
 *   Authorization: Bearer <accessToken>
 *
 * On success: attaches req.user (full Mongoose document) and calls next()
 * On failure: throws AppError → caught by global error handler
 */
const protect = asyncHandler(async (req, res, next) => {
  // 1. Extract token from header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('You are not logged in. Please log in to get access.', 401, 'NOT_AUTHENTICATED');
  }

  // 2. Verify token (throws if invalid or expired)
  const decoded = verifyAccessToken(token);

  // 3. Check user still exists (e.g. account deleted after token was issued)
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND');
  }

  // 4. Attach user to request for use in controllers
  req.user = user;
  next();
});

module.exports = { protect };
