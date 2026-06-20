'use strict';

/**
 * Balance open braces, brackets, and quotes in truncated JSON strings.
 */
const balanceJsonBrackets = (text) => {
  const stack = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  let balanced = text;
  if (inString) {
    balanced += '"';
  }

  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') balanced += '}';
    else if (last === '[') balanced += ']';
  }

  return balanced;
};

/**
 * Clean up raw Gemini response text to extract valid JSON.
 */
const cleanupRawText = (text) => {
  if (!text) return '';

  let cleaned = text.trim();

  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/, '');
  cleaned = cleaned.trim();

  // Extract content between the first '{' and the last '}'
  // If the last '}' is missing due to truncation, extract from '{' to the end
  const startIdx = cleaned.indexOf('{');
  if (startIdx !== -1) {
    const endIdx = cleaned.lastIndexOf('}');
    if (endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    } else {
      cleaned = cleaned.substring(startIdx);
    }
  }

  // Balance open braces/brackets to repair truncated JSON
  cleaned = balanceJsonBrackets(cleaned);

  // Remove trailing commas in arrays/objects (invalid in standard JSON)
  cleaned = cleaned.replace(/,\s*(?=[\]}])/g, '');

  return cleaned;
};

/**
 * Fallback parser using regex to extract as much structured data as possible
 * from a malformed/incomplete JSON response.
 */
const attemptFallbackExtraction = (text) => {
  const fallback = {
    dailyPlan: [],
    weeklyPlan: [],
    recommendations: []
  };

  try {
    // 1. Extract dailyPlan or plan array items
    const dailyItemsMatch = text.match(/"(?:dailyPlan|plan)"\s*:\s*\[([\s\S]*?)\]/i);
    if (dailyItemsMatch && dailyItemsMatch[1]) {
      const itemsText = dailyItemsMatch[1];
      const objRegex = /\{([\s\S]*?)\}/g;
      let match;
      while ((match = objRegex.exec(itemsText)) !== null) {
        try {
          const objStr = match[0].replace(/,\s*(?=[\]}])/g, '').trim();
          fallback.dailyPlan.push(JSON.parse(objStr));
        } catch (err) {
          // Fallback key-value regex extraction for a single daily task object
          const subMatch = match[1].match(/"subject"\s*:\s*"([^"]+)"/i);
          const chapMatch = match[1].match(/"chapter"\s*:\s*"([^"]+)"/i);
          const durMatch = match[1].match(/"duration"\s*:\s*(\d+)/i);
          const reasMatch = match[1].match(/"reason"\s*:\s*"([^"]+)"/i);

          if (subMatch && chapMatch) {
            fallback.dailyPlan.push({
              subject: subMatch[1],
              chapter: chapMatch[1],
              duration: durMatch ? parseInt(durMatch[1], 10) : 45,
              reason: reasMatch ? reasMatch[1] : 'Recommended study chapter.'
            });
          }
        }
      }
    }

    // 2. Extract weeklyPlan array items
    const weeklyItemsMatch = text.match(/"weeklyPlan"\s*:\s*\[([\s\S]*?)\]/i);
    if (weeklyItemsMatch && weeklyItemsMatch[1]) {
      const itemsText = weeklyItemsMatch[1];
      const objRegex = /\{([\s\S]*?)\}/g;
      let match;
      while ((match = objRegex.exec(itemsText)) !== null) {
        try {
          const objStr = match[0].replace(/,\s*(?=[\]}])/g, '').trim();
          fallback.weeklyPlan.push(JSON.parse(objStr));
        } catch (err) {
          // Fallback key-value regex extraction for a single weekly day plan object
          const dayMatch = match[1].match(/"day"\s*:\s*"([^"]+)"/i);
          if (dayMatch) {
            const tasks = [];
            const tasksMatch = match[1].match(/"tasks"\s*:\s*\[([\s\S]*?)\]/i);
            if (tasksMatch && tasksMatch[1]) {
              const taskObjRegex = /\{([\s\S]*?)\}/g;
              let tMatch;
              while ((tMatch = taskObjRegex.exec(tasksMatch[1])) !== null) {
                const subMatch = tMatch[1].match(/"subject"\s*:\s*"([^"]+)"/i);
                const chapMatch = tMatch[1].match(/"chapter"\s*:\s*"([^"]+)"/i);
                const durMatch = tMatch[1].match(/"duration"\s*:\s*(\d+)/i);
                const reasMatch = tMatch[1].match(/"reason"\s*:\s*"([^"]+)"/i);
                if (subMatch && chapMatch) {
                  tasks.push({
                    subject: subMatch[1],
                    chapter: chapMatch[1],
                    duration: durMatch ? parseInt(durMatch[1], 10) : 60,
                    reason: reasMatch ? reasMatch[1] : 'Weekly study task.'
                  });
                }
              }
            }
            fallback.weeklyPlan.push({
              day: dayMatch[1],
              tasks
            });
          }
        }
      }
    }

    // 3. Extract recommendations strings
    const recsMatch = text.match(/"(?:recommendations|prioritySubjects|priorityChapters|weeklyMilestones)"\s*:\s*\[([\s\S]*?)\]/i);
    if (recsMatch && recsMatch[1]) {
      const itemsText = recsMatch[1];
      const strRegex = /"([^"]+)"/g;
      let match;
      while ((match = strRegex.exec(itemsText)) !== null) {
        fallback.recommendations.push(match[1]);
      }
    }
  } catch (err) {
    console.error('[AI PLANNER FALLBACK ERROR] safe extraction failed completely:', err.message);
  }

  return fallback;
};

/**
 * Parse, clean, validate, and normalize study planner responses.
 */
const parseAndNormalizePlannerResponse = (rawResponse, planType) => {
  // Task 2: Log raw response
  console.log(`[AI RESPONSE] ${rawResponse}`);

  const cleanedText = cleanupRawText(rawResponse);
  let parsed = null;
  let isFallback = false;

  try {
    parsed = JSON.parse(cleanedText);
  } catch (err) {
    console.warn('[AI PLANNER] JSON.parse failed. Executing fallback regex extraction...', err.message);
    parsed = attemptFallbackExtraction(rawResponse);
    isFallback = true;
  }

  // Schema Validation
  const validationStatus = { isValid: false, errors: [] };
  if (parsed) {
    const hasDailyPlan = Array.isArray(parsed.dailyPlan);
    const hasWeeklyPlan = Array.isArray(parsed.weeklyPlan);
    const hasRecommendations = Array.isArray(parsed.recommendations);

    validationStatus.isValid = hasDailyPlan && hasWeeklyPlan && hasRecommendations;
    if (!validationStatus.isValid) {
      if (!hasDailyPlan) validationStatus.errors.push('Missing or invalid dailyPlan array');
      if (!hasWeeklyPlan) validationStatus.errors.push('Missing or invalid weeklyPlan array');
      if (!hasRecommendations) validationStatus.errors.push('Missing or invalid recommendations array');
    }

    // Normalize keys to support existing frontend/controller consumption
    if (planType === 'daily') {
      parsed.plan = parsed.plan || parsed.dailyPlan || [];
      parsed.prioritySubjects = parsed.prioritySubjects || [];
      parsed.priorityChapters = parsed.priorityChapters || [];
      parsed.dailyFocusTip = parsed.dailyFocusTip || parsed.recommendations?.[0] || 'Stay focused and study today!';

      // Ensure expected schema fields are populated on the returned object
      parsed.dailyPlan = parsed.dailyPlan || parsed.plan;
      parsed.weeklyPlan = parsed.weeklyPlan || [];
      parsed.recommendations = parsed.recommendations || [];
    } else if (planType === 'weekly') {
      parsed.plan = parsed.plan || parsed.weeklyPlan || [];
      parsed.weeklyMilestones = parsed.weeklyMilestones || parsed.recommendations || [];
      parsed.weeklyStrategy = parsed.weeklyStrategy || 'Focus on your weekly milestones.';

      // Ensure expected schema fields are populated on the returned object
      parsed.dailyPlan = parsed.dailyPlan || [];
      parsed.weeklyPlan = parsed.weeklyPlan || parsed.plan;
      parsed.recommendations = parsed.recommendations || parsed.weeklyMilestones;
    }
  }

  return { parsed, validationStatus, isFallback };
};

module.exports = {
  cleanupRawText,
  attemptFallbackExtraction,
  parseAndNormalizePlannerResponse,
};
