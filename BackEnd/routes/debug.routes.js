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

module.exports = router;
