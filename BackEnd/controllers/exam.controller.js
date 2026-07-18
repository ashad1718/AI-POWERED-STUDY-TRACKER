'use strict';

const { prisma } = require('../config/prisma');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { generateExamInsightsWithGemini } = require('../services/gemini.service');

// ─── POST /api/exams ──────────────────────────────────────────────────────────
exports.createExam = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { subjectId, date } = req.body;

  if (!subjectId || !date) {
    throw new AppError('Subject ID and exam date are required.', 400);
  }

  // Verify subject exists and belongs to the user
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId, isDeleted: false },
  });
  if (!subject) {
    throw new AppError('Subject not found or does not belong to you.', 404);
  }

  // Create or Update (Upsert) the exam date
  const exam = await prisma.exam.upsert({
    where: {
      userId_subjectId: { userId, subjectId },
    },
    update: { date: new Date(date) },
    create: { userId, subjectId, date: new Date(date) },
  });

  const formattedExam = {
    ...exam,
    _id: exam.id,
  };

  res.status(201).json({
    success: true,
    message: 'Exam date saved successfully.',
    data: formattedExam,
  });
});

// ─── PUT /api/exams/:id ───────────────────────────────────────────────────────
exports.updateExam = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const examId = req.params.id;
  const { date } = req.body;

  if (!date) {
    throw new AppError('Exam date is required.', 400);
  }

  const existingExam = await prisma.exam.findFirst({
    where: { id: examId, userId },
  });
  if (!existingExam) {
    throw new AppError('Exam entry not found.', 404);
  }

  const exam = await prisma.exam.update({
    where: { id: examId },
    data: { date: new Date(date) },
  });

  const formattedExam = {
    ...exam,
    _id: exam.id,
  };

  res.status(200).json({
    success: true,
    message: 'Exam date updated successfully.',
    data: formattedExam,
  });
});

// ─── DELETE /api/exams/:id ────────────────────────────────────────────────────
exports.deleteExam = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const examId = req.params.id;

  const existingExam = await prisma.exam.findFirst({
    where: { id: examId, userId },
  });
  if (!existingExam) {
    throw new AppError('Exam entry not found.', 404);
  }

  await prisma.exam.delete({
    where: { id: examId },
  });

  res.status(200).json({
    success: true,
    message: 'Exam date deleted successfully.',
  });
});

// ─── GET /api/exams/predictions ──────────────────────────────────────────────
exports.getPredictions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userName = req.user.name;

  // 1. Fetch active subjects
  const activeSubjects = await prisma.subject.findMany({
    where: {
      userId,
      active: true,
      isArchived: false,
      isDeleted: false,
    },
    orderBy: { order: 'asc' },
  });

  const activeSubjectIds = activeSubjects.map(s => s.id);

  // 2. Fetch non-deleted chapters for these subjects
  const chapters = await prisma.chapter.findMany({
    where: {
      userId,
      subjectId: { in: activeSubjectIds },
      isDeleted: false,
    },
  });

  // 3. Fetch all study sessions
  const sessions = await prisma.session.findMany({
    where: { userId },
  });

  // 4. Fetch all exams
  const exams = await prisma.exam.findMany({
    where: { userId },
  });
  const examMap = {};
  exams.forEach(e => {
    examMap[e.subjectId] = e;
  });

  // ─── Pace Calculations ───
  // Calculate average daily study time in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentSessions = sessions.filter(s => new Date(s.date) >= thirtyDaysAgo);
  const totalRecentMinutes = recentSessions.reduce((sum, s) => sum + s.duration, 0);
  
  let avgDailyStudyMinutes = totalRecentMinutes / 30;
  let isNoRecentHistory = false;

  // Fallback if no study history
  if (avgDailyStudyMinutes === 0) {
    avgDailyStudyMinutes = 30; // default 30 mins a day fallback
    isNoRecentHistory = true;
  }

  const avgWeeklyStudyMinutes = avgDailyStudyMinutes * 7;

  // Study distribution overall
  const totalMinutesOverall = sessions.reduce((sum, s) => sum + s.duration, 0);
  const subjectTimeMap = {};
  sessions.forEach(s => {
    if (s.subjectId) {
      const sId = s.subjectId;
      subjectTimeMap[sId] = (subjectTimeMap[sId] || 0) + s.duration;
    }
  });

  // Calculate prediction for each subject
  const predictions = activeSubjects.map(subject => {
    const subId = subject.id;
    const subChapters = chapters.filter(c => c.subjectId === subId);
    
    const totalChaps = subChapters.length;
    const completedChaps = subChapters.filter(c => c.completed).length;
    const remainingChaps = totalChaps - completedChaps;
    const progress = totalChaps > 0 ? Math.round((completedChaps / totalChaps) * 100) : 100;

    const exam = examMap[subId];
    const examDate = exam ? exam.date : null;
    const examId = exam ? exam.id : null;

    // Time share fraction
    let fraction = 0;
    if (totalMinutesOverall > 0) {
      fraction = (subjectTimeMap[subId] || 0) / totalMinutesOverall;
    }
    
    // Equal distribution fallback if no study logged for this subject or overall
    if (fraction === 0) {
      fraction = 1 / activeSubjects.length;
    }

    // Daily study allocation for this subject (minutes)
    const dailyAllocation = avgDailyStudyMinutes * fraction;

    // Estimate time per chapter (default 120 minutes if no chapters completed yet)
    let timePerChapter = 120;
    const completedForThisSub = subChapters.filter(c => c.completed);
    const subMinutes = subjectTimeMap[subId] || 0;
    if (completedForThisSub.length > 0 && subMinutes > 0) {
      timePerChapter = subMinutes / completedForThisSub.length;
    }

    const totalMinutesNeeded = remainingChaps * timePerChapter;
    
    let predictedCompletionDate = null;
    let daysToComplete = null;
    let daysDifference = null;
    let riskLevel = 'NONE'; // GREEN, YELLOW, RED, NONE

    if (remainingChaps === 0) {
      predictedCompletionDate = new Date(); // already finished
      riskLevel = examDate ? 'GREEN' : 'NONE';
    } else if (dailyAllocation > 0) {
      daysToComplete = totalMinutesNeeded / dailyAllocation;
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + Math.ceil(daysToComplete));
      predictedCompletionDate = completionDate;

      if (examDate) {
        const diffTime = new Date(examDate) - completionDate;
        daysDifference = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (daysDifference >= 3) {
          riskLevel = 'GREEN';
        } else if (daysDifference >= 0) {
          riskLevel = 'YELLOW';
        } else {
          riskLevel = 'RED';
        }
      }
    } else {
      // dailyAllocation is 0 and remainingChaps > 0
      riskLevel = examDate ? 'RED' : 'NONE';
    }

    // Override to RED if they have no recent study history at all, and have remaining chapters
    if (isNoRecentHistory && remainingChaps > 0 && examDate) {
      riskLevel = 'RED';
    }

    return {
      subjectId: subId,
      examId,
      name: subject.name,
      progress,
      totalChapters: totalChaps,
      completedChapters: completedChaps,
      remainingChapters: remainingChaps,
      examDate,
      predictedCompletionDate,
      riskLevel,
      daysDifference,
    };
  });

  // Calculate Expected Semester Completion Date (sum of remaining time across all subjects)
  let expectedSemesterCompletionDate = null;
  let totalRemainingMinutesNeeded = 0;
  
  predictions.forEach(p => {
    // Default time per chapter is 120 mins
    let timePerChapter = 120;
    const subId = p.subjectId;
    const subChapters = chapters.filter(c => c.subjectId === subId);
    const completedForThisSub = subChapters.filter(c => c.completed);
    const subMinutes = subjectTimeMap[subId] || 0;
    
    if (completedForThisSub.length > 0 && subMinutes > 0) {
      timePerChapter = subMinutes / completedForThisSub.length;
    }
    totalRemainingMinutesNeeded += p.remainingChapters * timePerChapter;
  });

  const totalRemainingChapters = predictions.reduce((sum, p) => sum + p.remainingChapters, 0);

  if (totalRemainingChapters === 0) {
    expectedSemesterCompletionDate = new Date();
  } else if (avgDailyStudyMinutes > 0) {
    const totalDaysNeeded = totalRemainingMinutesNeeded / avgDailyStudyMinutes;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + Math.ceil(totalDaysNeeded));
    expectedSemesterCompletionDate = expectedDate;
  }

  // Count risk levels
  const subjectsAtRisk = predictions.filter(p => p.riskLevel === 'RED').length;
  
  // Calculate average progress
  const totalSubjects = activeSubjects.length;
  const sumProgress = predictions.reduce((sum, p) => sum + p.progress, 0);
  const averageCompletion = totalSubjects > 0 ? Math.round(sumProgress / totalSubjects) : 100;

  const overview = {
    totalSubjects,
    subjectsAtRisk,
    averageCompletion,
    expectedSemesterCompletionDate,
    avgDailyStudyTime: parseFloat((avgDailyStudyMinutes / 60).toFixed(1)),
    avgWeeklyStudyTime: parseFloat((avgWeeklyStudyMinutes / 60).toFixed(1)),
    isNoRecentHistory,
  };

  // 5. Generate AI Insights via Gemini
  let insights = [];
  try {
    insights = await generateExamInsightsWithGemini(predictions, userName);
  } catch (err) {
    console.error('[EXAM PREDICTOR AI INSIGHTS FAIL]', err);
    // fallback
    insights = [
      "Keep study sessions consistent to meet your exam dates.",
      subjectsAtRisk > 0 
        ? `${subjectsAtRisk} subjects are at high risk. Prioritize them next.`
        : "You are currently on track for your registered exams.",
      "Increase daily study focus on subjects with approaching dates."
    ];
  }

  res.status(200).json({
    success: true,
    data: {
      subjects: predictions,
      overview,
      insights,
    },
  });
});
