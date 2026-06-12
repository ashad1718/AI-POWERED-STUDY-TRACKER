'use strict';

const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
      select: false,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration time is required'],
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

passwordResetSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
