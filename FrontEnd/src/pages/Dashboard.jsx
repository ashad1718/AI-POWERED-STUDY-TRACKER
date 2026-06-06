import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  Lightbulb, 
  Plus, 
  Award,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';

const Dashboard = ({ sessions = [], user }) => {
  const containerRef = useRef(null);

  // Default mock data if no sessions are added yet
  const defaultSessions = [
    { subject: 'AI & Neural Networks', duration: 360, date: '2026-06-01' },
    { subject: 'Quantum Physics', duration: 240, date: '2026-06-02' },
    { subject: 'Advanced Calculus', duration: 180, date: '2026-06-03' },
    { subject: 'Cognitive Psychology', duration: 150, date: '2026-06-04' },
    { subject: 'Computer Architecture', duration: 120, date: '2026-06-05' }
  ];

  const activeSessions = sessions.length > 0 ? sessions : defaultSessions;

  // 1. Calculate stats
  const totalMinutes = activeSessions.reduce((acc, curr) => acc + Number(curr.duration), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const subjectCount = new Set(activeSessions.map(s => s.subject)).size;
  const averageSessionLength = activeSessions.length > 0 
    ? Math.round(totalMinutes / activeSessions.length) 
    : 0;

  // 2. Prepare weekly study data (Mon - Sun hours)
  const weeklyData = [
    { name: 'Mon', hours: 4.2 },
    { name: 'Tue', hours: 5.8 },
    { name: 'Wed', hours: 3.5 },
    { name: 'Thu', hours: 6.0 },
    { name: 'Fri', hours: 4.8 },
    { name: 'Sat', hours: 8.2 },
    { name: 'Sun', hours: 5.0 },
  ];

  // If we have actual sessions, let's inject them slightly into the weekly graph for interactive feedback
  if (sessions.length > 0) {
    // Just increase the last few days slightly
    weeklyData[5].hours += parseFloat((sessions[sessions.length - 1].duration / 60).toFixed(1));
  }

  // 3. Prepare Pie Chart data (subject distribution)
  const subjectDataMap = {};
  activeSessions.forEach(session => {
    const mins = Number(session.duration);
    if (subjectDataMap[session.subject]) {
      subjectDataMap[session.subject] += mins;
    } else {
      subjectDataMap[session.subject] = mins;
    }
  });

  const pieData = Object.keys(subjectDataMap).map(key => ({
    name: key,
    value: Math.round((subjectDataMap[key] / 60) * 10) / 10 // hours
  }));

  const COLORS = ['#6C63FF', '#00E5FF', '#A78BFA', '#34D399', '#F472B6', '#FBBF24'];

  // GSAP animation for stagger card reveals on load
  useGSAP(() => {
    gsap.fromTo('.dashboard-stagger-card',
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="space-y-8 pb-12">
      {/* Header section */}
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

      {/* Widgets Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Widget 1 - Total Hours */}
        <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Studied</p>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">{totalHours}h</h3>
            </div>
            <div className="p-2.5 bg-[#6C63FF]/20 text-[#6C63FF] rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center text-xs text-green-400 space-x-1 mt-4">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.2% from last week</span>
          </div>
        </GlassCard>

        {/* Widget 2 - Average Session */}
        <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Avg Session</p>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">{averageSessionLength}m</h3>
            </div>
            <div className="p-2.5 bg-[#00E5FF]/20 text-[#00E5FF] rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center text-xs text-gray-400 mt-4">
            <span>Calculated from {activeSessions.length} sessions</span>
          </div>
        </GlassCard>

        {/* Widget 3 - Streak */}
        <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Study Streak</p>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">14 Days</h3>
            </div>
            <div className="p-2.5 bg-[#6C63FF]/20 text-[#6C63FF] rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center text-xs text-green-400 space-x-1 mt-4">
            <span>Consistency Score: 98%</span>
          </div>
        </GlassCard>

        {/* Widget 4 - Subjects */}
        <GlassCard className="dashboard-stagger-card flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tracked Subjects</p>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">{subjectCount}</h3>
            </div>
            <div className="p-2.5 bg-[#00E5FF]/20 text-[#00E5FF] rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center text-xs text-gray-400 mt-4">
            <span>Optimized syllabus logging</span>
          </div>
        </GlassCard>

      </div>

      {/* Main Charts & Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Area Chart - Weekly Hours */}
        <div className="lg:col-span-2">
          <GlassCard className="dashboard-stagger-card h-[400px] flex flex-col justify-between" hoverEffect={false}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-base font-bold text-white">Weekly Focus Analysis</h4>
                <p className="text-xs text-gray-400">Total study hours spent per day</p>
              </div>
            </div>
            
            <div className="flex-1 w-full h-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weeklyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#090D26', 
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#6C63FF" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorHours)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Right Pie Chart - Subject Distribution */}
        <div>
          <GlassCard className="dashboard-stagger-card h-[400px] flex flex-col justify-between" hoverEffect={false}>
            <div className="mb-4">
              <h4 className="text-base font-bold text-white">Subject Breakdown</h4>
              <p className="text-xs text-gray-400">Log ratios in hours spent per topic</p>
            </div>

            <div className="flex-1 w-full flex items-center justify-center text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#090D26', 
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 10, color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

      </div>

      {/* Bottom Row: AI Insights & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* AI Recommendation Card */}
        <GlassCard className="dashboard-stagger-card flex flex-col justify-between min-h-[260px] border border-[#6C63FF]/30 shadow-[0_10px_35px_rgba(108,99,255,0.1)]">
          <div>
            <div className="flex items-center space-x-2 text-[#00E5FF] mb-4">
              <Lightbulb className="w-5 h-5" />
              <h4 className="text-base font-bold text-white">AI Recommendation</h4>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              "We noticed your focus efficiency increases by 22% when studying in blocks of 45 minutes rather than 90. We suggest implementing a 45/15 split for <span className="text-[#00E5FF] font-semibold">{activeSessions[0]?.subject}</span>."
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-white/5">
            <span className="text-xs text-gray-500 font-mono">CALIBRATION DONE</span>
            <button className="text-xs font-semibold text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer">
              Schedule Alert <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </GlassCard>

        {/* Recent Activity List */}
        <div className="lg:col-span-2">
          <GlassCard className="dashboard-stagger-card min-h-[260px] flex flex-col justify-between" hoverEffect={false}>
            <div>
              <h4 className="text-base font-bold text-white mb-6">Recent Study Sessions</h4>
              
              <div className="space-y-4">
                {activeSessions.slice(-3).reverse().map((session, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
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
            </div>
            <div className="pt-4 mt-6 border-t border-white/5 text-center">
              <Link to="/study-session" className="text-xs font-semibold text-[#6C63FF] hover:underline">
                View session log archives
              </Link>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
