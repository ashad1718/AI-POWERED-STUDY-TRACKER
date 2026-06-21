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

/**
 * calculateStreakStats
 * Calculates current streak, longest streak, and total active days where total study duration >= 15 mins.
 * 
 * @param {Array} sessions - session documents with date and duration
 * @returns {Object} { currentStreak, longestStreak, totalActiveDays }
 */
const calculateStreakStats = (sessions) => {
  if (!sessions || !sessions.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
    };
  }

  // Group durations by date
  const dateMap = {};
  sessions.forEach((s) => {
    const dStr = s.date;
    dateMap[dStr] = (dateMap[dStr] || 0) + s.duration;
  });

  // Filter dates >= 15 minutes of study
  const activeDates = Object.keys(dateMap)
    .filter((dStr) => dateMap[dStr] >= 15)
    .sort((a, b) => b.localeCompare(a)); // DESC sorting

  if (!activeDates.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
    };
  }

  const today = todayString();
  const yesterday = toDateString(subtractDays(new Date(), 1));

  let currentStreak = 0;
  if (activeDates[0] === today || activeDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 0; i < activeDates.length - 1; i++) {
      const curr = new Date(activeDates[i]);
      const prev = new Date(activeDates[i + 1]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  const sortedAsc = [...activeDates].sort((a, b) => a.localeCompare(b));
  let longestStreak = 0;
  let currentRun = 0;

  if (sortedAsc.length > 0) {
    currentRun = 1;
    longestStreak = 1;
    for (let i = 0; i < sortedAsc.length - 1; i++) {
      const curr = new Date(sortedAsc[i]);
      const next = new Date(sortedAsc[i + 1]);
      const diffDays = Math.round((next - curr) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        if (currentRun > longestStreak) {
          longestStreak = currentRun;
        }
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: activeDates.length,
  };
};

module.exports = { calculateStreak, calculateConsistencyScore, calculateStreakStats };

