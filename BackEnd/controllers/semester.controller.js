'use strict';

const Subject      = require('../models/Subject');
const Chapter      = require('../models/Chapter');
const Session      = require('../models/Session');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET /api/v1/semester-progress ─────────────────────────────────────────────
exports.getSemesterProgress = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Fetch active, non-archived, non-deleted subjects
  const activeSubjects = await Subject.find({
    userId,
    active: true,
    isArchived: false,
    isDeleted: false,
  }).sort({ order: 1 });

  const activeSubjectIds = activeSubjects.map(s => s._id);

  // 2. Fetch all non-deleted chapters for these active subjects
  const chapters = await Chapter.find({
    userId,
    subjectId: { $in: activeSubjectIds },
    isDeleted: false,
  });

  // 3. Fetch all study sessions logged for this user
  // (We'll aggregate study time per active subject ID)
  const sessions = await Session.find({
    userId,
    subjectId: { $in: activeSubjectIds },
  });

  // Calculate durations per subject
  const durationMap = {};
  sessions.forEach(s => {
    const subId = s.subjectId.toString();
    durationMap[subId] = (durationMap[subId] || 0) + s.duration;
  });

  // Calculate chapter stats per subject
  const subjectBreakdown = activeSubjects.map(subject => {
    const subId = subject._id.toString();
    const subChapters = chapters.filter(c => c.subjectId.toString() === subId);
    const totalChapters = subChapters.length;
    const completedChapters = subChapters.filter(c => c.completed).length;
    const remainingChapters = totalChapters - completedChapters;
    const progressPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    const studyMinutes = durationMap[subId] || 0;
    const studyHours = parseFloat((studyMinutes / 60).toFixed(1));

    return {
      _id: subject._id,
      name: subject.name,
      active: subject.active,
      isArchived: subject.isArchived,
      completionThreshold: subject.completionThreshold,
      totalChapters,
      completedChapters,
      remainingChapters,
      progressPercentage,
      studyHours,
      order: subject.order,
      chapters: subChapters,
    };
  });

  // 4. Compute overall stats
  const totalSubjects = activeSubjects.length;
  const completedChapters = chapters.filter(c => c.completed).length;
  const totalChapters = chapters.length;
  const remainingChapters = totalChapters - completedChapters;
  const semesterProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      totalSubjects,
      completedChapters,
      remainingChapters,
      totalChapters,
      semesterProgress,
      overallProgress: semesterProgress,
      subjectBreakdown,
      subjects: subjectBreakdown,
    },
  });
});

// ─── POST /api/v1/semester-setup ──────────────────────────────────────────────
exports.setupNewSemester = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { archiveActive = true, newSubjects = [] } = req.body;

  // 1. Archive active subjects if requested
  if (archiveActive) {
    await Subject.updateMany(
      { userId, active: true, isArchived: false, isDeleted: false },
      { active: false, isArchived: true }
    );
  }

  // 2. Create new subjects
  const createdSubjects = [];
  for (let i = 0; i < newSubjects.length; i++) {
    const name = newSubjects[i];
    if (name && name.trim()) {
      const subject = await Subject.create({
        userId,
        name: name.trim(),
        active: true,
        isArchived: false,
        order: i,
      });
      createdSubjects.push(subject);
    }
  }

  res.status(201).json({
    success: true,
    message: 'New semester setup completed successfully.',
    data: {
      createdSubjects,
    },
  });
});
