'use strict';

const mongoose     = require('mongoose');
const Session      = require('../models/Session');
const asyncHandler = require('../utils/asyncHandler');
const { calculateStreak, calculateConsistencyScore } = require('../services/streak.service');
const { getWeekDays, DAY_NAMES }                     = require('../utils/dateHelpers');

// ─── GET /api/v1/stats/overview ───────────────────────────────────────────────
exports.getOverview = asyncHandler(async (req, res) => {
  console.log('[DASHBOARD] Analytics refreshed');
  const sessions = await Session.find({ userId: req.user.id });
  console.log(`[ANALYTICS] Sessions found: ${sessions.length}`);

  const totalMinutes       = sessions.reduce((s, x) => s + x.duration, 0);
  const totalSessions      = sessions.length;
  const averageSessionLen  = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;
  const subjectCount       = new Set(sessions.map((s) => s.subject.toLowerCase().trim())).size;

  // Streak — needs sorted unique dates descending
  const allDates    = sessions.map((s) => s.date);
  const uniqueDates = [...new Set(allDates)].sort().reverse();
  const streak      = calculateStreak(uniqueDates);
  const consistency = calculateConsistencyScore(allDates);

  res.status(200).json({
    success: true,
    data: {
      totalMinutes,
      totalSessions,
      averageSessionLength: averageSessionLen,
      subjectCount,
      currentStreak:    streak,
      consistencyScore: consistency,
    },
  });
});

// ─── GET /api/v1/stats/weekly ─────────────────────────────────────────────────
exports.getWeekly = asyncHandler(async (req, res) => {
  console.log('[DASHBOARD] Analytics refreshed');
  
  // Support ?week=YYYY-MM-DD to query a specific week; defaults to current week
  // Timezone-safe local parsing:
  const parseLocalWeek = (weekStr) => {
    if (!weekStr) return new Date();
    const parts = weekStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(weekStr);
  };

  const weekStart = parseLocalWeek(req.query.week);
  const weekDays  = getWeekDays(weekStart); // ["2026-06-02", ..., "2026-06-08"]

  // Fetch all sessions in this date range
  const sessions = await Session.find({
    userId: req.user.id,
    date:   { $gte: weekDays[0], $lte: weekDays[6] },
  });
  console.log(`[ANALYTICS] Sessions found: ${sessions.length}`);

  // Map sessions to total hours per day
  const dayTotals = {};
  sessions.forEach(({ date, duration }) => {
    dayTotals[date] = (dayTotals[date] || 0) + duration;
  });

  // Build the 7-item array the frontend AreaChart expects
  const weeklyData = weekDays.map((dateStr, i) => ({
    name:  DAY_NAMES[i],
    hours: Math.round(((dayTotals[dateStr] || 0) / 60) * 10) / 10, // minutes → hours, 1dp
  }));
  console.log('[ANALYTICS] Weekly hours calculated');

  res.status(200).json({ success: true, data: { weeklyData } });
});

// ─── GET /api/v1/stats/subjects ───────────────────────────────────────────────
exports.getSubjects = asyncHandler(async (req, res) => {
  console.log('[DASHBOARD] Analytics refreshed');
  // MongoDB aggregation: group by subject, sum durations
  const results = await Session.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
    {
      $group: {
        _id:        { $toLower: '$subject' },
        name:       { $first: '$subject' },
        totalMins:  { $sum: '$duration' },
      },
    },
    { $sort: { totalMins: -1 } },
  ]);
  console.log(`[ANALYTICS] Subjects found: ${results.length}`);

  const pieData = results.map(({ name, totalMins }) => ({
    name,
    value: Math.round((totalMins / 60) * 10) / 10, // hours, 1dp
  }));

  res.status(200).json({ success: true, data: { pieData } });
});
