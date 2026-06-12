import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, TrendingUp, Calendar, Plus,
  Award, ChevronRight, BookOpen, AlertCircle
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
import { statsAPI, sessionAPI } from '../services/api';
import { useGeminiAnalysis } from '../hooks/useGeminiAnalysis';

const COLORS = ['#6C63FF', '#00E5FF', '#A78BFA', '#34D399', '#F472B6', '#FBBF24'];

const Dashboard = ({ user }) => {
  const containerRef = useRef(null);

  const [overview,   setOverview]   = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [pieData,    setPieData]    = useState([]);
  const [sessions,   setSessions]   = useState([]);
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

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [overviewRes, weeklyRes, subjectsRes, sessionsRes] = await Promise.all([
          statsAPI.overview(),
          statsAPI.weekly(),
          statsAPI.subjects(),
          sessionAPI.getAll({ limit: 5 }),
        ]);
        setOverview(overviewRes.data.data);
        setWeeklyData(weeklyRes.data.data.weeklyData);
        setPieData(subjectsRes.data.data.pieData);
        setSessions(sessionsRes.data.data.sessions);
      } catch (err) {
        setError('Failed to load dashboard data. Please refresh.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
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
          <span className="w-10 h-10 border-4 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
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

  return (
    <div ref={containerRef} className="space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome, <span className="text-[#00E5FF] capitalize">{user?.name || 'Scholar'}</span>!
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here is your cognitive study overview for this week.</p>
        </div>
        <Link
          to="/study-session"
          className="px-5 py-3 bg-gradient-to-r from-[#6C63FF] to-[#00E5FF] text-white font-semibold text-sm rounded-xl shadow-[0_4px_15px_rgba(108,99,255,0.3)] hover:shadow-[0_4px_20px_rgba(108,99,255,0.5)] hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Start Study Session
        </Link>
      </div>

      {/* Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Studied</p>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">{totalHours}h</h3>
            </div>
            <div className="p-2.5 bg-[#6C63FF]/20 text-[#6C63FF] rounded-xl"><Clock className="w-5 h-5" /></div>
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
            <div className="p-2.5 bg-[#00E5FF]/20 text-[#00E5FF] rounded-xl"><BookOpen className="w-5 h-5" /></div>
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
            <div className="p-2.5 bg-[#6C63FF]/20 text-[#6C63FF] rounded-xl"><Award className="w-5 h-5" /></div>
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
            <div className="p-2.5 bg-[#00E5FF]/20 text-[#00E5FF] rounded-xl"><Calendar className="w-5 h-5" /></div>
          </div>
          <div className="flex items-center text-xs text-gray-400 mt-4">
            <span>Optimized syllabus logging</span>
          </div>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Area Chart */}
        <div className="lg:col-span-2">
          <GlassCard className="dashboard-stagger-card h-[400px] flex flex-col" hoverEffect={false}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-base font-bold text-white">Weekly Focus Analysis</h4>
                <p className="text-xs text-gray-400">Total study hours per day</p>
              </div>
            </div>
            <div className="flex-1 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#090D26', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="hours" stroke="#6C63FF" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Subject Pie Chart */}
        <GlassCard className="dashboard-stagger-card h-[400px] flex flex-col" hoverEffect={false}>
          <div className="mb-4">
            <h4 className="text-base font-bold text-white">Subject Breakdown</h4>
            <p className="text-xs text-gray-400">Hours per topic</p>
          </div>
          <div className="flex-1 w-full flex items-center justify-center text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#090D26', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={8} wrapperStyle={{ paddingTop: 10, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
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
                  <Link to="/study-session" className="text-[#00E5FF] hover:underline">Start one now →</Link>
                </p>
              ) : (
                <div className="space-y-4">
                  {sessions.slice(0, 4).map((session, idx) => (
                    <div
                      key={session._id || idx}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-[#6C63FF]/20 text-[#6C63FF] rounded-lg">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{session.subject}</span>
                          <span className="text-xs text-gray-400">{session.date}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[#00E5FF] font-mono">{session.duration} mins</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-4 mt-6 border-t border-white/5 text-center">
              <Link to="/study-session" className="text-xs font-semibold text-[#6C63FF] hover:underline">
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
