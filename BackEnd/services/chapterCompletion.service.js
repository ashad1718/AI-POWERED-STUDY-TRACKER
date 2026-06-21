'use strict';

const Chapter = require('../models/Chapter');
const Subject = require('../models/Subject');
const Session = require('../models/Session');
const { checkAndUnlockAchievements } = require('./achievement.service');

const checkAndUpdateChapterAutoCompletion = async (userId, subjectId, chapterId) => {
  const chapter = await Chapter.findOne({ _id: chapterId, userId });
  if (!chapter) return;

  // 1. Fetch all sessions logged for this chapter
  const sessions = await Session.find({ userId, chapterId });
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = totalMinutes / 60;

  // Update actualTime (in hours, rounded to 2 decimals)
  chapter.actualTime = parseFloat(totalHours.toFixed(2));

  const wasCompleted = chapter.completed;

  // 2. Auto-completion logic
  // Priority rule: if estimatedTime is set and > 0, complete when actualTime >= estimatedTime
  if (chapter.estimatedTime && chapter.estimatedTime > 0) {
    // If chapter was marked completed manually, keep it manually completed
    if (chapter.completed && chapter.completedMethod === 'manual') {
      await chapter.save();
      return;
    }

    const meetsEst = chapter.actualTime >= chapter.estimatedTime;
    if (meetsEst) {
      chapter.completed = true;
      chapter.completedMethod = 'auto';
    } else {
      if (chapter.completed && chapter.completedMethod === 'auto') {
        chapter.completed = false;
        chapter.completedMethod = 'none';
      }
    }
  } else {
    // Legacy fallback based on subject threshold
    if (chapter.completed && chapter.completedMethod === 'manual') {
      await chapter.save();
      return;
    }

    const subject = await Subject.findOne({ _id: subjectId, userId });
    const threshold = subject?.completionThreshold || { sessions: 3, hours: 5 };
    const rule = subject?.completionRule || 'first_session';
    const sessionsCount = sessions.length;

    let meetsThreshold = false;
    if (rule === 'first_session') {
      meetsThreshold = sessionsCount >= 1;
    } else if (rule === 'sixty_minutes') {
      meetsThreshold = totalMinutes >= 60;
    } else if (rule === 'custom_threshold') {
      meetsThreshold = sessionsCount >= threshold.sessions || totalHours >= threshold.hours;
    }

    if (meetsThreshold) {
      chapter.completed = true;
      chapter.completedMethod = 'auto';
    } else {
      if (chapter.completed && chapter.completedMethod === 'auto') {
        chapter.completed = false;
        chapter.completedMethod = 'none';
      }
    }
  }

  await chapter.save();

  if (chapter.completed && !wasCompleted) {
    console.log(`[CHAPTER COMPLETION SERVICE] Auto-completed chapter: ${chapter.name}`);
    checkAndUnlockAchievements(userId);
  }
};

module.exports = {
  checkAndUpdateChapterAutoCompletion,
};
