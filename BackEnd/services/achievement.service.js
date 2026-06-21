'use strict';

const Session = require('../models/Session');
const Achievement = require('../models/Achievement');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const User = require('../models/User');
const { calculateStreakStats } = require('./streak.service');

/**
 * checkAndUnlockAchievements
 * Called after every new session is saved or a chapter is completed.
 * Checks all achievement conditions and awards any newly earned ones.
 * Uses upsert-style insert so duplicate awards are silently ignored.
 *
 * @param {string} userId - the user's MongoDB ObjectId
 */
const checkAndUnlockAchievements = async (userId) => {
  try {
    // 1. Get already earned achievements
    const earned = await Achievement.find({ userId }).select('slug').lean();
    const earnedSlugs = new Set(earned.map((a) => a.slug));

    const toUnlock = [];

    // If everything is already unlocked, exit early
    if (earnedSlugs.size === 10) return;

    // 2. Fetch sessions if we need them for any check
    let sessions = null;
    const needsSessions = [
      'first-session',
      '7-day-streak',
      '30-day-streak',
      '100-hours-studied',
      '250-hours-studied',
      '500-hours-studied',
      'ai-planner-follower'
    ].some(slug => !earnedSlugs.has(slug));

    if (needsSessions) {
      sessions = await Session.find({ userId }).lean();
    }

    // Check 1: first-session
    if (!earnedSlugs.has('first-session') && sessions && sessions.length >= 1) {
      toUnlock.push('first-session');
    }

    // Check 2: first-chapter-completed
    if (!earnedSlugs.has('first-chapter-completed')) {
      const completedChaptersCount = await Chapter.countDocuments({
        userId,
        completed: true,
        isDeleted: false,
      });
      if (completedChaptersCount >= 1) {
        toUnlock.push('first-chapter-completed');
      }
    }

    // Check 3: first-subject-completed & Check 9: completed-semester
    const needsSubjectsOrChapters = [
      'first-subject-completed',
      'completed-semester'
    ].some(slug => !earnedSlugs.has(slug));

    if (needsSubjectsOrChapters) {
      const subjects = await Subject.find({ userId, isDeleted: false }).lean();
      const chapters = await Chapter.find({ userId, isDeleted: false }).lean();

      // Check 3: first-subject-completed
      if (!earnedSlugs.has('first-subject-completed')) {
        let hasCompletedSubject = false;
        for (const sub of subjects) {
          const subChaps = chapters.filter(c => c.subjectId.toString() === sub._id.toString());
          if (subChaps.length > 0 && subChaps.every(c => c.completed)) {
            hasCompletedSubject = true;
            break;
          }
        }
        if (hasCompletedSubject) {
          toUnlock.push('first-subject-completed');
        }
      }

      // Check 9: completed-semester (all chapters of active subjects are completed)
      if (!earnedSlugs.has('completed-semester')) {
        const activeSubjects = subjects.filter(s => s.active && !s.isArchived);
        if (activeSubjects.length > 0) {
          const activeSubIds = new Set(activeSubjects.map(s => s._id.toString()));
          const activeChapters = chapters.filter(c => activeSubIds.has(c.subjectId.toString()));
          
          const isSemesterCompleted = activeChapters.length > 0 && activeChapters.every(c => c.completed);
          if (isSemesterCompleted) {
            toUnlock.push('completed-semester');
          }
        }
      }
    }

    // Check 4 & 5: Streaks (7-day and 30-day)
    const needsStreaks = ['7-day-streak', '30-day-streak'].some(slug => !earnedSlugs.has(slug));
    if (needsStreaks && sessions && sessions.length > 0) {
      const streakStats = calculateStreakStats(sessions);
      if (!earnedSlugs.has('7-day-streak') && streakStats.longestStreak >= 7) {
        toUnlock.push('7-day-streak');
      }
      if (!earnedSlugs.has('30-day-streak') && streakStats.longestStreak >= 30) {
        toUnlock.push('30-day-streak');
      }
    }

    // Check 6, 7 & 8: Accumulated Hours (100h, 250h, 500h)
    const needsHours = [
      '100-hours-studied',
      '250-hours-studied',
      '500-hours-studied'
    ].some(slug => !earnedSlugs.has(slug));

    if (needsHours && sessions && sessions.length > 0) {
      const totalMins = sessions.reduce((sum, s) => sum + s.duration, 0);
      const totalHours = totalMins / 60;
      if (!earnedSlugs.has('100-hours-studied') && totalHours >= 100) {
        toUnlock.push('100-hours-studied');
      }
      if (!earnedSlugs.has('250-hours-studied') && totalHours >= 250) {
        toUnlock.push('250-hours-studied');
      }
      if (!earnedSlugs.has('500-hours-studied') && totalHours >= 500) {
        toUnlock.push('500-hours-studied');
      }
    }

    // Check 10: ai-planner-follower
    if (!earnedSlugs.has('ai-planner-follower') && sessions && sessions.length >= 1) {
      const user = await User.findById(userId).select('hasUsedPlanner').lean();
      if (user && user.hasUsedPlanner) {
        toUnlock.push('ai-planner-follower');
      }
    }

    // 3. Persist newly earned achievements (set notified: false)
    if (toUnlock.length > 0) {
      const inserts = toUnlock.map((slug) =>
        Achievement.updateOne(
          { userId, slug },
          { $setOnInsert: { userId, slug, notified: false } },
          { upsert: true }
        )
      );
      await Promise.all(inserts);
      console.log(`[ACHIEVEMENTS] Unlocked for user ${userId}: ${toUnlock.join(', ')}`);
    }
  } catch (err) {
    console.error('Achievement check error:', err.message);
  }
};

module.exports = { checkAndUnlockAchievements };

