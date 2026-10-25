'use strict';

const express        = require('express');
const router         = express.Router();
const { protect }    = require('../middleware/auth.middleware');
const geminiCtrl     = require('../controllers/gemini.controller');
const { validateRequest } = require('../middleware/validation.middleware');
const { chatValidation, emptyBodyValidation } = require('../middleware/resource.validation');

// All Gemini routes require authentication
router.use(protect);

// POST /api/ai/analyze
// Body: none required — user data fetched from JWT identity
router.post('/analyze', emptyBodyValidation, validateRequest, geminiCtrl.analyzeStudy);

// POST /api/ai/chat
// Body: { message } — user data fetched from JWT identity
router.post('/chat', chatValidation, validateRequest, geminiCtrl.chatStudy);

module.exports = router;
