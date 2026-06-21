'use strict';

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const { apiLimiter, geminiLimiter } = require('./middleware/rateLimiter.middleware');

const errorHandler = require('./middleware/error.middleware');
const AppError     = require('./utils/AppError');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes        = require('./routes/auth.routes');
const userRoutes        = require('./routes/user.routes');
const sessionRoutes     = require('./routes/session.routes');
const statsRoutes       = require('./routes/stats.routes');
const aiRoutes          = require('./routes/ai.routes');
const achievementRoutes = require('./routes/achievement.routes');
const geminiRoutes      = require('./routes/gemini.routes');   // ← NEW
const subjectRoutes     = require('./routes/subject.routes');
const chapterRoutes     = require('./routes/chapter.routes');
const semesterRoutes    = require('./routes/semester.routes');
const debugRoutes       = require('./routes/debug.routes');
const examRoutes        = require('./routes/exam.routes');
const plannerRoutes     = require('./routes/planner.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



if (process.env.NODE_ENV !== 'development') {
  app.use('/api/', apiLimiter);
} else {
  console.log('⚠️ [DEV] Rate limiter bypassed');
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status:      'ok',
      environment: process.env.NODE_ENV,
      timestamp:   new Date().toISOString(),
      gemini:      !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth',                        authRoutes);
app.use('/api/auth',                           authRoutes);
app.use('/api/v1/users',                       userRoutes);
app.use('/api/v1/sessions',                    sessionRoutes);
app.use('/api/v1/stats',                       statsRoutes);
app.use('/api/v1/ai',                          aiRoutes);
app.use('/api/v1/achievements',                achievementRoutes);
app.use('/api/v1/subjects',                    subjectRoutes);
app.use('/api/v1/chapters',                    chapterRoutes);
app.use('/api/v1/semester-progress',          semesterRoutes);
app.use('/api/ai',              geminiLimiter, geminiRoutes);  // ← NEW — note: /api/ai not /api/v1/ai
app.use('/api/debug',                          debugRoutes);
app.use('/api/v1/exams',                       examRoutes);
app.use('/api/exams',                          examRoutes);
app.use('/api/v1/planner',                     plannerRoutes);
app.use('/api/planner',                        plannerRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

app.use(errorHandler);

module.exports = app;


