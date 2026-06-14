'use strict';

const express        = require('express');
const router         = express.Router();
const { protect }    = require('../middleware/auth.middleware');
const geminiCtrl     = require('../controllers/gemini.controller');

// All Gemini routes require authentication
router.use(protect);

// POST /api/ai/analyze
// Body: none required — user data fetched from JWT identity
router.post('/analyze', geminiCtrl.analyzeStudy);

// POST /api/ai/chat
// Body: { message } — user data fetched from JWT identity
router.post('/chat', geminiCtrl.chatStudy);

module.exports = router;
