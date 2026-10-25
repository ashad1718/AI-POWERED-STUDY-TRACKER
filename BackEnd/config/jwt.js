'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ─── Constants ───────────────────────────────────────────────────────────────
const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES_IN  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_TOKEN_HASH_PREFIX = 'hmac-sha256:';

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
 * Payload stored: { id, jti } — minimal data plus a unique rotation identifier.
 * @param {Object} user  - User record
 * @returns {string}     - signed JWT string
 */
const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
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

/**
 * Hash a refresh token for storage. The raw bearer token is never persisted.
 * @param {string} token
 * @returns {string}
 */
const hashRefreshToken = (token) => {
  if (!REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured.');
  }

  return `${REFRESH_TOKEN_HASH_PREFIX}${crypto
    .createHmac('sha256', REFRESH_SECRET)
    .update(token, 'utf8')
    .digest('hex')}`;
};

const safeCompare = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false;

  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

/**
 * Compare a presented token with a stored value.
 * Legacy plaintext values are accepted only to migrate active sessions; every
 * successful login or refresh writes the HMAC representation above.
 * @param {string} token
 * @param {string|null} storedValue
 * @returns {{ matches: boolean, legacy: boolean }}
 */
const compareRefreshToken = (token, storedValue) => {
  if (typeof token !== 'string' || typeof storedValue !== 'string') {
    return { matches: false, legacy: false };
  }

  if (storedValue.startsWith(REFRESH_TOKEN_HASH_PREFIX)) {
    return { matches: safeCompare(hashRefreshToken(token), storedValue), legacy: false };
  }

  return { matches: safeCompare(token, storedValue), legacy: true };
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
  hashRefreshToken,
  compareRefreshToken,
  refreshCookieOptions,
  clearCookieOptions,
};
