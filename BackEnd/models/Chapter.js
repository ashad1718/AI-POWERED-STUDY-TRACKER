'use strict';

const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Chapter name is required'],
      trim: true,
      maxlength: [150, 'Chapter name cannot exceed 150 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedMethod: {
      type: String,
      enum: ['manual', 'auto', 'none'],
      default: 'none',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for sorting/filtering
chapterSchema.index({ userId: 1, subjectId: 1, isDeleted: 1, order: 1 });

module.exports = mongoose.model('Chapter', chapterSchema);
