'use strict';

const { body } = require('express-validator');

const emailValidator = body('email')
  .trim()
  .notEmpty().withMessage('Email is required.')
  .isEmail().withMessage('Please enter a valid email address.')
  .normalizeEmail();

const otpValidator = body('otp')
  .trim()
  .notEmpty().withMessage('Verification code is required.')
  .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits.')
  .isNumeric().withMessage('Verification code must contain only numbers.');

const purposeValidator = body('purpose')
  .optional()
  .isIn(['email_verification', 'password_reset'])
  .withMessage('Invalid OTP purpose.');

const registerValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 60 }).withMessage('Name cannot exceed 60 characters.'),
  emailValidator,
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must include a number.')
    .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/).withMessage('Password must include a special character.'),
];

const loginValidators = [
  emailValidator,
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordValidators = [emailValidator];

const sendOtpValidators = [emailValidator, purposeValidator];

const verifyOtpValidators = [emailValidator, otpValidator, purposeValidator];

const resendOtpValidators = [emailValidator, purposeValidator];

const resetPasswordValidators = [
  emailValidator,
  otpValidator,
  body('newPassword')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must include a number.')
    .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/).withMessage('Password must include a special character.'),
];

module.exports = {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  sendOtpValidators,
  verifyOtpValidators,
  resendOtpValidators,
  resetPasswordValidators,
};
