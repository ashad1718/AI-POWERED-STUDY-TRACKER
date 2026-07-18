'use strict';

const { prisma } = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { calculateStreak }        = require('../services/streak.service');
const { generateRecommendation } = require('../services/ai.service');

// ─── GET /api/v1/ai/recommendation ───────────────────────────────────────────
exports.getRecommendation = asyncHandler(async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user.id },
  });

  const allDates    = sessions.map((s) => s.date);
  const uniqueDates = [...new Set(allDates)].sort().reverse();
  const streak      = calculateStreak(uniqueDates);

  const recommendation = generateRecommendation(sessions, streak);

  res.status(200).json({ success: true, data: recommendation });
});
