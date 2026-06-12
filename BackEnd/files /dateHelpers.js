'use strict';

/**
 * dateHelpers.js
 * Utility functions for date manipulation used in stats and streak calculations.
 * All dates are handled as "YYYY-MM-DD" strings to match the frontend format.
 */

/**
 * Returns today's date as a "YYYY-MM-DD" string (local time).
 * @returns {string}
 */
const todayString = () => {
  const d = new Date();
  return toDateString(d);
};

/**
 * Converts a Date object to "YYYY-MM-DD" string.
 * @param {Date} date
 * @returns {string}
 */
const toDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Subtracts N days from a date and returns a new Date.
 * @param {Date} date
 * @param {number} n
 * @returns {Date}
 */
const subtractDays = (date, n) => {
  const result = new Date(date);
  result.setDate(result.getDate() - n);
  return result;
};

/**
 * Returns an array of "YYYY-MM-DD" strings for each day
 * of the ISO week that contains the given date.
 * Week starts on Monday.
 *
 * @param {Date} [date=new Date()]
 * @returns {string[]}  Array of 7 strings: ["Mon date", ..., "Sun date"]
 */
const getWeekDays = (date = new Date()) => {
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ...
  // Adjust so week starts on Monday (ISO week)
  const diffToMonday = (day === 0) ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(toDateString(d));
  }
  return days;
};

/**
 * Returns the start and end dates (as Date objects) of the last N days,
 * inclusive of today.
 * Used for streak consistency score (last 30 days).
 *
 * @param {number} n
 * @returns {{ start: Date, end: Date }}
 */
const lastNDaysRange = (n) => {
  const end = new Date();
  const start = subtractDays(end, n - 1);
  // Zero out time so date comparison is day-accurate
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Converts a "YYYY-MM-DD" string to a Date object at midnight UTC.
 * @param {string} dateStr
 * @returns {Date}
 */
const parseDateString = (dateStr) => {
  return new Date(`${dateStr}T00:00:00.000Z`);
};

/**
 * Short day names for the weekly chart (Mon–Sun).
 */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

module.exports = {
  todayString,
  toDateString,
  subtractDays,
  getWeekDays,
  lastNDaysRange,
  parseDateString,
  DAY_NAMES,
};
