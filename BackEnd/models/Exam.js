'use strict';

const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
  },
  {
    timestamps: true,
  }
);

// A user can only have one exam per subject
examSchema.index({ userId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('Exam', examSchema);
