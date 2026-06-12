'use strict';

const AppError = require('./AppError');

const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
};

const PASSWORD_REQUIREMENTS = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'uppercase', label: 'One uppercase letter' },
  { key: 'lowercase', label: 'One lowercase letter' },
  { key: 'number', label: 'One number' },
  { key: 'special', label: 'One special character' },
];

/**
 * Check individual password requirements.
 * @param {string} password
 * @returns {Record<string, boolean>}
 */
const checkPasswordRequirements = (password = '') => ({
  minLength: password.length >= PASSWORD_RULES.minLength,
  uppercase: PASSWORD_RULES.uppercase.test(password),
  lowercase: PASSWORD_RULES.lowercase.test(password),
  number:    PASSWORD_RULES.number.test(password),
  special:   PASSWORD_RULES.special.test(password),
});

/**
 * Returns true when all password rules pass.
 * @param {string} password
 * @returns {boolean}
 */
const isStrongPassword = (password = '') =>
  Object.values(checkPasswordRequirements(password)).every(Boolean);

/**
 * Throw AppError if password does not meet policy.
 * @param {string} password
 * @param {string} [fieldName='Password']
 */
const assertStrongPassword = (password, fieldName = 'Password') => {
  if (!password || typeof password !== 'string') {
    throw new AppError(`${fieldName} is required.`, 400, 'PASSWORD_REQUIRED');
  }

  if (password.length > PASSWORD_RULES.maxLength) {
    throw new AppError(`${fieldName} must not exceed ${PASSWORD_RULES.maxLength} characters.`, 400, 'PASSWORD_TOO_LONG');
  }

  const checks = checkPasswordRequirements(password);
  const failed = PASSWORD_REQUIREMENTS.filter(({ key }) => !checks[key]);

  if (failed.length > 0) {
    throw new AppError(
      `${fieldName} must include uppercase, lowercase, a number, and a special character (minimum 8 characters).`,
      400,
      'WEAK_PASSWORD'
    );
  }
};

module.exports = {
  PASSWORD_RULES,
  PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
  isStrongPassword,
  assertStrongPassword,
};
