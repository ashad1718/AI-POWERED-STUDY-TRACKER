'use strict';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

const getErrorName = (error) => error?.name || error?.constructor?.name || 'Error';

/**
 * Create an idempotent shutdown function for the traditional Node server.
 * The HTTP server stops accepting connections before Prisma is disconnected.
 */
const createShutdownHandler = ({
  getServer = () => null,
  prisma,
  logger = console,
  exit = process.exit,
  timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
} = {}) => {
  let shutdownPromise;

  return (signal = 'shutdown', requestedExitCode = 0) => {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      let exitCode = requestedExitCode;
      logger.log?.(`[SHUTDOWN] ${signal} received`);

      const server = getServer();
      if (server?.listening && typeof server.close === 'function') {
        await new Promise((resolve) => {
          let settled = false;
          let timer;
          const finish = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') {
              exitCode = 1;
              logger.error?.(`[SHUTDOWN] HTTP server close failed: ${getErrorName(error)}`);
            }
            resolve();
          };

          timer = setTimeout(() => {
            exitCode = 1;
            logger.error?.('[SHUTDOWN] HTTP server close timed out');
            finish();
          }, timeoutMs);

          try {
            server.close(finish);
          } catch (error) {
            finish(error);
          }
        });
      }

      if (prisma && typeof prisma.$disconnect === 'function') {
        try {
          await prisma.$disconnect();
          logger.log?.('[SHUTDOWN] Database disconnected');
        } catch (error) {
          exitCode = 1;
          logger.error?.(`[SHUTDOWN] Database disconnect failed: ${getErrorName(error)}`);
        }
      }

      exit(exitCode);
      return exitCode;
    })();

    return shutdownPromise;
  };
};

module.exports = {
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  createShutdownHandler,
};
