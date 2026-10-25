
'use strict';

const path = require('path');

// Load local environment variables for development.
// Vercel supplies environment variables through its project settings.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({
    path: path.join(__dirname, '../BackEnd/.env'),
  });
}

const app = require('../BackEnd/app');
const { prisma } = require('../BackEnd/config/prisma');
const { initGemini } = require('../BackEnd/services/gemini.service');

let initializationPromise;

async function initializeServices() {
  console.log('[SERVERLESS] Initialising database and Gemini service...');

  // Verify that Prisma can connect to PostgreSQL.
  await prisma.$connect();

  // Initialize Gemini after environment variables are available.
  initGemini();

  console.log('[SERVERLESS] Initialisation complete');
}

module.exports = async (req, res) => {
  try {
    if (!initializationPromise) {
      initializationPromise = initializeServices().catch((error) => {
        // Permit a later invocation to retry initialization.
        initializationPromise = undefined;
        throw error;
      });
    }

    await initializationPromise;
    return app(req, res);
  } catch (error) {
    console.error('[SERVERLESS ERROR] Initialisation failed');

    return res.status(500).json({
      success: false,
      message: 'Serverless initialisation failed',
    });
  }
};
