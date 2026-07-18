'use strict';

const jwt = require('jsonwebtoken');

// ─── Constants ───────────────────────────────────────────────────────────────
const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES_IN  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ─── Sign Tokens ─────────────────────────────────────────────────────────────

/**
 * Creates a short-lived access token.
 * Payload stored: { id, name, email }
 * @param {Object} user  - Mongoose user document
 * @returns {string}     - signed JWT string
 */
const signAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
};

/**
 * Creates a long-lived refresh token.
 * Payload stored: { id } only — minimal data in refresh token.
 * @param {Object} user  - User record
 * @returns {string}     - signed JWT string
 */
const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
};

// ─── Verify Tokens ────────────────────────────────────────────────────────────

/**
 * Verifies an access token. Throws JsonWebTokenError on failure.
 * @param {string} token
 * @returns {Object} decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verifies a refresh token. Throws JsonWebTokenError on failure.
 * @param {string} token
 * @returns {Object} decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

// ─── Cookie Options ───────────────────────────────────────────────────────────

/**
 * Options for the httpOnly refresh token cookie.
 * httpOnly  → not accessible by JS (XSS protection)
 * secure    → HTTPS only in production
 * sameSite  → CSRF protection
 */
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

/**
 * Cookie options for clearing the refresh token (on logout).
 */
const clearCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshCookieOptions,
  clearCookieOptions,
};
