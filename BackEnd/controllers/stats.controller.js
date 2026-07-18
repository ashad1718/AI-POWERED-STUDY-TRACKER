'use strict';

const { prisma } = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { calculateConsistencyScore, calculateStreakStats } = require('../services/streak.service');
const { getWeekDays, DAY_NAMES }                     = require('../utils/dateHelpers');

// ─── GET /api/v1/stats/overview ───────────────────────────────────────────────
exports.getOverview = asyncHandler(async (req, res) => {
  console.log('[DASHBOARD] Analytics refreshed');
  const sessions = await prisma.session.findMany({
    where: { userId: req.user.id },
  });
  console.log('[ANALYTICS] Sessions Found:', sessions.length);

  const totalMinutes       = sessions.reduce((s, x) => s + x.duration, 0);
  const totalSessions      = sessions.length;
  const averageSessionLen  = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;
  const subjectCount       = new Set(sessions.map((s) => s.subject.toLowerCase().trim())).size;

  // Streak & Consistency
  const allDates    = sessions.map((s) => s.date);
  const streakStats = calculateStreakStats(sessions);
  const consistency = calculateConsistencyScore(allDates);

  res.status(200).json({
    success: true,
    data: {
      totalMinutes,
      totalSessions,
      averageSessionLength: averageSessionLen,
      subjectCount,
      currentStreak:    streakStats.currentStreak,
      longestStreak:    streakStats.longestStreak,
      totalActiveDays:  streakStats.totalActiveDays,
      consistencyScore: consistency,
    },
  });
});

// ─── GET /api/v1/stats/weekly ─────────────────────────────────────────────────
exports.getWeekly = asyncHandler(async (req, res) => {
  console.log('[DASHBOARD] Analytics refreshed');
  
  // Support ?week=YYYY-MM-DD to query a specific week; defaults to current week
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
  const sessions = await prisma.session.findMany({
    where: {
      userId: req.user.id,
      date: { gte: weekDays[0], lte: weekDays[6] },
    },
  });
  console.log('[ANALYTICS] Sessions Found:', sessions.length);

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
  console.log('[ANALYTICS] Weekly Data Generated:', JSON.stringify(weeklyData));

  res.status(200).json({ success: true, data: { weeklyData } });
});

// ─── GET /api/v1/stats/subjects ───────────────────────────────────────────────
exports.getSubjects = asyncHandler(async (req, res) => {
  console.log('[DASHBOARD] Analytics refreshed');
  
  // Prisma aggregation: group by subject, sum durations
  const results = await prisma.session.groupBy({
    by: ['subject'],
    where: { userId: req.user.id },
    _sum: {
      duration: true,
    },
  });
  console.log('[ANALYTICS] Subjects Found:', results.length);

  const mappedResults = results.map(r => ({
    name: r.subject,
    totalMins: r._sum.duration || 0,
  })).sort((a, b) => b.totalMins - a.totalMins);

  const pieData = mappedResults.map(({ name, totalMins }) => ({
    name,
    value: Math.round((totalMins / 60) * 10) / 10, // hours, 1dp
  }));
  console.log('[ANALYTICS] Subject Breakdown Generated:', JSON.stringify(pieData));

  res.status(200).json({ success: true, data: { pieData } });
});

// ─── GET /api/v1/stats/heatmap ──────────────────────────────────────────────────
exports.getHeatmap = asyncHandler(async (req, res) => {
  const today = new Date();
  const date365Ago = new Date();
  date365Ago.setDate(today.getDate() - 365);
  const date365AgoStr = date365Ago.toISOString().split('T')[0];

  // Fetch all sessions in the last 365 days
  const sessions = await prisma.session.findMany({
    where: {
      userId: req.user.id,
      date: { gte: date365AgoStr },
    },
    select: {
      date: true,
      duration: true,
    },
  });

  // Group by date -> sum minutes
  const dayMap = {};
  sessions.forEach((s) => {
    if (!dayMap[s.date]) {
      dayMap[s.date] = { minutes: 0, completedChapters: 0 };
    }
    dayMap[s.date].minutes += s.duration;
  });

  // Fetch all chapters completed in the last 365 days
  const chapters = await prisma.chapter.findMany({
    where: {
      userId: req.user.id,
      completed: true,
      isDeleted: false,
      updatedAt: { gte: date365Ago },
    },
    select: {
      updatedAt: true,
    },
  });

  chapters.forEach((c) => {
    const dateStr = c.updatedAt.toISOString().split('T')[0];
    if (!dayMap[dateStr]) {
      dayMap[dateStr] = { minutes: 0, completedChapters: 0 };
    }
    dayMap[dateStr].completedChapters += 1;
  });

  res.status(200).json({ success: true, data: dayMap });
});
