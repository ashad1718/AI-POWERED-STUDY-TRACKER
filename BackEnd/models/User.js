'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries unless explicitly requested
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    hasUsedPlanner: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// ─── Pre-save Hook: Hash password before saving ───────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash if password was modified (not on other updates like name)
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Method: Compare plain password against hash ─────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Safe public representation (no password/token) ──────────
userSchema.methods.toPublicJSON = function () {
  return {
    id:               this._id,
    name:             this.name,
    email:            this.email,
    location:         this.location,
    avatarUrl:        this.avatarUrl,
    twoFactorEnabled: this.twoFactorEnabled,
    createdAt:        this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
