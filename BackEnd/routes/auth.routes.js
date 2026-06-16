'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/auth.controller');
const { protect }= require('../middleware/auth.middleware');
const { authLimiter, logAuthRateLimit } = require('../middleware/rateLimiter.middleware');

router.post('/register', authLimiter, logAuthRateLimit, controller.register);
router.post('/login',    authLimiter, logAuthRateLimit, controller.login);
router.post('/logout',   protect, controller.logout);
router.post('/refresh',  controller.refresh);

module.exports = router;
