'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/auth.controller');
const { protect }= require('../middleware/auth.middleware');
const { authLimiter, logAuthRateLimit } = require('../middleware/rateLimiter.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  verifyOtpValidators,
  resendOtpValidators,
  resetPasswordValidators,
} = require('../middleware/auth.validation');

router.post('/register', authLimiter, logAuthRateLimit, registerValidators, validateRequest, controller.register);
router.post('/login',    authLimiter, logAuthRateLimit, loginValidators, validateRequest, controller.login);
router.post('/logout',   protect, controller.logout);
router.post('/refresh',  controller.refresh);
router.get('/me',        protect, controller.getMe);

router.post('/forgot-password', authLimiter, logAuthRateLimit, forgotPasswordValidators, validateRequest, controller.forgotPassword);
router.post('/verify-otp',      authLimiter, logAuthRateLimit, verifyOtpValidators, validateRequest, controller.verifyOtp);
router.post('/resend-otp',      authLimiter, logAuthRateLimit, resendOtpValidators, validateRequest, controller.resendOtp);
router.post('/reset-password',  authLimiter, logAuthRateLimit, resetPasswordValidators, validateRequest, controller.resetPassword);

module.exports = router;
