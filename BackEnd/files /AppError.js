'use strict';

/**
 * AppError — custom error class for operational errors.
 *
 * Extends the native Error class so it can be thrown anywhere and
 * caught by the global error middleware in middleware/error.middleware.js
 *
 * Usage:
 *   throw new AppError('User not found', 404);
 *   throw new AppError('Invalid credentials', 401);
 *   throw new AppError('Email already exists', 409);
 */
class AppError extends Error {
  /**
   * @param {string} message     - Human-readable error message (sent to client)
   * @param {number} statusCode  - HTTP status code (400, 401, 403, 404, 409, 500...)
   * @param {string} [code]      - Optional machine-readable error code string
   */
  constructor(message, statusCode, code = null) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;

    // Marks this as an "operational" error (expected / handled)
    // vs a programming error (bug) — used in error middleware
    this.isOperational = true;

    // Capture stack trace, excluding this constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
