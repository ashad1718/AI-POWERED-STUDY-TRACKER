import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, TrendingUp, Calendar, Plus,
  Award, ChevronRight, BookOpen, AlertCircle, Layers, ArrowUpRight,
  PieChart as PieIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';
import AICoachCard from '../components/AICoachCard';
import { useTheme } from '../context/ThemeContext';
import { statsAPI, sessionAPI, semesterAPI } from '../services/api';
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

  const fetchAll = async () => {
    console.log('[DASHBOARD] Dashboard request started');
    setLoading(true);
    setError('');
    try {
      const [overviewRes, weeklyRes, subjectsRes, sessionsRes, semesterRes] = await Promise.all([
        statsAPI.overview(),
        statsAPI.weekly(),
        statsAPI.subjects(),
        sessionAPI.getAll({ limit: 5 }),
        semesterAPI.getProgress(),
      ]);
      setOverview(overviewRes.data.data);
      setWeeklyData(weeklyRes.data.data.weeklyData);
      setPieData(subjectsRes.data.data.pieData);
      setSessions(sessionsRes.data.data.sessions);
      setSemester(semesterRes.data.data);
      console.log('[DASHBOARD] Dashboard request completed');
    } catch (err) {
      const requestUrl = err.config?.url || 'unknown URL';
      const statusCode = err.response?.status || 'unknown status';
      const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error occurred';

      console.error(`[DASHBOARD] Dashboard request failed. URL: ${requestUrl}, Status: ${statusCode}, Error: ${errMsg}`);
      setError(`Failed to load dashboard: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
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

  const hasSubjects = semester && semester.subjects && semester.subjects.length > 0;

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
          <Link
            to="/semester-setup"
            className="px-4 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 font-semibold text-sm transition-all"
          >
            Rollover Semester
          </Link>
          <Link
            to="/study-session"
            className="px-5 py-2.5 bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] text-[#070B14] font-bold text-sm rounded-xl shadow-[0_4px_15px_rgba(94,234,212,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Start Session
          </Link>
        </div>
      </div>

      {/* ── Semester Progress Widget ───────────────────────────────────────── */}
      {hasSubjects ? (
        <GlassCard className="dashboard-stagger-card bg-gradient-to-br from-[#0F172A]/80 to-[#162033]/40 border-t border-[#5EEAD4]/20" hoverEffect={false}>
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
              const totalChaps = sub.chapters?.length || 0;
              const completedChaps = sub.chapters?.filter(c => c.completed).length || 0;
              const subPercent = totalChaps > 0 ? Math.round((completedChaps / totalChaps) * 100) : 0;
              
              return (
                <div key={sub._id || idx} className="p-3.5 rounded-xl bg-white/2 border border-white/5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm truncate max-w-[150px]">{sub.name}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{completedChaps}/{totalChaps} Chaps</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#5EEAD4] rounded-full"
                      style={{ width: `${subPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                    <span>{subPercent}% Completed</span>
                    <Link to="/chapters" className="text-[#6EA8FE] hover:underline flex items-center gap-0.5">
                      Syllabus <ArrowUpRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="dashboard-stagger-card border border-dashed border-[#5EEAD4]/20 py-8 text-center" hoverEffect={false}>
          <Layers className="w-10 h-10 mx-auto text-[#5EEAD4] mb-3 opacity-60" />
          <h4 className="text-md font-bold text-white">No Semester Curriculum Setup Yet</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto mb-4">
            Initialize your active subjects and syllabus chapters to unlock graduation progress tracking and AICoach recommendations.
          </p>
          <Link
            to="/semester-setup"
            className="px-5 py-2 bg-[#5EEAD4] hover:opacity-90 text-[#070B14] font-bold text-xs rounded-xl inline-block"
          >
            Configure Semester Now
          </Link>
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
              <h3 className="text-3xl font-black text-white mt-2 font-mono">{streak} Days</h3>
            </div>
            <div className="p-2.5 bg-[#6EA8FE]/20 text-[#6EA8FE] rounded-xl"><Award className="w-5 h-5" /></div>
          </div>
          <div className="flex items-center text-xs text-green-400 space-x-1 mt-4">
            <span>Consistency Score: {consistency}%</span>
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
            <div className="flex-1 w-full text-xs min-h-[260px] flex items-center justify-center">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-60" />
                  <p className="text-sm font-semibold text-gray-400">No study sessions logged yet.</p>
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
          <div className="flex-1 w-full flex items-center justify-center text-xs min-h-[260px]">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <PieIcon className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-60" />
                <p className="text-sm font-semibold text-gray-400">No subject analysis available.</p>
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
          <GlassCard className="dashboard-stagger-card min-h-[260px] flex flex-col justify-between" hoverEffect={false}>
            <div>
              <h4 className="text-base font-bold text-white mb-6">Recent Study Sessions</h4>
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No sessions logged yet.{' '}
                  <Link to="/study-session" className="text-[#5EEAD4] hover:underline">Start one now →</Link>
                </p>
              ) : (
                <div className="space-y-4">
                  {sessions.slice(0, 4).map((session, idx) => (
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
            <div className="pt-4 mt-6 border-t border-white/5 text-center">
              <Link to="/study-session" className="text-xs font-semibold text-[#6EA8FE] hover:underline">
                View all sessions →
              </Link>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
