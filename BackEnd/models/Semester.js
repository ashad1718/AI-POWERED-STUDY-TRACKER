'use strict';

const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
      maxlength: [100, 'Semester name cannot exceed 100 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    expectedHoursPerWeek: {
      type: Number,
      required: [true, 'Expected study hours per week is required'],
      min: [0.1, 'Expected study hours per week must be at least 0.1 hours'],
    },
    goalGPA: {
      type: Number,
      min: [0.0, 'Goal GPA must be at least 0.0'],
      max: [10.0, 'Goal GPA cannot exceed 10.0'], // supports both 4.0 and 10.0 GPA systems
    },
    active: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

semesterSchema.index({ userId: 1, active: 1, isDeleted: 1 });

module.exports = mongoose.model('Semester', semesterSchema);
