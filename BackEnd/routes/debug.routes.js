'use strict';

const express = require('express');
const router  = express.Router();
const User    = require('../models/User');

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
    const count = await User.countDocuments();
    const users = await User.find({}, 'email name createdAt').lean();
    res.status(200).json({
      success: true,
      data: {
        count,
        users: users.map(u => ({
          name: u.name,
          email: u.email,
          createdAt: u.createdAt
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/debug/clear-users
router.delete('/clear-users', async (req, res, next) => {
  try {
    const result = await User.deleteMany({});
    res.status(200).json({
      success: true,
      data: {
        message: 'All registered users cleared successfully.',
        deletedCount: result.deletedCount
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
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
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
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
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

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
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

module.exports = router;
