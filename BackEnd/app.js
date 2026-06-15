'use strict';

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');

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

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many auth attempts. Please try again in 15 minutes.', code: 'AUTH_RATE_LIMITED' },
  },
});

// Gemini limiter — stricter: 5 requests per minute per IP
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many AI requests. Please wait a moment.', code: 'AI_RATE_LIMITED' },
  },
});

app.use('/api/', apiLimiter);

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
app.use('/api/v1/auth',         authLimiter,   authRoutes);
app.use('/api/auth',            authLimiter,   authRoutes);
app.use('/api/v1/users',                       userRoutes);
app.use('/api/v1/sessions',                    sessionRoutes);
app.use('/api/v1/stats',                       statsRoutes);
app.use('/api/v1/ai',                          aiRoutes);
app.use('/api/v1/achievements',                achievementRoutes);
app.use('/api/v1/subjects',                    subjectRoutes);
app.use('/api/v1/chapters',                    chapterRoutes);
app.use('/api/v1/semester-progress',          semesterRoutes);
app.use('/api/ai',              geminiLimiter, geminiRoutes);  // ← NEW — note: /api/ai not /api/v1/ai

app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

app.use(errorHandler);

module.exports = app;
