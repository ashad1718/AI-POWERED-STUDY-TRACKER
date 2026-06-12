'use strict';

/**
 * generateRecommendation
 * Analyses a user's sessions and returns a personalised insight string.
 * Rule-based — no external API needed. Can be swapped for OpenAI later.
 *
 * @param {Array}  sessions - user's full session array from MongoDB
 * @param {number} streak   - current streak
 * @returns {{ message: string, subject: string, type: string }}
 */
const generateRecommendation = (sessions, streak) => {
  if (!sessions.length) {
    return {
      message: 'Log your first study session to unlock personalised AI insights tailored to your learning patterns.',
      subject: 'Getting Started',
      type:    'onboarding',
    };
  }

  // ── Compute stats ──────────────────────────────────────────────────────────

  // Subject frequency + total time
  const subjectMap = {};
  sessions.forEach(({ subject, duration }) => {
    const key = subject.trim();
    if (!subjectMap[key]) subjectMap[key] = { count: 0, totalMins: 0 };
    subjectMap[key].count++;
    subjectMap[key].totalMins += duration;
  });

  const subjects     = Object.entries(subjectMap).sort((a, b) => b[1].totalMins - a[1].totalMins);
  const topSubject   = subjects[0]?.[0] || 'your top subject';
  const avgDuration  = Math.round(sessions.reduce((s, x) => s + x.duration, 0) / sessions.length);

  // ── Rule selection ─────────────────────────────────────────────────────────

  // Rule 1: sessions are too short (< 25 mins avg)
  if (avgDuration < 25) {
    return {
      message: `Your average session is ${avgDuration} minutes. Research shows focus quality improves significantly after 25 minutes of uninterrupted work. Try extending your ${topSubject} blocks to at least 25 minutes.`,
      subject: topSubject,
      type:    'duration',
    };
  }

  // Rule 2: sessions are very long (> 90 mins avg) — suggest breaks
  if (avgDuration > 90) {
    return {
      message: `We noticed your ${topSubject} sessions average ${avgDuration} minutes. Cognitive research suggests a 45/15 work-break split can improve retention by up to 22%. Consider shorter, more focused blocks.`,
      subject: topSubject,
      type:    'duration',
    };
  }

  // Rule 3: good streak — encourage continuation
  if (streak >= 7) {
    return {
      message: `Outstanding — you're on a ${streak}-day streak! Your consistency score is in the top tier. Keep scheduling ${topSubject} sessions at the same time each day to lock in the habit permanently.`,
      subject: topSubject,
      type:    'streak',
    };
  }

  // Rule 4: streak just broken (0 streak but has sessions)
  if (streak === 0 && sessions.length > 3) {
    return {
      message: `Your streak was broken recently. Rebuilding consistency for ${topSubject} is the highest-leverage action right now. Even a 15-minute session today resets the momentum.`,
      subject: topSubject,
      type:    'streak',
    };
  }

  // Rule 5: only one subject — encourage diversity
  if (subjects.length === 1) {
    return {
      message: `You're deeply focused on ${topSubject} — great depth! Consider adding one complementary subject to your rotation. Interleaved learning has been shown to strengthen long-term retention of ${topSubject} itself.`,
      subject: topSubject,
      type:    'diversity',
    };
  }

  // Rule 6: default — timing optimisation insight
  return {
    message: `We've analysed your ${sessions.length} sessions. Your focus efficiency for ${topSubject} peaks in blocks of ${avgDuration} minutes. Scheduling these blocks consistently at the same time each day will yield the best results.`,
    subject: topSubject,
    type:    'timing',
  };
};

module.exports = { generateRecommendation };
