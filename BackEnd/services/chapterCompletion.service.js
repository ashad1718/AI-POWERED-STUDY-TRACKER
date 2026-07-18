'use strict';

const { prisma } = require('../config/prisma');
const { checkAndUnlockAchievements } = require('./achievement.service');

const checkAndUpdateChapterAutoCompletion = async (userId, subjectId, chapterId) => {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, userId },
  });
  if (!chapter) return;

  // 1. Fetch all sessions logged for this chapter
  const sessions = await prisma.session.findMany({
    where: { userId, chapterId },
  });
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = totalMinutes / 60;

  // Update actualTime (in hours, rounded to 2 decimals)
  let actualTime = parseFloat(totalHours.toFixed(2));
  let completed = chapter.completed;
  let completedMethod = chapter.completedMethod;

  const wasCompleted = chapter.completed;

  // 2. Auto-completion logic
  // Priority rule: if estimatedTime is set and > 0, complete when actualTime >= estimatedTime
  if (chapter.estimatedTime && chapter.estimatedTime > 0) {
    // If chapter was marked completed manually, keep it manually completed
    if (chapter.completed && chapter.completedMethod === 'manual') {
      await prisma.chapter.update({
        where: { id: chapter.id },
        data: { actualTime },
      });
      return;
    }

    const meetsEst = actualTime >= chapter.estimatedTime;
    if (meetsEst) {
      completed = true;
      completedMethod = 'auto';
    } else {
      if (chapter.completed && chapter.completedMethod === 'auto') {
        completed = false;
        completedMethod = 'none';
      }
    }
  } else {
    // Legacy fallback based on subject threshold
    if (chapter.completed && chapter.completedMethod === 'manual') {
      await prisma.chapter.update({
        where: { id: chapter.id },
        data: { actualTime },
      });
      return;
    }

    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });
    
    let threshold = { sessions: 3, hours: 5 };
    if (subject) {
      threshold = {
        sessions: subject.completionThresholdSessions,
        hours: subject.completionThresholdHours,
      };
    }
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
      completed = true;
      completedMethod = 'auto';
    } else {
      if (chapter.completed && chapter.completedMethod === 'auto') {
        completed = false;
        completedMethod = 'none';
      }
    }
  }

  const updatedChapter = await prisma.chapter.update({
    where: { id: chapter.id },
    data: {
      actualTime,
      completed,
      completedMethod,
    },
  });

  if (updatedChapter.completed && !wasCompleted) {
    console.log(`[CHAPTER COMPLETION SERVICE] Auto-completed chapter: ${updatedChapter.name}`);
    checkAndUnlockAchievements(userId);
  }
};

module.exports = {
  checkAndUpdateChapterAutoCompletion,
};
