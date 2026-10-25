'use strict';

/**
 * Debug routes are intentionally opt-in and local-only.
 *
 * NODE_ENV alone is not sufficient because a deployment can be misconfigured
 * with NODE_ENV=development. Vercel markers always disable these routes, and
 * local development requires an explicit process flag.
 */
const isLocalDebugEnvironment = () => (
  process.env.NODE_ENV === 'development' &&
  !process.env.VERCEL &&
  !process.env.VERCEL_ENV &&
  process.argv.includes('--enable-local-debug-routes')
);

module.exports = { isLocalDebugEnvironment };
