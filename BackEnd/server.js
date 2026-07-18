'use strict';
// Trigger reload after env change

require('dotenv').config();

const { prisma }            = require('./config/prisma');
const app                   = require('./app');
const { initGemini }        = require('./services/gemini.service');

process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION — shutting down...');
  console.error(`   ${err.name}: ${err.message}`);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Verify connection to Neon DB
  try {
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database.');
  } catch (err) {
    console.error('💥 Failed to connect to database:', err.message);
    process.exit(1);
  }

  // Initialise Gemini AI (non-blocking — server still starts if key is missing)
  initGemini();

  const server = app.listen(PORT, () => {
    console.log(`🚀 StudyAI API running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED REJECTION — shutting down...');
    console.error(`   ${err.name}: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('📴 SIGTERM — shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\n📴 SIGINT — shutting down...');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
};

startServer();
