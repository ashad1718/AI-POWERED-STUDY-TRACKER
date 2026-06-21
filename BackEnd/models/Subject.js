'use strict';

const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    completionThreshold: {
      sessions: {
        type: Number,
        default: 3,
        min: [1, 'Threshold must require at least 1 session'],
      },
      hours: {
        type: Number,
        default: 5,
        min: [0.1, 'Threshold must require at least 0.1 hours'],
      },
    },
    completionRule: {
      type: String,
      enum: ['first_session', 'sixty_minutes', 'custom_threshold'],
      default: 'first_session',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for sorting/filtering
subjectSchema.index({ userId: 1, active: 1, isArchived: 1, isDeleted: 1, order: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
