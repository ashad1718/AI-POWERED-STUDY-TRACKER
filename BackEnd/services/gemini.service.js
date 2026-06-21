'use strict';

const aiConfig = require('../config/ai');
const { parseAndNormalizePlannerResponse } = require('../utils/plannerParser');

// ─────────────────────────────────────────────────────────────────────────────
// INITIALISATION
// Key is read once at startup — if missing, requests fail with a clear message.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_GEMINI_MODEL = aiConfig.PRIMARY_MODEL;
const DEFAULT_GEMINI_API_VERSION = aiConfig.API_VERSION;

const getModelsToTry = () => {
  return aiConfig.getModelsToTry();
};

let configuredModel = DEFAULT_GEMINI_MODEL;
let activeModel = DEFAULT_GEMINI_MODEL;
let apiVersion = DEFAULT_GEMINI_API_VERSION;
let availableModelsCache = null;
let lastModelValidation = null;

const normalizeModelName = (name = '') => name.replace(/^models\//, '').trim();

const getModelId = (modelInfo = {}) => normalizeModelName(modelInfo.name || modelInfo.displayName || '');

const supportsGenerateContent = (modelInfo = {}) => {
  const actions = modelInfo.supportedActions || modelInfo.supportedGenerationMethods || [];
  return actions.length === 0 || actions.includes('generateContent');
};

const ensureGeminiClient = () => {
  return aiConfig.getAIClient();
};

const isAIConfigured = () => {
  try {
    return !!ensureGeminiClient();
  } catch (err) {
    return false;
  }
};

const initGemini = () => {
  try {
    const client = aiConfig.getAIClient();
    if (!client) {
      console.warn('⚠️  GEMINI_API_KEY not set — AI Coach endpoint will return 503');
      return false;
    }

    configuredModel = normalizeModelName(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
    activeModel = configuredModel;
    apiVersion = aiConfig.API_VERSION;

    console.log(`[GEMINI] SDK: @google/genai`);
    console.log(`[GEMINI] API version: ${apiVersion}`);
    console.log(`[GEMINI] Configured model: ${configuredModel}`);
    return true;
  } catch (err) {
    console.warn(`⚠️  Gemini AI initialisation failed: ${err.message}`);
    return false;
  }
};

const isRetriableError = (err) => {
  if (!err) return false;
  const message = (err.message || '').toUpperCase();
  const status = err.status || err.statusCode;

  // Quota exceeded (429) errors should not be retried on the same model.
  // Instead, fail immediately on this model so the service can try the fallback model.
  if (status === 429 || message.includes('429') || message.includes('QUOTA') || message.includes('RESOURCE_EXHAUSTED')) {
    return false;
  }

  return (
    status === 503 ||
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('BUSY') ||
    message.includes('DEMAND') ||
    message.includes('TIMEOUT') ||
    message.includes('OVERLOADED')
  );
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callWithTimeout = (promise, ms) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error('UNAVAILABLE_TIMEOUT');
      err.status = 503;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const cleanGeminiError = (err) => {
  const message = err?.message || 'Gemini API error';

  if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
    return new Error('Invalid Gemini API key. Check your GEMINI_API_KEY environment variable.');
  }

  // Task 6: Return "AI Planner is temporarily unavailable. Please try again." for any failures.
  return new Error('AI Planner is temporarily unavailable. Please try again.');
};

const getAvailableGeminiModels = async ({ refresh = false } = {}) => {
  const client = ensureGeminiClient();

  if (availableModelsCache && !refresh) {
    return availableModelsCache;
  }

  console.log(`[GEMINI] Listing available models via API version ${apiVersion}`);
  const pager = await client.models.list({ config: { pageSize: 100, queryBase: true } });
  const models = [];

  for await (const modelInfo of pager) {
    const id = getModelId(modelInfo);
    if (!id) continue;
    models.push({
      id,
      name: modelInfo.name,
      displayName: modelInfo.displayName,
      version: modelInfo.version,
      description: modelInfo.description,
      inputTokenLimit: modelInfo.inputTokenLimit,
      outputTokenLimit: modelInfo.outputTokenLimit,
      supportedActions: modelInfo.supportedActions || modelInfo.supportedGenerationMethods || [],
    });
  }

  availableModelsCache = models;
  console.log(`[GEMINI] Available models discovered: ${models.length}`);
  return models;
};

const resolveGeminiModel = async ({ refresh = false } = {}) => {
  const models = await getAvailableGeminiModels({ refresh });
  const generativeModels = models.filter(supportsGenerateContent);
  const modelIds = new Set(generativeModels.map((modelInfo) => modelInfo.id));

  const modelsToTry = getModelsToTry();
  const configured = modelsToTry[0] || aiConfig.PRIMARY_MODEL;

  if (modelIds.has(configured)) {
    activeModel = configured;
  } else {
    const fallback = aiConfig.FALLBACK_MODELS.find((candidate) => modelIds.has(candidate));
    activeModel = fallback || generativeModels[0]?.id || DEFAULT_GEMINI_MODEL;
    console.warn(
      `[GEMINI] Configured model "${configured}" is not available. Falling back to "${activeModel}".`
    );
  }

  lastModelValidation = {
    configuredModel: configured,
    activeModel,
    apiVersion,
    checkedAt: new Date().toISOString(),
    availableModelCount: models.length,
  };

  console.log(`[GEMINI] Active model: ${activeModel}`);
  return lastModelValidation;
};

const isModelNotFoundError = (err) => {
  const message = err?.message || '';
  return message.includes('not found') || message.includes('404') || message.includes('NOT_FOUND');
};

const generateGeminiText = async ({ contents, config = {} }) => {
  const client = ensureGeminiClient();
  const modelsToTry = getModelsToTry();
  let lastError = null;

  for (let m = 0; m < modelsToTry.length; m++) {
    const model = modelsToTry[m];
    let retries = 0;
    const maxRetries = 3;
    const backoffSchedule = [1000, 2000, 4000];

    while (retries <= maxRetries) {
      const startTime = Date.now();
      try {
        // Task 7 logging: Request start, selected model, api version
        console.log(`[GEMINI Request] Starting generation request. Model: ${model}, API Version: ${apiVersion} (Attempt ${retries + 1}/${maxRetries + 1})`);
        
        const requestConfig = {
          temperature:      0.7,
          topP:             0.9,
          topK:             40,
          maxOutputTokens:  1024,
          ...config,
        };

        const responsePromise = client.models.generateContent({
          model,
          contents,
          config: requestConfig,
        });

        const response = await callWithTimeout(responsePromise, 30000);
        const duration = Date.now() - startTime;

        // Task 7 logging: Request success
        console.log(`[GEMINI Request Success] Successful. Model: ${model}, Duration: ${duration}ms`);

        activeModel = model;

        return {
          text: (response.text || '').trim(),
          response,
          model,
          apiVersion,
        };
      } catch (err) {
        const duration = Date.now() - startTime;
        
        // Task 7 logging: Request failure
        console.warn(`[GEMINI Request Failure] Failed. Model: ${model}, Duration: ${duration}ms, Error: ${err.message}`);
        // Task 7 logging: Full Gemini error
        console.error('[GEMINI Full Error Detail]', err);

        lastError = err;

        if (isRetriableError(err) && retries < maxRetries) {
          const waitTime = backoffSchedule[retries];
          console.log(`[GEMINI] Retriable error detected. Waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
          retries++;
        } else {
          break;
        }
      }
    }
  }

  throw cleanGeminiError(lastError);
};

const testGeminiConnectivity = async () => {
  const response = await generateGeminiText({
    contents: 'Reply with exactly: Gemini connectivity OK',
    config: {
      temperature: 0,
      maxOutputTokens: 32,
    },
  });

  return {
    ok: true,
    model: response.model,
    apiVersion: response.apiVersion,
    response: response.text,
    checkedAt: new Date().toISOString(),
  };
};

// ─── DATA ANALYSIS HELPERS ───────────────────────────────────────────────────

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

/**
 * Combines general session stats with active subjects/chapters data.
 */
const compileLmsStats = (sessions, activeSubjects, chapters) => {
  const baseStats = analyseStudyData(sessions) || {
    totalHours: 0,
    totalSessions: 0,
    avgSessionMins: 0,
    longestSession: 0,
    shortSessions: 0,
    longSessions: 0,
    subjectDistribution: [],
    weeklyTrend: [],
    consistencyScore: 0,
    streak: 0,
    studyScore: 0,
    productivityScore: 0,
    studyDaysLast30: 0,
    uniqueSubjects: 0,
  };

  const subjectProgress = activeSubjects.map(sub => {
    const subId = sub._id.toString();
    const subChapters = chapters.filter(c => c.subjectId.toString() === subId);
    const totalChapters = subChapters.length;
    const completedChapters = subChapters.filter(c => c.completed).length;
    const remainingChapters = totalChapters - completedChapters;
    const progressPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    let totalEstimatedHours = 0;
    let totalActualHours = 0;

    const chaptersList = subChapters.map(c => {
      const estimated = c.estimatedTime || 2;
      const actual = c.actualTime || 0;
      totalEstimatedHours += estimated;
      totalActualHours += actual;

      let status = 'Not Started';
      if (c.completed) {
        if (actual < estimated) status = 'Completed Early';
        else if (actual === estimated) status = 'Completed On Time';
        else status = 'Took Longer Than Expected';
      } else {
        if (actual > estimated) status = 'Took Longer Than Expected';
        else if (actual > 0) status = 'In Progress';
      }

      return {
        name: c.name,
        completed: c.completed,
        estimatedTime: estimated,
        actualTime: actual,
        status,
      };
    });

    let subjectStatus = 'On Track';
    if (totalActualHours > totalEstimatedHours) {
      subjectStatus = 'Behind Schedule';
    } else if (totalActualHours < totalEstimatedHours && progressPercentage > 0) {
      subjectStatus = 'Ahead Of Schedule';
    }

    return {
      name: sub.name,
      totalChapters,
      completedChapters,
      remainingChapters,
      progressPercentage,
      totalEstimatedHours,
      totalActualHours,
      status: subjectStatus,
      chapters: chaptersList,
    };
  });

  const totalActiveChapters = chapters.length;
  const completedActiveChapters = chapters.filter(c => c.completed).length;
  const remainingActiveChapters = totalActiveChapters - completedActiveChapters;
  const overallLmsProgress = totalActiveChapters > 0 ? Math.round((completedActiveChapters / totalActiveChapters) * 100) : 0;

  return {
    ...baseStats,
    subjectProgress,
    totalActiveChapters,
    completedActiveChapters,
    remainingActiveChapters,
    overallLmsProgress,
  };
};

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────
const buildPrompt = (stats, userName, streakStats = {}, achievements = []) => {
  const topSubjects = stats.subjectDistribution
    .slice(0, 5)
    .map((s) => `  - ${s.name}: ${s.hours}h (${s.percentage}%)`)
    .join('\n');

  const weeklyStr = stats.weeklyTrend
    .slice(-4)
    .map((w) => `  ${w.week}: ${w.hours}h`)
    .join('\n');

  const lmsOverviewStr = stats.subjectProgress && stats.subjectProgress.length > 0
    ? stats.subjectProgress.map(sp => {
        const chaptersList = sp.chapters.map(c => `      * ${c.name} [${c.completed ? 'COMPLETED' : 'INCOMPLETE'}, Est Hours: ${c.estimatedTime}h, Act Hours: ${c.actualTime}h, Pacing: ${c.status}]`).join('\n');
        return `  - ${sp.name}: ${sp.completedChapters}/${sp.totalChapters} Chapters Completed (${sp.progressPercentage}% progress, Subject Pacing: ${sp.status}, Est Hours: ${sp.totalEstimatedHours}h, Act Hours: ${sp.totalActualHours}h)\n${chaptersList}`;
      }).join('\n')
    : '  - No active subjects loaded yet.';

  const achievementsList = achievements.length > 0
    ? achievements.map(a => `  - ${a.slug} (earned ${new Date(a.createdAt).toLocaleDateString()})`).join('\n')
    : '  - No achievements unlocked yet.';

  const currentStreakVal = streakStats && streakStats.currentStreak !== undefined ? streakStats.currentStreak : stats.streak;
  const longestStreakVal = streakStats && streakStats.longestStreak !== undefined ? streakStats.longestStreak : 0;
  const totalActiveDaysVal = streakStats && streakStats.totalActiveDays !== undefined ? streakStats.totalActiveDays : 0;

  return `You are an expert AI Study Coach analysing a student's learning data and syllabus progress. 
Provide personalised, actionable insights in the EXACT JSON format specified below.

STUDENT PROFILE:
- Name: ${userName || 'Student'}
- Total study time: ${stats.totalHours} hours across ${stats.totalSessions} sessions
- Average session length: ${stats.avgSessionMins} minutes
- Current streak: ${currentStreakVal} days
- Longest streak: ${longestStreakVal} days
- Total active study days: ${totalActiveDaysVal} days
- Study consistency: ${stats.consistencyScore}% over last 30 days
- Overall Semester Syllabus Progress: ${stats.completedActiveChapters}/${stats.totalActiveChapters} Chapters Completed (${stats.overallLmsProgress}%)

EARNED ACHIEVEMENTS / GAMIFICATION BADGES:
${achievementsList}

ACTIVE SYLLABUS STATUS (SUBJECTS AND CHAPTERS):
${lmsOverviewStr}

SUBJECT BREAKDOWN FROM SESSION HISTORY (top 5 by time):
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
  "strengths": ["2-3 specific strengths based on actual data — be concrete, under 15 words"],
  "weaknesses": ["2-3 specific areas needing improvement based on actual data"],
  "recommendations": ["3-4 specific, actionable steps the student can take this week"],
  "weeklyGoal": "One specific, measurable goal for the next 7 days based on syllabus progress",
  "motivation": "One powerful, personalised motivational message (2-3 sentences max). If they have a high streak or unlocked recent achievements, acknowledge it. If their streak is 0, motivate them to start a new streak.",
  "subjectPriorities": ["2-3 subjects list ordered by highest priority based on lagging chapter completion or low study hours"],
  "chapterRecommendations": ["2-3 specific incomplete chapters that the student should focus on next"],
  "semesterCompletionPrediction": "A detailed, encouraging prediction of when they will finish the remaining syllabus based on their current study hours and chapter completion rate (e.g. 'At your current pace of 5.5 hours/week, you are on track to complete the remaining 12 chapters in 4.5 weeks, right before final exams.')"
}

Requirements:
- Be specific to THIS student's data — no generic advice
- Keep strengths, weaknesses, priorities, and chapter recommendations concise (under 15 words each)
- Return ONLY the JSON object, nothing else`;
};

// ─── MAIN EXPORTS ────────────────────────────────────────────────────────────

/**
 * analyseWithGemini
 * Runs the full pipeline: analyse data → build prompt → call Gemini → parse response.
 */
const analyseWithGemini = async (sessions, userName, activeSubjects = [], chapters = [], streakStats = {}, achievements = []) => {
  // 1. Calculate all stats from raw sessions and LMS progress
  const stats = compileLmsStats(sessions, activeSubjects, chapters);

  // 2. Handle empty state
  if (!stats || (sessions.length === 0 && activeSubjects.length === 0)) {
    return {
      stats:    null,
      insights: null,
      isEmpty:  true,
    };
  }

  // Update stats.streak if streakStats is provided (to use the 15-min threshold streak)
  if (streakStats && streakStats.currentStreak !== undefined) {
    stats.streak = streakStats.currentStreak;
  }

  // 3. Check Gemini is initialised
  if (!isAIConfigured()) {
    throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  // 4. Build prompt and call Gemini
  const prompt = buildPrompt(stats, userName, streakStats, achievements);

  let rawText;
  try {
    const result = await generateGeminiText({ contents: prompt, config: { maxOutputTokens: 2048 } });
    rawText = result.text;
  } catch (geminiErr) {
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
  } catch (err) {
    console.error('[GEMINI JSON ERROR]', { rawText, error: err.message });
    throw new Error('Gemini returned malformed JSON. Please try again.');
  }

  // 6. Validate shape
  const required = [
    'strengths', 'weaknesses', 'recommendations', 'weeklyGoal', 'motivation',
    'subjectPriorities', 'chapterRecommendations', 'semesterCompletionPrediction'
  ];
  for (const key of required) {
    if (!(key in insights)) {
      throw new Error(`Gemini response missing field: ${key}`);
    }
  }

  return { stats, insights, isEmpty: false };
};

/**
 * chatWithGemini
 * Interactive conversation with the AI Coach.
 */
const chatWithGemini = async (sessions, userName, message, activeSubjects = [], chapters = [], streakStats = {}, achievements = []) => {
  // 1. Calculate stats to give the coach context
  const stats = compileLmsStats(sessions, activeSubjects, chapters);

  // 2. Build system instructions with context
  let contextPrompt = `You are the student's interactive AI Study Coach. Your name is AI Study Coach.
The student's name is ${userName || 'Student'}.
`;

  if (stats && (stats.totalSessions > 0 || stats.subjectProgress.length > 0)) {
    const activeSubsStr = stats.subjectProgress.map(sp => 
      `${sp.name} (${sp.completedChapters}/${sp.totalChapters} chapters, ${sp.studyHours}h)`
    ).join(', ');

    const currentStreakVal = streakStats && streakStats.currentStreak !== undefined ? streakStats.currentStreak : stats.streak;
    const longestStreakVal = streakStats && streakStats.longestStreak !== undefined ? streakStats.longestStreak : 0;
    const achievementsStr = achievements.map(a => a.slug).join(', ') || 'None';

    contextPrompt += `
Here is the student's current study and syllabus progress:
- Total study time: ${stats.totalHours} hours across ${stats.totalSessions} sessions.
- Average session length: ${stats.avgSessionMins} minutes.
- Current streak: ${currentStreakVal} days.
- Longest streak: ${longestStreakVal} days.
- Unlocked achievements: ${achievementsStr}.
- Consistency (last 30 days): ${stats.consistencyScore}% consistency.
- Study Score: ${stats.studyScore}/100.
- Productivity Score: ${stats.productivityScore}/100.
- Active Subjects Status: ${activeSubsStr || 'None'}.
- Syllabus completion rate: ${stats.completedActiveChapters}/${stats.totalActiveChapters} chapters completed (${stats.overallLmsProgress}%).
`;
  } else {
    contextPrompt += `
The student has not logged any study sessions nor configured any active subjects. Encourage them to add their subjects and start logging study sessions.
`;
  }

  contextPrompt += `
Please respond to the student's message in a helpful, coaching, and motivating tone. Keep your responses concise, friendly, and directly addressing their questions. Feel free to celebrate their study streaks and unlocked achievements if they ask or when it fits the conversation naturally.
`;

  // 3. Call Gemini
  const contents = [
    { text: contextPrompt },
    { text: `Student message: ${message}` }
  ];

  const result = await generateGeminiText({ contents, config: { maxOutputTokens: 1024 } });

  return {
    response: result.text,
    timestamp: new Date().toISOString()
  };
};

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────
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

const generateDailyPlanWithGemini = async (sessions, userName, activeSubjects = [], chapters = [], exams = []) => {
  if (!isAIConfigured()) {
    throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  const stats = compileLmsStats(sessions, activeSubjects, chapters);

  // Format subjects and incomplete chapters
  const incompleteChapters = chapters.filter(c => !c.completed);
  const subjectsStr = activeSubjects.map(s => s.name).join(', ');
  
  // Format exams
  const examsStr = exams.map(e => {
    const sub = activeSubjects.find(s => s._id.toString() === e.subjectId.toString());
    return `${sub ? sub.name : 'Unknown'}: ${new Date(e.date).toLocaleDateString()}`;
  }).join(', ');

  const incompleteChapsStr = incompleteChapters.map(c => {
    const sub = activeSubjects.find(s => s._id.toString() === c.subjectId.toString());
    return `- [${sub ? sub.name : 'Unknown'}] ${c.name}`;
  }).slice(0, 15).join('\n');

  const prompt = `You are an expert AI Study Planner. You are designing a personalised DAILY study plan for a student based on their actual course, chapter progress, study logs, and exam dates.

STUDENT PROFILE:
- Name: ${userName || 'Student'}
- Active Subjects: ${subjectsStr || 'None'}
- Upcoming Exams: ${examsStr || 'None'}
- Total study time historically: ${stats ? stats.totalHours : 0} hours
- Current streak: ${stats ? stats.streak : 0} days
- Study consistency: ${stats ? stats.consistencyScore : 0}% (last 30 days)

INCOMPLETE CHAPTERS (Focus on these):
${incompleteChapsStr || 'No incomplete chapters — all syllabus is complete!'}

INSTRUCTIONS:
Generate a personalized Daily Study Plan (specifically for today) to help this student progress on their syllabus. Pick 2-3 specific incomplete chapters from the list above and assign study durations.

Return ONLY valid JSON.
Do not include:
- Markdown
- Explanations
- Notes
- Code blocks
- Triple backticks

The JSON response MUST match this exact schema format:
{
  "dailyPlan": [
    {
      "subject": "Subject name",
      "chapter": "Chapter name",
      "duration": 45,
      "reason": "Clear explanation of why this chapter is recommended today (e.g. lagging behind or has exam coming up)"
    }
  ],
  "weeklyPlan": [],
  "recommendations": [
    "A concise daily focus tip",
    "Priority Subject 1",
    "Priority Chapter 1"
  ]
}

Requirements:
- Plan must specify actual subjects and chapters from the student's incomplete list.
- Keep durations realistic (between 15 and 90 minutes).
- Return ONLY the raw JSON object, nothing else.`;

  let rawText;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      const result = await generateGeminiText({ contents: prompt, config: { maxOutputTokens: 1024 } });
      rawText = result.text;

      const { parsed, validationStatus } = parseAndNormalizePlannerResponse(rawText, 'daily');
      
      if (parsed && (validationStatus.isValid || attempts === maxAttempts - 1)) {
        return parsed;
      }

      throw new Error('JSON schema validation failed.');
    } catch (err) {
      attempts++;
      console.warn(`[AI PLANNER] Daily plan generation failed (attempt ${attempts}/${maxAttempts}). Error: ${err.message}`);
      if (attempts >= maxAttempts) {
        throw new Error('AI Planner could not generate a valid study plan. Retrying...');
      }
    }
  }
};

const generateWeeklyPlanWithGemini = async (sessions, userName, activeSubjects = [], chapters = [], exams = []) => {
  if (!isAIConfigured()) {
    throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  const stats = compileLmsStats(sessions, activeSubjects, chapters);

  // Format subjects and incomplete chapters
  const incompleteChapters = chapters.filter(c => !c.completed);
  const subjectsStr = activeSubjects.map(s => s.name).join(', ');
  
  // Format exams
  const examsStr = exams.map(e => {
    const sub = activeSubjects.find(s => s._id.toString() === e.subjectId.toString());
    return `${sub ? sub.name : 'Unknown'}: ${new Date(e.date).toLocaleDateString()}`;
  }).join(', ');

  const incompleteChapsStr = incompleteChapters.map(c => {
    const sub = activeSubjects.find(s => s._id.toString() === c.subjectId.toString());
    return `- [${sub ? sub.name : 'Unknown'}] ${c.name}`;
  }).slice(0, 15).join('\n');

  const prompt = `You are an expert AI Study Planner. You are designing a personalised WEEKLY study plan (Monday to Sunday) for a student based on their actual course, chapter progress, study logs, and exam dates.

STUDENT PROFILE:
- Name: ${userName || 'Student'}
- Active Subjects: ${subjectsStr || 'None'}
- Upcoming Exams: ${examsStr || 'None'}
- Total study time historically: ${stats ? stats.totalHours : 0} hours
- Study consistency: ${stats ? stats.consistencyScore : 0}% (last 30 days)

INCOMPLETE CHAPTERS (Focus on these):
${incompleteChapsStr || 'No incomplete chapters — all syllabus is complete!'}

INSTRUCTIONS:
Generate a structured Weekly Study Plan (Monday through Sunday). Assign 1-2 study tasks for each day using subjects and chapters from the incomplete list.

Return ONLY valid JSON.
Do not include:
- Markdown
- Explanations
- Notes
- Code blocks
- Triple backticks

The JSON response MUST match this exact schema format:
{
  "dailyPlan": [],
  "weeklyPlan": [
    {
      "day": "Monday",
      "tasks": [
        {
          "subject": "Subject name",
          "chapter": "Chapter name",
          "duration": 60,
          "reason": "Specific study reason for this day"
        }
      ]
    }
  ],
  "recommendations": [
    "3 concise milestones to hit by the end of the week",
    "A concise strategy recommendation for managing workload this week"
  ]
}

Requirements:
- Plan must specify actual subjects and chapters from the student's incomplete list.
- Keep durations realistic (between 30 and 120 minutes).
- Include all 7 days of the week (Monday through Sunday).
- Return ONLY the raw JSON object, nothing else.`;

  let rawText;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      const result = await generateGeminiText({ contents: prompt, config: { maxOutputTokens: 2048 } });
      rawText = result.text;

      const { parsed, validationStatus } = parseAndNormalizePlannerResponse(rawText, 'weekly');
      
      if (parsed && (validationStatus.isValid || attempts === maxAttempts - 1)) {
        return parsed;
      }

      throw new Error('JSON schema validation failed.');
    } catch (err) {
      attempts++;
      console.warn(`[AI PLANNER] Weekly plan generation failed (attempt ${attempts}/${maxAttempts}). Error: ${err.message}`);
      if (attempts >= maxAttempts) {
        throw new Error('AI Planner could not generate a valid study plan. Retrying...');
      }
    }
  }
};

const generateExamInsightsWithGemini = async (predictions, userName) => {
  if (!isAIConfigured()) {
    throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  const predictionSummary = predictions.map(p => {
    return `- Subject: ${p.name}
    * Syllabus Progress: ${p.progress}%
    * Remaining Chapters: ${p.remainingChapters}
    * Exam Date: ${p.examDate ? new Date(p.examDate).toLocaleDateString() : 'None'}
    * Predicted Completion Date: ${p.predictedCompletionDate ? new Date(p.predictedCompletionDate).toLocaleDateString() : 'Infinite/Undetermined'}
    * Risk Level: ${p.riskLevel}
    * Days difference: ${p.daysDifference !== null ? p.daysDifference + ' days' : 'N/A'}`;
  }).join('\n');

  const prompt = `You are an expert AI Exam Readiness Advisor. Analyze the student's syllabus predictions and exam dates. Write 3 highly specific, direct, actionable study pace recommendations and insights.

STUDENT STATS & PREDICTIONS:
Student: ${userName || 'Student'}
${predictionSummary}

INSTRUCTIONS:
Based on this data, generate exactly 3 personalized insights or warnings.
- First insight should focus on the subjects "On Track" or most advanced, acknowledging positive pace.
- Second insight must flag the highest risk subject (if any) and mention the gap between the exam date and predicted completion.
- Third insight must give a specific study time adjustment (e.g. "Increase study time by 30 minutes per day on Operating Systems to finish before your exam").

Return ONLY valid JSON with this exact structure — no markdown, no explanation, no code blocks, just raw JSON:
{
  "insights": [
    "Insight 1 (positive progress or pace check)",
    "Insight 2 (risk/warning alert for at-risk subjects)",
    "Insight 3 (specific hour/minute study adjustment recommendation)"
  ]
}

Requirements:
- Each insight must be under 20 words.
- Relate directly to the dates and numbers provided.
- Return ONLY the raw JSON object, nothing else.`;

  let rawText;
  try {
    const result = await generateGeminiText({ contents: prompt, config: { maxOutputTokens: 512 } });
    rawText = result.text;
  } catch (err) {
    throw cleanGeminiError(err);
  }

  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return parsed.insights || [];
  } catch (err) {
    console.error('[GEMINI EXAM INSIGHTS JSON ERROR]', { rawText, error: err.message });
    return [
      "Keep study sessions consistent to meet your exam dates.",
      "Check any subjects marked as High Risk and adjust study targets.",
      "Log at least 30 minutes daily to get updated pace predictions."
    ]; // safe fallback
  }
};

module.exports = {
  initGemini,
  testGeminiConnectivity,
  analyseWithGemini,
  analyseStudyData,
  chatWithGemini,
  generateDailyPlanWithGemini,
  generateWeeklyPlanWithGemini,
  generateExamInsightsWithGemini,
  generateGeminiText,
};
