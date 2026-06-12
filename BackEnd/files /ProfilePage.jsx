import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, MapPin, Calendar, Shield,
  Award, Zap, Clock, Brain, CheckCircle, AlertCircle
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';
import { achievementAPI, statsAPI } from '../services/api';

// Map slug → icon component
const ICON_MAP = { Clock, Zap, Award, Brain };

const ProfilePage = ({ user = {} }) => {
  const pageRef = useRef(null);

  const [achievements, setAchievements] = useState([]);
  const [overview,     setOverview]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [achRes, ovRes] = await Promise.all([
          achievementAPI.getAll(),
          statsAPI.overview(),
        ]);
        setAchievements(achRes.data.data.achievements);
        setOverview(ovRes.data.data);
      } catch (err) {
        setError('Failed to load profile data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.profile-stagger-card',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }
      );
    }
  }, { scope: pageRef, dependencies: [loading] });

  const totalHrs     = overview ? (overview.totalMinutes / 60).toFixed(1) : '—';
  const totalSessions= overview?.totalSessions ?? '—';
  const earnedCount  = achievements.filter((a) => a.earned).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <span className="w-10 h-10 border-4 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Profile</h1>
        <p className="text-sm text-gray-400 mt-1">Manage credentials, review achievements, and check performance scores.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar Card */}
        <div className="space-y-6">
          <GlassCard className="profile-stagger-card flex flex-col items-center justify-center text-center p-8 relative" hoverEffect={false}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#6C63FF]/10 blur-2xl pointer-events-none rounded-full" />
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] p-1 shadow-[0_0_30px_rgba(108,99,255,0.4)] flex items-center justify-center">
                <div className="w-full h-full bg-[#050816] rounded-full flex items-center justify-center font-black text-white text-3xl">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
              </div>
              <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-[#050816] shadow-md" />
            </motion.div>

            <h3 className="text-xl font-bold text-white capitalize">{user?.name || 'Academic Scholar'}</h3>
            <p className="text-sm text-[#00E5FF] mt-1 font-medium">Premium Member</p>

            <div className="w-full border-t border-white/5 my-6 pt-6 space-y-3 text-left text-xs text-gray-400">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="truncate">{user?.email || 'scholar@study.ai'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                <span>{user?.location || 'Location not set'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500 shrink-0" />
                <span>{user?.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}</span>
              </div>
            </div>

            <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/5 rounded-xl transition-all duration-200 cursor-pointer">
              Edit Account Credentials
            </button>
          </GlassCard>
        </div>

        {/* Stats + Achievements */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <GlassCard className="profile-stagger-card flex flex-col justify-between h-32">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Total Hours</span>
              <div>
                <h4 className="text-3xl font-black text-white font-mono mt-1">{totalHrs}h</h4>
                <p className="text-[10px] text-gray-500">Accumulated focus time</p>
              </div>
            </GlassCard>

            <GlassCard className="profile-stagger-card flex flex-col justify-between h-32">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Logged Blocks</span>
              <div>
                <h4 className="text-3xl font-black text-[#00E5FF] font-mono mt-1">{totalSessions}</h4>
                <p className="text-[10px] text-gray-500">Saved study sessions</p>
              </div>
            </GlassCard>

            <GlassCard className="profile-stagger-card flex flex-col justify-between h-32">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Badges Claimed</span>
              <div>
                <h4 className="text-3xl font-black text-[#6C63FF] font-mono mt-1">
                  {earnedCount} / {achievements.length}
                </h4>
                <p className="text-[10px] text-gray-500">Progress toward milestone cap</p>
              </div>
            </GlassCard>
          </div>

          {/* Achievements */}
          <GlassCard className="profile-stagger-card" hoverEffect={false}>
            <div className="flex items-center space-x-2 text-[#00E5FF] mb-6">
              <Award className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Milestones & Achievements</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map((item) => {
                const Icon = ICON_MAP[item.icon] || Award;
                return (
                  <div key={item.slug}
                    className={`p-4 rounded-xl border flex items-start space-x-4 transition-all duration-300 ${item.earned ? 'bg-white/5 border-white/10 opacity-100 hover:border-[#00E5FF]/30' : 'bg-white/[0.01] border-white/5 opacity-50'}`}>
                    <div className={`p-2.5 rounded-lg shrink-0 ${item.earned ? `${item.bg} ${item.color}` : 'bg-white/5 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white block">{item.name}</span>
                        {item.earned && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">{item.desc}</p>
                      {item.earned && item.earnedAt && (
                        <p className="text-[10px] text-gray-600 mt-1">
                          Earned {new Date(item.earnedAt).toLocaleDateString()}
                        </p>
                      )}
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
