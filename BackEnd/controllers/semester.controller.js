'use strict';

const Semester     = require('../models/Semester');
const Subject      = require('../models/Subject');
const Chapter      = require('../models/Chapter');
const Session      = require('../models/Session');
const AppError     = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET /api/v1/semester-progress ─────────────────────────────────────────────
exports.getSemesterProgress = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Find active semester
  const activeSemester = await Semester.findOne({ userId, active: true, isDeleted: false });
  if (!activeSemester) {
    return res.status(200).json({
      success: true,
      data: {
        semesterExists: false,
        semester: null,
      },
    });
  }

  // 2. Fetch active subjects linked to this semester
  const activeSubjects = await Subject.find({
    userId,
    semesterId: activeSemester._id,
    isDeleted: false,
  }).sort({ order: 1 });

  const activeSubjectIds = activeSubjects.map(s => s._id);

  // 3. Fetch all non-deleted chapters for these active subjects
  const chapters = await Chapter.find({
    userId,
    subjectId: { $in: activeSubjectIds },
    isDeleted: false,
  }).sort({ order: 1, createdAt: -1 });

  // Calculate stats per subject
  let overallEstimatedHours = 0;
  let overallActualHours = 0;
  let completedChaptersCount = 0;
  let totalChaptersCount = 0;

  const subjectBreakdown = activeSubjects.map(subject => {
    const subId = subject._id.toString();
    const subChapters = chapters.filter(c => c.subjectId.toString() === subId);
    
    let totalEstimatedHours = 0;
    let totalActualHours = 0;
    let completedChapters = 0;

    const chaptersWithPerformance = subChapters.map(c => {
      const estimated = c.estimatedTime || 2; // fallback to 2 hours
      const actual = c.actualTime || 0;
      const difference = parseFloat((actual - estimated).toFixed(2));
      
      let status = 'not_started';
      if (c.completed) {
        if (actual < estimated) {
          status = 'Completed Early';
        } else if (actual === estimated) {
          status = 'Completed On Time';
        } else {
          status = 'Took Longer Than Expected';
        }
      } else {
        if (actual > estimated) {
          status = 'Took Longer Than Expected';
        } else if (actual > 0) {
          status = 'In Progress';
        } else {
          status = 'Not Started';
        }
      }

      totalEstimatedHours += estimated;
      totalActualHours += actual;
      if (c.completed) completedChapters++;

      return {
        ...c.toObject(),
        estimatedTime: estimated,
        actualTime: actual,
        difference,
        status,
      };
    });

    const totalChapters = subChapters.length;
    const remainingChapters = totalChapters - completedChapters;
    const completionPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    const remainingHours = Math.max(0, parseFloat((totalEstimatedHours - totalActualHours).toFixed(2)));
    
    let status = 'On Track';
    if (totalActualHours > totalEstimatedHours) {
      status = 'Behind Schedule';
    } else if (totalActualHours < totalEstimatedHours && completionPercentage > 0) {
      status = 'Ahead Of Schedule';
    }

    overallEstimatedHours += totalEstimatedHours;
    overallActualHours += totalActualHours;
    completedChaptersCount += completedChapters;
    totalChaptersCount += totalChapters;

    return {
      _id: subject._id,
      name: subject.name,
      active: subject.active,
      isArchived: subject.isArchived,
      completionThreshold: subject.completionThreshold,
      totalChapters,
      completedChapters,
      remainingChapters,
      completionPercentage,
      progressPercentage: completionPercentage,
      totalEstimatedHours: parseFloat(totalEstimatedHours.toFixed(2)),
      totalActualHours: parseFloat(totalActualHours.toFixed(2)),
      remainingHours,
      status,
      order: subject.order,
      chapters: chaptersWithPerformance,
    };
  });

  const remainingChaptersCount = totalChaptersCount - completedChaptersCount;
  const semesterProgress = totalChaptersCount > 0 ? Math.round((completedChaptersCount / totalChaptersCount) * 100) : 0;

  // Calculate Predicted Completion Date
  let predictedCompletionDate = null;
  const remainingHours = Math.max(0, overallEstimatedHours - overallActualHours);
  if (remainingHours === 0) {
    predictedCompletionDate = new Date().toISOString().split('T')[0];
  } else if (activeSemester.expectedHoursPerWeek > 0) {
    const remainingWeeks = remainingHours / activeSemester.expectedHoursPerWeek;
    const remainingDays = Math.ceil(remainingWeeks * 7);
    const predicted = new Date();
    predicted.setDate(predicted.getDate() + remainingDays);
    predictedCompletionDate = predicted.toISOString().split('T')[0];
  } else {
    predictedCompletionDate = activeSemester.endDate ? new Date(activeSemester.endDate).toISOString().split('T')[0] : null;
  }

  // Calculate hours saved / hours exceeded
  const hoursSaved = Math.max(0, parseFloat((overallEstimatedHours - overallActualHours).toFixed(2)));
  const hoursExceeded = Math.max(0, parseFloat((overallActualHours - overallEstimatedHours).toFixed(2)));

  res.status(200).json({
    success: true,
    data: {
      semesterExists: true,
      semester: activeSemester,
      totalSubjects: activeSubjects.length,
      completedChapters: completedChaptersCount,
      remainingChapters: remainingChaptersCount,
      totalChapters: totalChaptersCount,
      semesterProgress,
      overallProgress: semesterProgress,
      subjectBreakdown,
      subjects: subjectBreakdown,
      totalSemesterHours: parseFloat(overallActualHours.toFixed(2)),
      estimatedHours: parseFloat(overallEstimatedHours.toFixed(2)),
      actualHours: parseFloat(overallActualHours.toFixed(2)),
      hoursSaved,
      hoursExceeded,
      completedChaptersCount,
      remainingChaptersCount,
      predictedCompletionDate,
    },
  });
  console.log('[ANALYTICS] Performance Data Generated:', JSON.stringify(subjectBreakdown));
});

// ─── POST /api/v1/semester-progress/setup ─────────────────────────────────────
exports.setupNewSemester = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    name,
    startDate,
    endDate,
    expectedHoursPerWeek,
    goalGPA,
    archiveActive = true,
    newSubjects = [],
  } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Semester name is required.', 400);
  }
  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required.', 400);
  }
  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError('Start date must be before end date.', 400);
  }
  if (expectedHoursPerWeek === undefined || expectedHoursPerWeek === null || expectedHoursPerWeek <= 0) {
    throw new AppError('Expected study hours per week must be greater than 0.', 400);
  }

  // 1. Mark all previous semesters for user as inactive
  await Semester.updateMany({ userId, active: true }, { active: false });

  // 2. Create the new semester
  const semester = await Semester.create({
    userId,
    name: name.trim(),
    startDate,
    endDate,
    expectedHoursPerWeek: Number(expectedHoursPerWeek),
    goalGPA: goalGPA ? Number(goalGPA) : undefined,
    active: true,
  });

  // 3. Archive active subjects if requested
  if (archiveActive) {
    await Subject.updateMany(
      { userId, active: true, isArchived: false, isDeleted: false },
      { active: false, isArchived: true }
    );
  }

  // 4. Create new subjects linked to this semester
  const createdSubjects = [];
  for (let i = 0; i < newSubjects.length; i++) {
    const subName = newSubjects[i];
    if (subName && subName.trim()) {
      const subject = await Subject.create({
        userId,
        semesterId: semester._id,
        name: subName.trim(),
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
      semester,
      createdSubjects,
    },
  });
});
