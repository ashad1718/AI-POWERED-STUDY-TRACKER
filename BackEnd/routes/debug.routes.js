'use strict';

const express = require('express');
const router  = express.Router();
const { prisma, toPublicJSON, comparePassword } = require('../config/prisma');

// Middleware: restrict debug routes strictly to development environment
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Debug endpoints are disabled outside development environment.',
        code: 'FORBIDDEN'
      }
    });
  }
  next();
});

// GET /api/debug/users
router.get('/users', async (req, res, next) => {
  try {
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ select: { email: true } });
    res.status(200).json({
      success: true,
      data: {
        databaseName: 'Neon PostgreSQL',
        collectionName: 'User',
        userCount,
        registeredEmails: users.map(u => u.email)
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/debug/clear-users
router.delete('/clear-users', async (req, res, next) => {
  try {
    const result = await prisma.user.deleteMany({});
    res.status(200).json({
      success: true,
      data: {
        message: 'All registered users cleared successfully.',
        deletedCount: result.count
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/debug/check-user
router.post('/check-user', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(200).json({
        success: true,
        data: {
          exists: false
        }
      });
    }
    res.status(200).json({
      success: true,
      data: {
        exists: true,
        email: user.email,
        passwordHashExists: !!user.password
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/debug/test-login
router.post('/test-login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(200).json({
        success: true,
        data: {
          userFound: false,
          passwordMatch: false,
          jwtGenerated: false,
          errorReason: 'User not found'
        }
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(200).json({
        success: true,
        data: {
          userFound: true,
          passwordMatch: false,
          jwtGenerated: false,
          errorReason: 'Password mismatch'
        }
      });
    }

    const { signAccessToken, signRefreshToken } = require('../config/jwt');
    let accessToken, refreshToken;
    try {
      accessToken  = signAccessToken(user);
      refreshToken = signRefreshToken(user);
    } catch (jwtErr) {
      return res.status(200).json({
        success: true,
        data: {
          userFound: true,
          passwordMatch: true,
          jwtGenerated: false,
          errorReason: `JWT generation failed: ${jwtErr.message}`
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        userFound: true,
        passwordMatch: true,
        jwtGenerated: true,
        accessToken
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/debug/auth-status
router.get('/auth-status', async (req, res, next) => {
  try {
    let loggedInUser = null;
    let authStatus = 'Not logged in';

    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const { verifyAccessToken } = require('../config/jwt');
      try {
        const decoded = verifyAccessToken(token);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (user) {
          loggedInUser = toPublicJSON(user);
          authStatus = 'Authenticated';
        } else {
          authStatus = 'Token valid but user not found';
        }
      } catch (err) {
        authStatus = `Token validation failed: ${err.message}`;
      }
    }

    const userCount = await prisma.user.count();
    res.status(200).json({
      success: true,
      data: {
        databaseName: 'Neon PostgreSQL',
        collectionName: 'User',
        userCount,
        loggedInUser,
        authStatus,
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/debug/gemini
router.get('/gemini', async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { getModelsToTry, PRIMARY_MODEL, FALLBACK_MODELS } = require('../config/ai');
    const { testGeminiConnectivity } = require('../services/gemini.service');

    // 1. Resolve SDK version programmatically
    let sdkVersion = 'Unknown';
    try {
      const pkgPath = path.join(__dirname, '../node_modules/@google/genai/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      sdkVersion = pkg.version || 'Unknown';
    } catch (fsErr) {
      console.warn('Failed to read SDK package.json:', fsErr.message);
    }

    const modelsToTry = getModelsToTry();
    const configuredModel = process.env.GEMINI_MODEL || PRIMARY_MODEL;

    // 2. Perform connectivity check
    try {
      const connTest = await testGeminiConnectivity();
      res.status(200).json({
        success: true,
        data: {
          sdkVersion,
          activeModel: connTest.model,
          configuredModel,
          fallbackModels: FALLBACK_MODELS,
          allModelsChecked: modelsToTry,
          connection: {
            status: 'connected',
            checkedAt: connTest.checkedAt,
            response: connTest.response
          }
        }
      });
    } catch (connErr) {
      res.status(503).json({
        success: false,
        error: {
          message: 'Gemini connection check failed.',
          details: connErr.message,
          sdkVersion,
          activeModel: modelsToTry[0] || PRIMARY_MODEL,
          configuredModel,
          connection: {
            status: 'failed',
            error: connErr.message
          }
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/debug/ai-planner
router.get('/ai-planner', async (req, res, next) => {
  const mockPrompt = `You are an expert AI Study Planner. You are designing a personalised DAILY study plan for a student based on their actual course, chapter progress, study logs, and exam dates.

STUDENT PROFILE:
- Name: Debug User
- Active Subjects: Operating Systems, Database Systems
- Upcoming Exams: Operating Systems: 10/25/2026, Database Systems: 11/15/2026
- Total study time historically: 12 hours
- Current streak: 3 days
- Study consistency: 80% (last 30 days)

INCOMPLETE CHAPTERS (Focus on these):
- [Operating Systems] Process Scheduling
- [Operating Systems] Memory Management
- [Database Systems] Normalization
- [Database Systems] Indexing

INSTRUCTIONS:
Generate a personalized Daily Study Plan (specifically for today) to help this student progress on their syllabus. Pick 2-3 specific incomplete chapters from the list above and assign study durations.

Return ONLY valid JSON.
Do not include:
- Markdown
- Explanations
- Notes
- Code blocks
- Triple backticks

The JSON response MUST match this exact schema format:
{
  "dailyPlan": [
    {
      "subject": "Subject name",
      "chapter": "Chapter name",
      "duration": 45,
      "reason": "Clear explanation of why this chapter is recommended today (e.g. lagging behind or has exam coming up)"
    }
  ],
  "weeklyPlan": [],
  "recommendations": [
    "A concise daily focus tip",
    "Priority Subject 1",
    "Priority Chapter 1"
  ]
}

Requirements:
- Plan must specify actual subjects and chapters from the student's incomplete list.
- Keep durations realistic (between 15 and 90 minutes).
- Return ONLY the raw JSON object, nothing else.`;

  try {
    const { generateGeminiText } = require('../services/gemini.service');
    const { parseAndNormalizePlannerResponse } = require('../utils/plannerParser');

    const result = await generateGeminiText({
      contents: mockPrompt,
      config: { maxOutputTokens: 1024 }
    });
    const rawResponse = result.text;
    
    const parsedRes = parseAndNormalizePlannerResponse(rawResponse, 'daily');
    
    res.status(200).json({
      success: true,
      data: {
        rawResponse,
        parsedResponse: parsedRes.parsed,
        validationStatus: parsedRes.validationStatus
      }
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Failed to test AI Planner in debug endpoint.',
        details: err.message
      }
    });
  }
});

module.exports = router;
