'use strict';

const Achievement        = require('../models/Achievement');
const { ACHIEVEMENT_DEFINITIONS } = require('../models/Achievement');
const asyncHandler       = require('../utils/asyncHandler');

// GET /api/v1/achievements
exports.getAchievements = asyncHandler(async (req, res) => {
  const earned      = await Achievement.find({ userId: req.user.id });
  const earnedSlugs = new Map(earned.map((a) => [a.slug, a.createdAt]));

  const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    ...def,
    earned:   earnedSlugs.has(def.slug),
    earnedAt: earnedSlugs.get(def.slug) || null,
  }));

  res.status(200).json({ success: true, data: { achievements } });
});
