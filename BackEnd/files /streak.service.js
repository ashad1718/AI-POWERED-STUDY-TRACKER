'use strict';

const { todayString, subtractDays, toDateString } = require('../utils/dateHelpers');

/**
 * calculateStreak
 * Walks backward from today through a sorted set of session dates.
 *
 * @param {string[]} datesDesc - unique session dates "YYYY-MM-DD", sorted DESC
 * @returns {number} current streak in days
 */
const calculateStreak = (datesDesc) => {
  if (!datesDesc.length) return 0;

  const today     = todayString();
  const yesterday = toDateString(subtractDays(new Date(), 1));

  // Streak must start from today OR yesterday (if user hasn't studied yet today)
  if (datesDesc[0] !== today && datesDesc[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < datesDesc.length - 1; i++) {
    const curr = new Date(datesDesc[i]);
    const prev = new Date(datesDesc[i + 1]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break; // gap found — streak ends
    }
  }

  return streak;
};

/**
 * calculateConsistencyScore
 * Percentage of the last 30 days on which the user had at least one session.
 *
 * @param {string[]} allDates - all session dates (may have duplicates)
 * @returns {number} 0–100
 */
const calculateConsistencyScore = (allDates) => {
  const today    = new Date();
  const daySet   = new Set(allDates);
  let studyDays  = 0;

  for (let i = 0; i < 30; i++) {
    const d = toDateString(subtractDays(today, i));
    if (daySet.has(d)) studyDays++;
  }

  return Math.round((studyDays / 30) * 100);
};

module.exports = { calculateStreak, calculateConsistencyScore };
