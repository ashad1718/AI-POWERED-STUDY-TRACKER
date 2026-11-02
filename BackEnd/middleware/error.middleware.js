'use strict';

const AppError = require('../utils/AppError');

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again later.';

const DATABASE_UNAVAILABLE_CODES = new Set([
  'P1000',
  'P1001',
  'P1002',
  'P1017',
  'P2024',
  'P2028',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
]);

const isPrismaError = (err) => {
  const name = err?.name || err?.constructor?.name || '';
  return name.startsWith('PrismaClient');
};

const isDatabaseConnectionError = (err) => {
  const code = typeof err?.code === 'string' ? err.code : '';
  const name = err?.name || err?.constructor?.name || '';
  const message = typeof err?.message === 'string' ? err.message : '';

  return DATABASE_UNAVAILABLE_CODES.has(code)
    || name === 'DatabaseError'
    || /connection|database server|server has closed|can't reach|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(message);
};

const handlePrismaError = (err) => {
  switch (err.code) {
    case 'P2000':
    case 'P2006':
    case 'P2007':
    case 'P2009':
      return new AppError('The submitted data is invalid.', 400, 'VALIDATION_ERROR');
    case 'P2002':
      return new AppError('A record with these details already exists.', 409, 'DUPLICATE_FIELD');
    case 'P2003':
    case 'P2014':
      return new AppError('The requested relationship is invalid.', 400, 'INVALID_RELATIONSHIP');
    case 'P2025':
      return new AppError('The requested record was not found.', 404, 'NOT_FOUND');
    case 'P2034':
      return new AppError('The request conflicted with another update. Please try again.', 409, 'DATABASE_CONFLICT');
    case 'P1000':
    case 'P1001':
    case 'P1002':
    case 'P1017':
    case 'P2024':
    case 'P2028':
      return new AppError('Database temporarily unavailable. Please try again later.', 503, 'DATABASE_UNAVAILABLE');
    default:
      return new AppError('Database operation failed. Please try again later.', 500, 'DATABASE_FAILURE');
  }
};

const handleBodyParserError = (err) => {
  if (err?.type === 'entity.too.large') {
    return new AppError('Request body is too large.', 413, 'PAYLOAD_TOO_LARGE');
  }
  return new AppError('Request body contains invalid JSON.', 400, 'VALIDATION_ERROR');
};

const normalizeError = (err) => {
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return handleBodyParserError(err);
  }
  if (isDatabaseConnectionError(err)) {
    return new AppError('Database temporarily unavailable. Please try again later.', 503, 'DATABASE_UNAVAILABLE');
  }
  if (isPrismaError(err)) return handlePrismaError(err);

  let error = err instanceof Error ? err : new Error(GENERIC_ERROR_MESSAGE);

  // Convert legacy Mongoose / JWT errors into the existing API error contract.
  if (error.name === 'CastError')             error = handleCastError(error);
  if (error.code === 11000)                   error = handleDuplicateKeyError(error);
  if (error.name === 'ValidationError')       error = handleValidationError(error);
  if (error.name === 'JsonWebTokenError')     error = handleJWTError();
  if (error.name === 'TokenExpiredError')     error = handleJWTExpiredError();

  const statusCode = Number(error.statusCode);
  error.statusCode = Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
    ? statusCode
    : 500;
  return error;
};

const logError = (err, req) => {
  const name = err?.name || err?.constructor?.name || 'Error';
  const code = err?.code || 'UNKNOWN_ERROR';
  const method = req?.method || 'UNKNOWN_METHOD';
  const path = req?.path || 'UNKNOWN_PATH';
  console.error(`[ERROR] ${method} ${path} ${name} (${code})`);
};

/**
 * handleCastError — Mongoose CastError (invalid ObjectId in URL param)
 * e.g. GET /sessions/not-a-valid-id
 */
const handleCastError = (err) => {
  return new AppError(`Invalid ${err.path || 'resource'} identifier.`, 400, 'INVALID_ID');
};

/**
 * handleDuplicateKeyError — Mongoose duplicate key (e.g. email already exists)
 * MongoDB error code 11000
 */
const handleDuplicateKeyError = (err) => {
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
  const message = field
    ? `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use.`
    : 'A record with these details already exists.';
  return new AppError(message, 409, 'DUPLICATE_FIELD');
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
    console.error(`💥 UNHANDLED ERROR: ${err.name}`);
    res.status(500).json({
      success: false,
      error: {
        message: GENERIC_ERROR_MESSAGE,
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
  if (res.headersSent) return next(err);

  const error = normalizeError(err);
  if (!error.isOperational || error.code === 'DATABASE_FAILURE' || error.code === 'DATABASE_UNAVAILABLE') {
    logError(err, req);
  }

  if (process.env.NODE_ENV === 'development') {
    sendDevError(error, res);
  } else {
    sendProdError(error, res);
  }
};

module.exports = errorHandler;
