'use strict';

const Session     = require('../models/Session');
const Achievement = require('../models/Achievement');

/**
 * checkAndUnlockAchievements
 * Called after every new session is saved.
 * Checks all achievement conditions and awards any newly earned ones.
 * Uses upsert-style insert so duplicate awards are silently ignored.
 *
 * @param {string} userId - the user's MongoDB ObjectId
 */
const checkAndUnlockAchievements = async (userId) => {
  try {
    const toUnlock = [];

    // ── Fetch data needed for checks ──────────────────────────────────────────
    const sessions = await Session.find({ userId });

    // ── Check 1: pomodoro-initiate (any session >= 25 mins) ───────────────────
    const hasPomodoro = sessions.some((s) => s.duration >= 25);
    if (hasPomodoro) toUnlock.push('pomodoro-initiate');

    // ── Check 2: quantum-leap (any session >= 120 mins) ───────────────────────
    const hasQuantumLeap = sessions.some((s) => s.duration >= 120);
    if (hasQuantumLeap) toUnlock.push('quantum-leap');

    // ── Check 3: omniscient-mind (>= 5 distinct subjects) ─────────────────────
    const uniqueSubjects = new Set(sessions.map((s) => s.subject.toLowerCase().trim()));
    if (uniqueSubjects.size >= 5) toUnlock.push('omniscient-mind');

    // ── Check 4: consistency-king (7 consecutive days) ────────────────────────
    const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
    if (uniqueDates.length >= 7) {
      let streak = 1;
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const curr = new Date(uniqueDates[i]);
        const prev = new Date(uniqueDates[i + 1]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
          if (streak >= 7) {
            toUnlock.push('consistency-king');
            break;
          }
        } else {
          streak = 1;
        }
      }
    }

    // ── Persist newly earned achievements (ignore duplicates via unique index) ─
    const inserts = toUnlock.map((slug) =>
      Achievement.updateOne(
        { userId, slug },
        { $setOnInsert: { userId, slug } },
        { upsert: true }
      )
    );
    await Promise.all(inserts);
  } catch (err) {
    // Don't fail the main request if achievement check errors
    console.error('Achievement check error:', err.message);
  }
};

module.exports = { checkAndUnlockAchievements };
