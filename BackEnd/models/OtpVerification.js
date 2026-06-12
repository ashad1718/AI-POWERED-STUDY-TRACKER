'use strict';

const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      default: 'email_verification',
      required: true,
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
    lastSentAt: {
      type: Date,
      default: null,
    },
    resendWindowStartedAt: {
      type: Date,
      default: null,
    },
    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

otpVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
