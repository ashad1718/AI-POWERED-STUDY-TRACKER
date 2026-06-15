'use strict';

const AppError = require('../utils/AppError');

/**
 * handleCastError — Mongoose CastError (invalid ObjectId in URL param)
 * e.g. GET /sessions/not-a-valid-id
 */
const handleCastError = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
};

/**
 * handleDuplicateKeyError — Mongoose duplicate key (e.g. email already exists)
 * MongoDB error code 11000
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(
    `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' is already in use.`,
    409,
    'DUPLICATE_FIELD'
  );
};

/**
 * handleValidationError — Mongoose schema validation failed
 * e.g. required field missing
 */
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation failed: ${messages.join('. ')}`, 400, 'VALIDATION_ERROR');
};

/**
 * handleJWTError — jsonwebtoken invalid signature or malformed token
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

/**
 * handleJWTExpiredError — jsonwebtoken expired
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

// ─── Response Senders ────────────────────────────────────────────────────────

/**
 * Development error response — includes full stack trace for debugging.
 */
const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      code: err.code || null,
      stack: err.stack,
    },
  });
};

/**
 * Production error response — only send safe, operational errors to client.
 * Programming errors (bugs) get a generic 500 message.
 */
const sendProdError = (err, res) => {
  if (err.isOperational) {
    // Trusted AppError — safe to expose message
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || null,
      },
    });
  } else {
    // Unknown / programming error — don't leak details
    console.error('💥 UNHANDLED ERROR:', err);
    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong. Please try again later.',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * Express global error-handling middleware.
 * Must be registered LAST in app.js (after all routes).
 * Called whenever next(err) is invoked anywhere in the app.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next  — must be declared even if unused
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Convert known Mongoose / JWT errors into AppErrors
  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;

  if (error.name === 'CastError')             error = handleCastError(error);
  if (error.code === 11000)                   error = handleDuplicateKeyError(error);
  if (error.name === 'ValidationError')       error = handleValidationError(error);
  if (error.name === 'JsonWebTokenError')     error = handleJWTError();
  if (error.name === 'TokenExpiredError')     error = handleJWTExpiredError();

  // Default to 500 if no statusCode was set
  error.statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV === 'development') {
    sendDevError(error, res);
  } else {
    sendProdError(error, res);
  }
};

module.exports = errorHandler;
