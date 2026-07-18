'use strict';

const { prisma } = require('../config/prisma');
const { ACHIEVEMENT_DEFINITIONS } = require('../config/achievements');
const asyncHandler       = require('../utils/asyncHandler');

// GET /api/v1/achievements
exports.getAchievements = asyncHandler(async (req, res) => {
  const earned      = await prisma.achievement.findMany({
    where: { userId: req.user.id },
  });
  const earnedSlugs = new Map(earned.map((a) => [a.slug, a.createdAt]));

  const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    ...def,
    earned:   earnedSlugs.has(def.slug),
    earnedAt: earnedSlugs.get(def.slug) || null,
  }));

  // Identify unnotified achievements
  const unnotified = earned.filter((a) => a.notified === false);

  if (unnotified.length > 0) {
    await prisma.achievement.updateMany({
      where: {
        id: { in: unnotified.map((a) => a.id) },
      },
      data: { notified: true },
    });
  }

  const newlyUnlocked = unnotified.map((a) => {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.slug === a.slug);
    return {
      slug: a.slug,
      name: def?.name || a.slug,
      desc: def?.desc || '',
      level: def?.level || 'bronze',
    };
  });

  res.status(200).json({
    success: true,
    data: {
      achievements,
      newlyUnlocked,
    },
  });
});
