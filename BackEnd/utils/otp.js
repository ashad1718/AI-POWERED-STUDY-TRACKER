'use strict';

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');

const OTP_LENGTH = 6;
const OTP_SALT_ROUNDS = 10;

/**
 * Generate a cryptographically secure 6-digit OTP.
 * @returns {string}
 */
const generateOTP = () => {
  const otp = crypto.randomInt(0, 1_000_000);
  return otp.toString().padStart(OTP_LENGTH, '0');
};

/**
 * Hash OTP before storing in database.
 * @param {string} otp
 * @returns {Promise<string>}
 */
const hashOTP = async (otp) => bcrypt.hash(otp, OTP_SALT_ROUNDS);

/**
 * Compare plain OTP against stored hash.
 * @param {string} otp
 * @param {string} otpHash
 * @returns {Promise<boolean>}
 */
const compareOTP = async (otp, otpHash) => bcrypt.compare(otp, otpHash);

module.exports = {
  generateOTP,
  hashOTP,
  compareOTP,
  OTP_LENGTH,
};
