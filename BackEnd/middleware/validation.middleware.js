'use strict';

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Reject fields that are not part of a route's public input contract.
 * This is intentionally separate from express-validator field chains so it
 * also covers protected fields that a controller would otherwise ignore.
 */
const rejectUnknownFields = (location, allowedFields, { requireOne = false } = {}) => {
  const allowed = new Set(allowedFields);

  return (req, res, next) => {
    const value = req[location];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return next(new AppError(`Request ${location} must be an object.`, 400, 'VALIDATION_ERROR'));
    }

    const unknownFields = Object.keys(value).filter((field) => !allowed.has(field));
    if (unknownFields.length > 0) {
      return next(new AppError(
        `Unexpected field(s): ${unknownFields.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      ));
    }

    if (requireOne && Object.keys(value).length === 0) {
      return next(new AppError('At least one editable field is required.', 400, 'VALIDATION_ERROR'));
    }

    next();
  };
};

/**
 * Express middleware — run after express-validator chains.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const message = errors.array().map((err) => err.msg).join(' ');
    return next(new AppError(message, 400, 'VALIDATION_ERROR'));
  }

  next();
};

module.exports = { rejectUnknownFields, validateRequest };
