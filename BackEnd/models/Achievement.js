'use strict';

const mongoose = require('mongoose');

// All possible achievements defined here as a reference
const ACHIEVEMENT_DEFINITIONS = [
  {
    slug: 'pomodoro-initiate',
    name: 'Pomodoro Initiate',
    desc: 'Log your first 25-minute study block',
    icon: 'Clock',
    color: 'text-[#00E5FF]',
    bg:    'bg-[#00E5FF]/15',
  },
  {
    slug: 'consistency-king',
    name: 'Consistency King',
    desc: 'Maintain a study streak for 7 consecutive days',
    icon: 'Zap',
    color: 'text-[#6C63FF]',
    bg:    'bg-[#6C63FF]/15',
  },
  {
    slug: 'quantum-leap',
    name: 'Quantum Leap',
    desc: 'Log a study session for over 120 minutes',
    icon: 'Award',
    color: 'text-purple-400',
    bg:    'bg-purple-500/15',
  },
  {
    slug: 'omniscient-mind',
    name: 'Omniscient Mind',
    desc: 'Track more than 5 distinct courses',
    icon: 'Brain',
    color: 'text-pink-400',
    bg:    'bg-pink-500/15',
  },
];

const achievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slug: {
      type: String,
      required: true,
      enum: ACHIEVEMENT_DEFINITIONS.map((a) => a.slug),
    },
  },
  {
    timestamps: true,
  }
);

// Each user can earn each achievement only once
achievementSchema.index({ userId: 1, slug: 1 }, { unique: true });

const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement;
module.exports.ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_DEFINITIONS;
