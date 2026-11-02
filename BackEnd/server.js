'use strict';
// Trigger reload after env change

require('dotenv').config();

const { prisma }            = require('./config/prisma');
const app                   = require('./app');
const { initGemini }        = require('./services/gemini.service');
const { createShutdownHandler } = require('./utils/shutdown');

const PORT = process.env.PORT || 5000;
let server;
const shutdown = createShutdownHandler({
  getServer: () => server,
  prisma,
});

const handleFatalError = (event, error) => {
  const errorName = error?.name || error?.constructor?.name || 'Error';
  console.error(`[${event}] Fatal server error: ${errorName}`);
  void shutdown(event, 1);
};

process.once('uncaughtException', (error) => handleFatalError('UNCAUGHT_EXCEPTION', error));
process.once('unhandledRejection', (error) => handleFatalError('UNHANDLED_REJECTION', error));
process.once('SIGTERM', () => void shutdown('SIGTERM', 0));
process.once('SIGINT', () => void shutdown('SIGINT', 0));

const startServer = async () => {
  // Verify connection to Neon DB
  try {
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database.');
  } catch (err) {
    const errorName = err?.name || err?.constructor?.name || 'Error';
    console.error(`[STARTUP] Database connection failed: ${errorName}`);
    await shutdown('STARTUP_FAILURE', 1);
    return;
  }

  // Initialise Gemini AI (non-blocking — server still starts if key is missing)
  initGemini();

  server = app.listen(PORT, () => {
    console.log(`🚀 StudyAI API running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
  server.on('error', (error) => {
    const errorName = error?.code || error?.name || 'Error';
    console.error(`[SERVER] HTTP server error: ${errorName}`);
    void shutdown('SERVER_ERROR', 1);
  });
};

void startServer().catch((error) => handleFatalError('STARTUP_FAILURE', error));
