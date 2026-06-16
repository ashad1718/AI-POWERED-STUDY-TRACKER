'use strict';

const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
  },
});

// Authentication Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit for development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many auth attempts. Please try again in 15 minutes.', code: 'AUTH_RATE_LIMITED' },
  },
  handler: (req, res, next, options) => {
    console.warn(`[RATE-LIMIT EXCEEDED] IP: ${req.ip} | Route: ${req.originalUrl} | Limit: ${options.max}`);
    res.status(options.statusCode).json(options.message);
  },
});

// Gemini AI Rate Limiter (5 requests per minute)
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many AI requests. Please wait a moment.', code: 'AI_RATE_LIMITED' },
  },
});

// Middleware to log rate limit status for successful auth requests
const logAuthRateLimit = (req, res, next) => {
  if (req.rateLimit) {
    console.log(`[RATE-LIMIT] IP: ${req.ip} | Route: ${req.originalUrl} | Auth Attempts: ${req.rateLimit.current}/${req.rateLimit.limit} | Remaining: ${req.rateLimit.remaining}`);
  }
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  geminiLimiter,
  logAuthRateLimit,
};
