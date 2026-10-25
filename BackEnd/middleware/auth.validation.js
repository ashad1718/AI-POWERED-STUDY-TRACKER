'use strict';

const { body } = require('express-validator');
const { assertStrongPassword } = require('../utils/passwordValidation');

const stringBody = (field, label) => body(field)
  .isString().withMessage(`${label} must be a string.`)
  .bail();

const emailValidator = stringBody('email', 'Email')
  .trim()
  .notEmpty().withMessage('Email is required.')
  .isEmail().withMessage('Please enter a valid email address.');

const otpValidator = stringBody('otp', 'Verification code')
  .trim()
  .notEmpty().withMessage('Verification code is required.')
  .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits.')
  .isNumeric().withMessage('Verification code must contain only numbers.')
  .matches(/^\d{6}$/).withMessage('Verification code must contain only ASCII digits.');

const purposeValidator = body('purpose')
  .optional({ values: 'undefined' })
  .isString().withMessage('OTP purpose must be a string.')
  .isIn(['email_verification', 'password_reset'])
  .withMessage('Invalid OTP purpose.');

const strongPasswordValidator = (field, label) => stringBody(field, label)
  .custom((value) => {
    assertStrongPassword(value, label);
    return true;
  });

const currentPasswordValidator = stringBody('currentPassword', 'Current password')
  .notEmpty().withMessage('Current password is required.');

const registerValidators = [
  stringBody('name', 'Name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 60 }).withMessage('Name cannot exceed 60 characters.'),
  emailValidator,
  strongPasswordValidator('password', 'Password'),
];

const loginValidators = [
  emailValidator,
  stringBody('password', 'Password')
    .notEmpty().withMessage('Password is required.'),
];

const forgotPasswordValidators = [emailValidator];

const sendOtpValidators = [emailValidator, purposeValidator];

const verifyOtpValidators = [emailValidator, otpValidator, purposeValidator];

const resendOtpValidators = [emailValidator, purposeValidator];

const resetPasswordValidators = [
  emailValidator,
  otpValidator,
  strongPasswordValidator('newPassword', 'New password'),
];

const updatePasswordValidators = [
  currentPasswordValidator,
  strongPasswordValidator('newPassword', 'New password'),
];

module.exports = {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  sendOtpValidators,
  verifyOtpValidators,
  resendOtpValidators,
  resetPasswordValidators,
  updatePasswordValidators,
};
