'use strict';

/**
 * asyncHandler — wraps an async Express route handler.
 *
 * Without this utility, every async controller needs its own try/catch:
 *
 *   router.get('/route', async (req, res, next) => {
 *     try { ... } catch (err) { next(err); }
 *   });
 *
 * With asyncHandler, we write:
 *
 *   router.get('/route', asyncHandler(async (req, res, next) => {
 *     ...  // any thrown error or rejected promise goes to next(err) automatically
 *   }));
 *
 * @param {Function} fn  - async controller function (req, res, next) => Promise
 * @returns {Function}   - Express middleware that catches rejections
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
