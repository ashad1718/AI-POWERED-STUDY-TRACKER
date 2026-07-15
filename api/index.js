'use strict';

const path = require('path');
// Load environment variables for local testing (Vercel overrides this in production)
require('dotenv').config({ path: path.join(__dirname, '../BackEnd/.env') });

const app = require('../BackEnd/app');
const connectDB = require('../BackEnd/config/db');
const { initGemini } = require('../BackEnd/services/gemini.service');

// Cache database and Gemini initialization between lambda container invocations
let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      console.log('[SERVERLESS] Initialising Database and Gemini Service...');
      await connectDB();
      initGemini();
      isInitialized = true;
      console.log('[SERVERLESS] Initialisation complete');
    } catch (err) {
      console.error('[SERVERLESS ERROR] Initialisation failed:', err);
      return res.status(500).json({
        success: false,
        message: 'Serverless initialisation failed',
        error: err.message,
      });
    }
  }

  // Forward the request to Express app
  return app(req, res);
};
