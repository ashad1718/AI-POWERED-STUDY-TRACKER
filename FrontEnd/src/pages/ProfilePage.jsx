import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Shield, 
  Award,
  Zap, 
  Clock, 
  Star,
  CheckCircle,
  Brain
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';

const ProfilePage = ({ user = {}, sessions = [] }) => {
  const pageRef = useRef(null);

  // Default stats calculation
  const totalMins = sessions.reduce((acc, curr) => acc + Number(curr.duration), 0);
  const totalHrs = (totalMins / 60).toFixed(1);
  const totalSessions = sessions.length;

  useGSAP(() => {
    // Fade in profile components
    gsap.fromTo('.profile-stagger-card',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }
    );
  }, { scope: pageRef });

  const achievements = [
    { name: 'Pomodoro Initiate', desc: 'Log your first 25-minute study block', icon: Clock, color: 'text-[#00E5FF]', bg: 'bg-[#00E5FF]/15' },
    { name: 'Consistency King', desc: 'Maintain a study streak for 7 consecutive days', icon: Zap, color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/15' },
    { name: 'Quantum Leap', desc: 'Log a study session for over 120 minutes', icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    { name: 'Omniscient Mind', desc: 'Track more than 5 distinct courses', icon: Brain, color: 'text-pink-400', bg: 'bg-pink-500/15' }
  ];

  return (
    <div ref={pageRef} className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Profile</h1>
        <p className="text-sm text-gray-400 mt-1">Manage credentials, review achievements, and check performance scores.</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Avatar Card */}
        <div className="space-y-6">
          <GlassCard className="profile-stagger-card flex flex-col items-center justify-center text-center p-8 relative" hoverEffect={false}>
            {/* Glowing border highlight */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#6C63FF]/10 blur-2xl pointer-events-none rounded-full" />
            
            {/* Floating Avatar Visual */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative mb-6"
            >
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] p-1 shadow-[0_0_30px_rgba(108,99,255,0.4)] flex items-center justify-center">
                <div className="w-full h-full bg-[#050816] rounded-full flex items-center justify-center font-black text-white text-3xl">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
              </div>
              <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-[#050816] shadow-md" title="Active now" />
            </motion.div>

            {/* Profile Info */}
            <h3 className="text-xl font-bold text-white capitalize">{user?.name || 'Academic Scholar'}</h3>
            <p className="text-sm text-[#00E5FF] mt-1 font-medium">Premium Member</p>
            
            <div className="w-full border-t border-white/5 my-6 pt-6 space-y-3 text-left text-xs text-gray-400">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="truncate">{user?.email || 'scholar@study.ai'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                <span>San Francisco, California</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <span>Joined June 2026</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500 shrink-0" />
                <span>Two-Factor Auth Enabled</span>
              </div>
            </div>

            <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/5 rounded-xl transition-all duration-200 cursor-pointer">
              Edit Account Credentials
            </button>
          </GlassCard>
        </div>

        {/* Right Side: Achievements & Detailed Stats */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Detailed Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <GlassCard className="profile-stagger-card flex flex-col justify-between h-32">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Total Hours</span>
              <div>
                <h4 className="text-3xl font-black text-white font-mono mt-1">{totalHrs}h</h4>
                <p className="text-[10px] text-gray-500">Accumulated focus minutes</p>
              </div>
            </GlassCard>

            <GlassCard className="profile-stagger-card flex flex-col justify-between h-32">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Logged blocks</span>
              <div>
                <h4 className="text-3xl font-black text-[#00E5FF] font-mono mt-1">{totalSessions}</h4>
                <p className="text-[10px] text-gray-500">Independently saved items</p>
              </div>
            </GlassCard>

            <GlassCard className="profile-stagger-card flex flex-col justify-between h-32">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Badges Claimed</span>
              <div>
                <h4 className="text-3xl font-black text-[#6C63FF] font-mono mt-1">3 / 4</h4>
                <p className="text-[10px] text-gray-500">Progress toward milestone cap</p>
              </div>
            </GlassCard>
          </div>

          {/* Badges Section */}
          <GlassCard className="profile-stagger-card" hoverEffect={false}>
            <div className="flex items-center space-x-2 text-[#00E5FF] mb-6">
              <Award className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Milestones & Achievements</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map((item, idx) => {
                const Icon = item.icon;
                const earned = idx < 3; // Simulating earning first 3 achievements
                
                return (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border flex items-start space-x-4 transition-all duration-300 ${
                      earned 
                        ? 'bg-white/5 border-white/10 opacity-100 hover:border-[#00E5FF]/30' 
                        : 'bg-white/[0.01] border-white/5 opacity-50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg shrink-0 ${earned ? item.bg + ' ' + item.color : 'bg-white/5 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white block">{item.name}</span>
                        {earned && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
