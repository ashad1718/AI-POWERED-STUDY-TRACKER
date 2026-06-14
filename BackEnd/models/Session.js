'use strict';

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      index: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      index: true,
    },
    chapter: {
      type: String,
      trim: true,
      maxlength: [150, 'Chapter name cannot exceed 150 characters'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [1440, 'Duration cannot exceed 1440 minutes (24 hours)'],
    },
    date: {
      type: String, // stored as "YYYY-MM-DD" to match frontend exactly
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast dashboard queries (user's sessions by date desc)
sessionSchema.index({ userId: 1, date: -1 });
// Index for subject breakdown aggregation
sessionSchema.index({ userId: 1, subject: 1 });

module.exports = mongoose.model('Session', sessionSchema);
