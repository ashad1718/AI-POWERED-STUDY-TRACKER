import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, TrendingUp, Calendar, Plus,
  Award, ChevronRight, BookOpen, AlertCircle, Layers, ArrowUpRight,
  PieChart as PieIcon, Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';
import AICoachCard from '../components/AICoachCard';
import AIStudyPlannerSection from '../components/AIStudyPlannerSection';
import ExamPredictorSection from '../components/ExamPredictorSection';
import StudyHeatmap from '../components/StudyHeatmap';
import { useTheme } from '../context/ThemeContext';
import { statsAPI, sessionAPI, semesterAPI, examAPI } from '../services/api';
import { useGeminiAnalysis } from '../hooks/useGeminiAnalysis';

const COLORS = ['#6EA8FE', '#5EEAD4', '#A78BFA', '#34D399', '#F472B6', '#FBBF24'];

const Dashboard = ({ user }) => {
  const { isDark } = useTheme();
  const chartColors = isDark 
    ? ['#6EA8FE', '#5EEAD4', '#A78BFA', '#34D399', '#F472B6', '#FBBF24']
    : ['#4F7CFF', '#00C2A8', '#8B5CF6', '#10B981', '#EC4899', '#F59E0B'];

  const containerRef = useRef(null);

  const [overview,   setOverview]   = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [pieData,    setPieData]    = useState([]);
  const [sessions,   setSessions]   = useState([]);
  const [semester,   setSemester]   = useState(null);
  const [predictionsData, setPredictionsData] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Gemini AI Coach hook
  const {
    analyze,
    data:        aiData,
    loading:     aiLoading,
    error:       aiError,
    hasAnalysed,
  } = useGeminiAnalysis();

  const fetchAll = async (isSilent = false) => {
    console.log('[DASHBOARD] Dashboard request started');
    if (!isSilent) {
      setLoading(true);
    }
    setError('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [overviewRes, weeklyRes, subjectsRes, sessionsRes, semesterRes, predictionsRes] = await Promise.all([
        statsAPI.overview(),
        statsAPI.weekly(todayStr),
        statsAPI.subjects(),
        sessionAPI.getAll({ limit: 5 }),
        semesterAPI.getProgress(),
        examAPI.getPredictions(),
      ]);
      setOverview(overviewRes.data.data);
      setWeeklyData(weeklyRes.data.data.weeklyData);
      setPieData(subjectsRes.data.data.pieData);
      setSessions(sessionsRes.data.data.sessions);
      setSemester(semesterRes.data.data);
      setPredictionsData(predictionsRes.data.data);
      console.log('[FRONTEND] Analytics Response Received', {
        overview: overviewRes.data,
        weekly: weeklyRes.data,
        subjects: subjectsRes.data,
        semester: semesterRes.data
      });
      console.log('[DASHBOARD] Dashboard request completed');
    } catch (err) {
      const requestUrl = err.config?.url || 'unknown URL';
      const statusCode = err.response?.status || 'unknown status';
      const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error occurred';

      console.error(`[DASHBOARD] Dashboard request failed. URL: ${requestUrl}, Status: ${statusCode}, Error: ${errMsg}`);
      setError(`Failed to load dashboard: ${errMsg}`);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAll(false);
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      console.log('[DASHBOARD] Auto refreshing analytics due to event');
      fetchAll(true);
    };
    window.addEventListener('analytics-refresh', handleRefresh);
    return () => {
      window.removeEventListener('analytics-refresh', handleRefresh);
    };
  }, []);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.dashboard-stagger-card',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
      );
    }
  }, { scope: containerRef, dependencies: [loading] });

  const totalHours   = overview ? (overview.totalMinutes / 60).toFixed(1) : '—';
  const avgSession   = overview?.averageSessionLength ?? '—';
  const streak       = overview?.currentStreak ?? '—';
  const subjectCount = overview?.subjectCount ?? '—';
  const consistency  = overview?.consistencyScore ?? '—';

  const hasWeeklyData = weeklyData && weeklyData.some(d => d.hours > 0);
  const hasPieData = pieData && pieData.length > 0 && pieData.some(d => d.value > 0);
  const hasPerformanceData = semester?.subjects && semester.subjects.length > 0 && semester.subjects.some(s => s.totalEstimatedHours > 0 || s.totalActualHours > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <span className="w-10 h-10 border-4 border-[#5EEAD4] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const hasSemester = semester && semester.semesterExists;
  const hasSubjects = hasSemester && semester.subjects && semester.subjects.length > 0;

  return (
    <div ref={containerRef} className="space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome, <span className="text-[#5EEAD4] capitalize">{user?.name || 'Scholar'}</span>!
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here is your semester learning and syllabus overview.</p>
        </div>
        <div className="flex items-center gap-3">
          {!hasSemester ? (
            <Link
              to="/semester-setup"
              className="px-5 py-2.5 bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] text-[#070B14] font-bold text-sm rounded-xl shadow-[0_4px_15px_rgba(94,234,212,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
            >
              ⚙ Configure Semester
            </Link>
          ) : (
            <>
              <Link
                to="/semester-setup"
                className="px-4 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 font-semibold text-sm transition-all"
              >
                ⚙ Configure Semester
              </Link>
              <Link
                to="/study-session"
                className="px-5 py-2.5 bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] text-[#070B14] font-bold text-sm rounded-xl shadow-[0_4px_15px_rgba(94,234,212,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Start Session
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Semester Blocker Card / Intake Setup ───────────────────────────── */}
      {!hasSemester ? (
        <GlassCard className="dashboard-stagger-card border border-dashed border-[#5EEAD4]/20 py-12 text-center" hoverEffect={false}>
          <Layers className="w-12 h-12 mx-auto text-[#5EEAD4] mb-4 opacity-60 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">Please configure your semester first.</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            You must set up a semester configuration (dates, goals, expected hours) before managing subjects, chapters, or logging study sessions.
          </p>
          <Link
            to="/semester-setup"
            className="px-6 py-3 bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] text-[#070B14] font-bold text-sm rounded-xl hover:shadow-[0_0_20px_rgba(94,234,212,0.4)] transition-all inline-block"
          >
            ⚙ Configure Semester
          </Link>
        </GlassCard>
      ) : (
        <>
          {/* ── Semester Progress Widget & Overview Card ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <GlassCard className="dashboard-stagger-card lg:col-span-2 bg-gradient-to-br from-[#0F172A]/80 to-[#162033]/40 border-t border-[#5EEAD4]/20" hoverEffect={false}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <span className="px-2.5 py-1 text-[10px] font-black tracking-widest rounded bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 text-[#5EEAD4] uppercase">
                    Active Semester Tracker
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">Overall Syllabus Completion</h3>
                  <p className="text-xs text-gray-400">Chapters completed across all enrolled subjects</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-3xl font-black text-white">{semester.completedChapters} / {semester.totalChapters}</span>
                    <span className="text-xs text-gray-500 block">Chapters Completed</span>
                  </div>
                  <div className="text-right border-l border-white/10 pl-6">
                    <span className="text-3xl font-black text-[#5EEAD4]">{semester.overallProgress}%</span>
                    <span className="text-xs text-gray-500 block">Completion Rate</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] rounded-full transition-all duration-1000"
                  style={{ width: `${semester.overallProgress}%` }}
                />
              </div>

              {/* Grid of Active Subjects progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
                {semester.subjects.map((sub, idx) => {
                  return (
                    <div key={sub._id || idx} className="p-3.5 rounded-xl bg-white/2 border border-white/5 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-sm truncate max-w-[100px]">{sub.name}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{sub.completedChapters}/{sub.totalChapters} Chaps</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#5EEAD4] rounded-full"
                          style={{ width: `${sub.completionPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                        <span>{sub.completionPercentage}% Completed</span>
                        <Link to="/chapters" className="text-[#6EA8FE] hover:underline flex items-center gap-0.5">
                          Syllabus <ArrowUpRight className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini Analytics Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Hours Saved</span>
                  <span className="text-lg font-extrabold text-green-400 font-mono">{semester.hoursSaved || 0}h</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Hours Exceeded</span>
                  <span className="text-lg font-extrabold text-red-400 font-mono">{semester.hoursExceeded || 0}h</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Completed Chapters</span>
                  <span className="text-lg font-extrabold text-white font-mono">{semester.completedChaptersCount || 0}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Remaining Chapters</span>
                  <span className="text-lg font-extrabold text-white font-mono">{semester.remainingChaptersCount || 0}</span>
                </div>
              </div>
            </GlassCard>

            {/* Semester Overview Card */}
            <GlassCard className="dashboard-stagger-card lg:col-span-1 bg-gradient-to-br from-[#0F172A]/80 to-[#162033]/40 border-t border-[#A78BFA]/20" hoverEffect={false}>
              <span className="px-2.5 py-1 text-[10px] font-black tracking-widest rounded bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA] uppercase">
                Semester Overview
              </span>
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">Current Semester</span>
                  <span className="text-sm font-bold text-white truncate max-w-[150px]">{semester.semester?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">Completion %</span>
                  <span className="text-sm font-bold text-white">{semester.overallProgress}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">Estimated Hours</span>
                  <span className="text-sm font-bold text-white">{semester.estimatedHours} hrs</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">Actual Hours</span>
                  <span className="text-sm font-bold text-white">{semester.actualHours} hrs</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-gray-400">Predicted Completion</span>
                  <span className="text-sm font-bold text-[#5EEAD4] font-mono">
                    {semester.predictedCompletionDate 
                      ? new Date(semester.predictedCompletionDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ── Exam Readiness Overview Widget ─────────────────────────────────── */}
          {hasSubjects && predictionsData && (
            <GlassCard className="dashboard-stagger-card bg-gradient-to-br from-[#0F172A]/80 to-[#162033]/40 border-t border-[#6EA8FE]/20" hoverEffect={false}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="px-2.5 py-1 text-[10px] font-black tracking-widest rounded bg-[#6EA8FE]/10 border border-[#6EA8FE]/20 text-[#6EA8FE] uppercase">
                    Exam Readiness Overview
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">Syllabus Pacing Against Exams</h3>
                  <p className="text-xs text-gray-400">Pace calculations based on recent study activity</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-right">
                  <div className="border-r border-white/10 pr-6">
                    <span className="text-2xl font-black text-white">{predictionsData.overview?.totalSubjects ?? '0'}</span>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Subjects</span>
                  </div>
                  <div className="border-r border-white/10 pr-6">
                    <span className={`text-2xl font-black ${predictionsData.overview?.subjectsAtRisk > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {predictionsData.overview?.subjectsAtRisk ?? '0'}
                    </span>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Subjects At Risk</span>
                  </div>
                  <div className="border-r border-white/10 pr-6">
                    <span className="text-2xl font-black text-[#5EEAD4]">{predictionsData.overview?.averageCompletion ?? '0'}%</span>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Avg Completion</span>
                  </div>
                  <div>
                    <span className="text-sm font-black text-white font-mono block mt-1">
                      {predictionsData.overview?.expectedSemesterCompletionDate 
                        ? new Date(predictionsData.overview.expectedSemesterCompletionDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) 
                        : 'N/A'}
                    </span>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold mt-1">Expected Completion</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Stat Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Studied</p>
                  <h3 className="text-3xl font-black text-white mt-2 font-mono">{totalHours}h</h3>
                </div>
                <div className="p-2.5 bg-[#6EA8FE]/20 text-[#6EA8FE] rounded-xl"><Clock className="w-5 h-5" /></div>
              </div>
              <div className="flex items-center text-xs text-green-400 space-x-1 mt-4">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Consistency: {consistency}%</span>
              </div>
            </GlassCard>

            <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Avg Session</p>
                  <h3 className="text-3xl font-black text-white mt-2 font-mono">{avgSession}m</h3>
                </div>
                <div className="p-2.5 bg-[#5EEAD4]/20 text-[#5EEAD4] rounded-xl"><BookOpen className="w-5 h-5" /></div>
              </div>
              <div className="flex items-center text-xs text-gray-400 mt-4">
                <span>From {overview?.totalSessions ?? 0} sessions</span>
              </div>
            </GlassCard>

            <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Study Streak</p>
                  <h3 className="text-3xl font-black text-white mt-1.5 font-mono">{overview?.currentStreak ?? 0} Days</h3>
                </div>
                <div className="p-2.5 bg-[#6EA8FE]/20 text-[#6EA8FE] rounded-xl"><Flame className="w-5 h-5" /></div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                <div>
                  <span>Longest: </span>
                  <span className="text-white font-bold font-mono">{overview?.longestStreak ?? 0}d</span>
                </div>
                <div className="w-[1px] h-3 bg-white/10" />
                <div>
                  <span>Active Days: </span>
                  <span className="text-white font-bold font-mono">{overview?.totalActiveDays ?? 0}d</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tracked Subjects</p>
                  <h3 className="text-3xl font-black text-white mt-2 font-mono">{subjectCount}</h3>
                </div>
                <div className="p-2.5 bg-[#5EEAD4]/20 text-[#5EEAD4] rounded-xl"><Calendar className="w-5 h-5" /></div>
              </div>
              <div className="flex items-center text-xs text-gray-400 mt-4">
                <span>Optimized syllabus logging</span>
              </div>
            </GlassCard>
          </div>

          {/* Consistency Heatmap */}
          <div className="dashboard-stagger-card w-full">
            <StudyHeatmap />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Weekly Focus Analysis Chart */}
            <div className="lg:col-span-2">
              <GlassCard className="dashboard-stagger-card h-[400px] flex flex-col" hoverEffect={false}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-base font-bold text-text-primary">Weekly Focus Analysis</h4>
                    <p className="text-xs text-text-secondary">Total study hours per day</p>
                  </div>
                </div>
                <div className="w-full text-xs h-[280px] flex items-center justify-center">
                  {!hasWeeklyData ? (
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-60" />
                      <p className="text-sm font-semibold text-gray-400">No study data available yet.</p>
                      <p className="text-xs text-gray-500 mt-1">Start logging study sessions to see your focus trend.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={chartColors[0]} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.05)"} />
                        <XAxis dataKey="name" stroke={isDark ? "#94A3B8" : "#64748B"} />
                        <YAxis stroke={isDark ? "#94A3B8" : "#64748B"} />
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#162033' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="hours" stroke={chartColors[0]} strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Subject Breakdown Pie Chart */}
            <GlassCard className="dashboard-stagger-card h-[400px] flex flex-col" hoverEffect={false}>
              <div className="mb-4">
                <h4 className="text-base font-bold text-text-primary">Subject Breakdown</h4>
                <p className="text-xs text-text-secondary">Hours per topic</p>
              </div>
              <div className="w-full flex items-center justify-center text-xs h-[280px]">
                {!hasPieData ? (
                  <div className="text-center py-8 text-gray-500">
                    <PieIcon className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-60" />
                    <p className="text-sm font-semibold text-gray-400">No study data available yet.</p>
                    <p className="text-xs text-gray-500 mt-1">Log time against active subjects to see your breakdown.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#162033' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A', borderRadius: '8px' }} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={8} wrapperStyle={{ paddingTop: 10, color: isDark ? '#94A3B8' : '#64748B' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Performance Graph: Estimated vs. Actual Hours per Subject */}
          {semester.subjects && semester.subjects.length > 0 && (
            <GlassCard className="dashboard-stagger-card h-[400px] flex flex-col" hoverEffect={false}>
              <div className="mb-4">
                <h4 className="text-base font-bold text-white">Subject Performance: Estimated vs. Actual Hours</h4>
                <p className="text-xs text-gray-400">Comparing planned study time vs. actual hours logged</p>
              </div>
              <div className="w-full text-xs h-[280px]">
                {!hasPerformanceData ? (
                  <div className="text-center py-8 text-gray-500 flex flex-col items-center justify-center h-full">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-60" />
                    <p className="text-sm font-semibold text-gray-400">No study data available yet.</p>
                    <p className="text-xs text-gray-500 mt-1">Configure chapters with estimated time and log study sessions to see performance comparison.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={semester.subjects.map(s => ({
                        name: s.name,
                        'Estimated Hours': s.totalEstimatedHours || 0,
                        'Actual Hours': s.totalActualHours || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.05)"} />
                      <XAxis dataKey="name" stroke={isDark ? "#94A3B8" : "#64748B"} />
                      <YAxis stroke={isDark ? "#94A3B8" : "#64748B"} />
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#162033' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="Estimated Hours" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Actual Hours" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          )}

          {/* AI Coach + Recent Sessions Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* AI Study Coach — takes 2 cols */}
            <div className="lg:col-span-2 dashboard-stagger-card">
              <AICoachCard
                data={aiData}
                loading={aiLoading}
                error={aiError}
                hasAnalysed={hasAnalysed}
                onAnalyze={analyze}
              />
            </div>

            {/* Recent Sessions — takes 3 cols */}
            <div className="lg:col-span-3">
              <GlassCard 
                className="dashboard-stagger-card h-[400px] flex flex-col" 
                contentClassName="h-full flex flex-col justify-between"
                hoverEffect={false}
              >
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-base font-bold text-white mb-4 shrink-0">Recent Study Sessions</h4>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No sessions logged yet.{' '}
                      <Link to="/study-session" className="text-[#5EEAD4] hover:underline">Start one now →</Link>
                    </p>
                  ) : (
                    <div data-lenis-prevent className="flex-1 overflow-y-auto space-y-3 pr-1 scroll-smooth">
                      {sessions.map((session, idx) => (
                        <div
                          key={session._id || idx}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-[#6EA8FE]/20 text-[#6EA8FE] rounded-lg">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-white block">
                                {session.subject} {session.chapter ? ` - ${session.chapter}` : ''}
                              </span>
                              <span className="text-xs text-gray-400">{session.date}</span>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-[#5EEAD4] font-mono">{session.duration} mins</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="pt-4 mt-4 border-t border-white/5 text-center shrink-0">
                  <Link to="/study-session" className="text-xs font-semibold text-[#6EA8FE] hover:underline">
                    View all sessions →
                  </Link>
                </div>
              </GlassCard>
            </div>

          </div>

          {/* AI Study Planner Section */}
          {hasSubjects && (
            <div className="dashboard-stagger-card w-full">
              <AIStudyPlannerSection />
            </div>
          )}

          {/* Exam Predictor & Date Manager Section */}
          {hasSubjects && (
            <div className="dashboard-stagger-card w-full">
              <ExamPredictorSection 
                data={predictionsData} 
                onRefresh={() => fetchAll(true)} 
              />
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default Dashboard;
