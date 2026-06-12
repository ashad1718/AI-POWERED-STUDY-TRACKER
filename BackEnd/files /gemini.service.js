'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─────────────────────────────────────────────────────────────────────────────
// INITIALISATION
// Key is read once at startup — if missing, requests fail with a clear message.
// ─────────────────────────────────────────────────────────────────────────────
let genAI   = null;
let model   = null;

const initGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️  GEMINI_API_KEY not set — AI Coach endpoint will return 503');
    return false;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature:      0.7,   // balanced: creative but not hallucinating
      topP:             0.9,
      topK:             40,
      maxOutputTokens:  1024,  // enough for full structured response
    },
  });
  console.log(`✅ Gemini AI initialised (model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'})`);
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA ANALYSIS HELPERS
// Compute all statistics from raw session documents before building the prompt.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a comprehensive stats object from the user's session array.
 * @param {Array} sessions - Mongoose session documents
 * @returns {Object} analysed stats ready for the Gemini prompt
 */
const analyseStudyData = (sessions) => {
  if (!sessions.length) return null;

  const totalMinutes = sessions.reduce((s, x) => s + x.duration, 0);
  const totalHours   = parseFloat((totalMinutes / 60).toFixed(1));

  // ── Subject distribution ──────────────────────────────────────────────────
  const subjectMap = {};
  sessions.forEach(({ subject, duration }) => {
    const key = subject.trim();
    subjectMap[key] = (subjectMap[key] || 0) + duration;
  });

  const subjectDistribution = Object.entries(subjectMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, mins]) => ({
      name,
      hours:      parseFloat((mins / 60).toFixed(1)),
      percentage: Math.round((mins / totalMinutes) * 100),
    }));

  // ── Weekly activity (last 8 weeks) ───────────────────────────────────────
  const weekMap = {};
  sessions.forEach(({ date, duration }) => {
    const d     = new Date(date);
    const year  = d.getFullYear();
    const week  = getISOWeek(d);
    const key   = `${year}-W${String(week).padStart(2, '0')}`;
    weekMap[key] = (weekMap[key] || 0) + duration;
  });

  const weeklyTrend = Object.entries(weekMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, mins]) => ({
      week,
      hours: parseFloat((mins / 60).toFixed(1)),
    }));

  // ── Consistency (last 30 days) ────────────────────────────────────────────
  const today       = new Date();
  const dateSet     = new Set(sessions.map((s) => s.date));
  let   studyDays30 = 0;
  for (let i = 0; i < 30; i++) {
    const d   = new Date(today);
    d.setDate(today.getDate() - i);
    const str = d.toISOString().split('T')[0];
    if (dateSet.has(str)) studyDays30++;
  }
  const consistencyScore  = Math.round((studyDays30 / 30) * 100);

  // ── Streak ────────────────────────────────────────────────────────────────
  const uniqueDates = [...dateSet].sort().reverse();
  const streak      = calcStreak(uniqueDates);

  // ── Session patterns ──────────────────────────────────────────────────────
  const avgSessionMins = Math.round(totalMinutes / sessions.length);
  const longestSession = Math.max(...sessions.map((s) => s.duration));
  const shortSessions  = sessions.filter((s) => s.duration < 20).length;
  const longSessions   = sessions.filter((s) => s.duration >= 60).length;

  // ── Productivity score (0–100) ────────────────────────────────────────────
  // Weighted formula: consistency (40%) + avg session quality (30%) + variety (30%)
  const consistencyW  = consistencyScore * 0.4;
  const sessionQ      = Math.min(100, (avgSessionMins / 90) * 100) * 0.3;
  const varietyW      = Math.min(100, subjectDistribution.length * 20) * 0.3;
  const productivityScore = Math.round(consistencyW + sessionQ + varietyW);

  // ── Study score (0–100) ───────────────────────────────────────────────────
  const hoursScore  = Math.min(100, (totalHours / 100) * 100);
  const studyScore  = Math.round((hoursScore * 0.5) + (consistencyScore * 0.3) + (productivityScore * 0.2));

  return {
    totalHours,
    totalSessions:       sessions.length,
    avgSessionMins,
    longestSession,
    shortSessions,
    longSessions,
    subjectDistribution,
    weeklyTrend,
    consistencyScore,
    streak,
    studyScore:          Math.min(100, studyScore),
    productivityScore:   Math.min(100, productivityScore),
    studyDaysLast30:     studyDays30,
    uniqueSubjects:      subjectDistribution.length,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// Crafts a structured, deterministic prompt so Gemini returns consistent JSON.
// ─────────────────────────────────────────────────────────────────────────────
const buildPrompt = (stats, userName) => {
  const topSubjects = stats.subjectDistribution
    .slice(0, 5)
    .map((s) => `  - ${s.name}: ${s.hours}h (${s.percentage}%)`)
    .join('\n');

  const weeklyStr = stats.weeklyTrend
    .slice(-4)
    .map((w) => `  ${w.week}: ${w.hours}h`)
    .join('\n');

  return `You are an expert AI Study Coach analysing a student's learning data. 
Provide personalised, actionable insights in the EXACT JSON format specified below.

STUDENT PROFILE:
- Name: ${userName || 'Student'}
- Total study time: ${stats.totalHours} hours across ${stats.totalSessions} sessions
- Average session length: ${stats.avgSessionMins} minutes
- Longest single session: ${stats.longestSession} minutes
- Short sessions (<20 min): ${stats.shortSessions}
- Long sessions (≥60 min): ${stats.longSessions}
- Current streak: ${stats.streak} days
- Study days in last 30 days: ${stats.studyDaysLast30}/30 (${stats.consistencyScore}% consistency)
- Unique subjects studied: ${stats.uniqueSubjects}

SUBJECT BREAKDOWN (top 5 by time):
${topSubjects}

RECENT WEEKLY ACTIVITY (last 4 weeks):
${weeklyStr}

COMPUTED SCORES:
- Study Score: ${stats.studyScore}/100
- Consistency Score: ${stats.consistencyScore}/100
- Productivity Score: ${stats.productivityScore}/100

INSTRUCTIONS:
Analyse this data and return ONLY valid JSON with this exact structure — no markdown, no explanation, no code blocks, just raw JSON:
{
  "strengths": ["2-3 specific strengths based on actual data — be concrete, not generic"],
  "weaknesses": ["2-3 specific areas needing improvement based on actual data"],
  "recommendations": ["3-4 specific, actionable steps the student can take this week"],
  "weeklyGoal": "One specific, measurable goal for the next 7 days (e.g. 'Study Calculus for at least 3 hours across 4 sessions')",
  "motivation": "One powerful, personalised motivational message (2-3 sentences max)"
}

Requirements:
- Be specific to THIS student's data — no generic advice
- Keep each array item under 15 words
- weeklyGoal must be achievable based on their current pace
- motivation must reference something specific from their data
- Return ONLY the JSON object, nothing else`;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * analyseWithGemini
 * Runs the full pipeline: analyse data → build prompt → call Gemini → parse response.
 *
 * @param {Array}  sessions  - user's MongoDB session documents
 * @param {string} userName  - user's display name for personalisation
 * @returns {Object} { stats, insights }
 */
const analyseWithGemini = async (sessions, userName) => {
  // 1. Calculate all stats from raw sessions
  const stats = analyseStudyData(sessions);

  // 2. Handle empty state
  if (!stats) {
    return {
      stats:    null,
      insights: null,
      isEmpty:  true,
    };
  }

  // 3. Check Gemini is initialised
  if (!model) {
    throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  // 4. Build prompt and call Gemini
  const prompt = buildPrompt(stats, userName);

  let rawText;
  try {
    const result = await model.generateContent(prompt);
    rawText = result.response.text().trim();
  } catch (geminiErr) {
    // Re-throw with a cleaner message
    const msg = geminiErr.message || 'Gemini API error';
    if (msg.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Gemini API key. Check your GEMINI_API_KEY environment variable.');
    }
    if (msg.includes('QUOTA_EXCEEDED') || msg.includes('429')) {
      throw new Error('Gemini API quota exceeded. Please try again later.');
    }
    throw new Error(`Gemini request failed: ${msg}`);
  }

  // 5. Parse JSON — strip any accidental markdown fences Gemini might add
  let insights;
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/,           '')
      .trim();
    insights = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned malformed JSON. Please try again.');
  }

  // 6. Validate shape
  const required = ['strengths', 'weaknesses', 'recommendations', 'weeklyGoal', 'motivation'];
  for (const key of required) {
    if (!(key in insights)) {
      throw new Error(`Gemini response missing field: ${key}`);
    }
  }

  return { stats, insights, isEmpty: false };
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function calcStreak(uniqueDatesDesc) {
  if (!uniqueDatesDesc.length) return 0;
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (uniqueDatesDesc[0] !== today && uniqueDatesDesc[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < uniqueDatesDesc.length - 1; i++) {
    const a    = new Date(uniqueDatesDesc[i]);
    const b    = new Date(uniqueDatesDesc[i + 1]);
    const diff = Math.round((a - b) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

module.exports = { initGemini, analyseWithGemini, analyseStudyData };
