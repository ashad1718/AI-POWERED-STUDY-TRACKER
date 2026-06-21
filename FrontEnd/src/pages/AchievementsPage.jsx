import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  BookOpen, 
  CheckSquare, 
  Zap, 
  Flame, 
  Clock, 
  Award, 
  Trophy, 
  GraduationCap, 
  Compass, 
  Lock 
} from 'lucide-react';
import { achievementAPI } from '../services/api';

const IconMap = {
  Play,
  BookOpen,
  CheckSquare,
  Zap,
  Flame,
  Clock,
  Award,
  Trophy,
  GraduationCap,
  Compass
};

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const { data } = await achievementAPI.getAll();
        if (data?.success) {
          setAchievements(data.data.achievements || []);
        } else {
          setError('Failed to load achievements.');
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
        setError('Error connecting to achievements server.');
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const totalEarned = achievements.filter(a => a.earned).length;

  // Stagger variants for entry animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-4 md:px-8 py-6">
          
          {/* Header & Stats block */}
          <div className="mb-10 p-8 rounded-3xl bg-surface/40 backdrop-blur-xl border border-border shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative z-10 text-center md:text-left">
              <h1 className="text-3xl font-extrabold text-text-primary tracking-tight font-sans">
                Academic <span className="bg-gradient-to-r from-[#7B4DFF] to-[#00D4C7] bg-clip-text text-transparent">Achievements</span>
              </h1>
              <p className="text-text-secondary text-sm font-medium mt-2 max-w-lg">
                Unlock badges and level up your study profile as you log sessions, hit milestones, and complete subject requirements!
              </p>
            </div>
            
            <div className="shrink-0 flex items-center gap-6 bg-background/50 border border-white/5 p-5 rounded-2xl backdrop-blur-md">
              <div className="text-center">
                <p className="text-3xl font-black bg-gradient-to-r from-[#00D4C7] to-primary bg-clip-text text-transparent">
                  {totalEarned} / {achievements.length}
                </p>
                <p className="text-xs font-semibold text-text-secondary/70 mt-1 uppercase tracking-wider">Unlocked</p>
              </div>
              <div className="w-[1px] h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-3xl font-black text-white/95">
                  {achievements.length > 0 ? Math.round((totalEarned / achievements.length) * 100) : 0}%
                </p>
                <p className="text-xs font-semibold text-text-secondary/70 mt-1 uppercase tracking-wider">Progress</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative w-12 h-12">
                <span className="absolute w-full h-full border-4 border-secondary/20 rounded-full" />
                <span className="absolute w-full h-full border-4 border-t-secondary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-medium text-text-secondary mt-4">Loading your rewards...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-surface/20 border border-border rounded-3xl p-8 max-w-md mx-auto">
              <p className="text-error font-semibold text-lg">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="btn-primary mt-4 px-5 py-2 text-sm rounded-xl"
              >
                Retry
              </button>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {achievements.map((ach) => {
                const IconComponent = IconMap[ach.icon] || Award;
                
                // Color theme settings based on levels
                const levelColors = {
                  bronze: {
                    border: 'border-[#CD7F32]/20 hover:border-[#CD7F32]/55',
                    shadow: 'shadow-[#CD7F32]/5',
                    badge: 'bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/25',
                    label: 'Bronze'
                  },
                  silver: {
                    border: 'border-slate-300/20 hover:border-slate-300/55',
                    shadow: 'shadow-slate-300/5',
                    badge: 'bg-slate-300/10 text-slate-300 border-slate-300/25',
                    label: 'Silver'
                  },
                  gold: {
                    border: 'border-[#FFD700]/20 hover:border-[#FFD700]/55',
                    shadow: 'shadow-[#FFD700]/5',
                    badge: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/25',
                    label: 'Gold'
                  },
                  diamond: {
                    border: 'border-[#B9F2FF]/20 hover:border-[#B9F2FF]/55',
                    shadow: 'shadow-[#B9F2FF]/5',
                    badge: 'bg-[#B9F2FF]/10 text-[#B9F2FF] border-[#B9F2FF]/25',
                    label: 'Diamond'
                  }
                }[ach.level] || {
                  border: 'border-primary/20 hover:border-primary/55',
                  shadow: 'shadow-primary/5',
                  badge: 'bg-primary/10 text-primary border-primary/25',
                  label: 'General'
                };

                return (
                  <motion.div
                    key={ach.slug}
                    variants={cardVariants}
                    className={`relative p-6 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
                      ach.earned 
                        ? `bg-surface/30 hover:bg-surface/50 shadow-lg ${levelColors.border} ${levelColors.shadow}` 
                        : 'bg-surface/10 border-white/5 opacity-55 saturate-[0.1]'
                    }`}
                  >
                    <div>
                      {/* Header row: badge level & status */}
                      <div className="flex justify-between items-center mb-4">
                        <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full border ${levelColors.badge}`}>
                          {levelColors.label}
                        </span>
                        {ach.earned ? (
                          <span className="text-[10px] text-[#00D4C7] font-extrabold bg-[#00D4C7]/15 px-2.5 py-1 rounded-full border border-[#00D4C7]/20">
                            Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-secondary/70 font-semibold bg-white/5 px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/5">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>

                      {/* Icon & Title */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3.5 rounded-2xl border ${
                          ach.earned ? ach.bg + ' ' + ach.color + ' border-white/10' : 'bg-white/5 border-white/5 text-text-secondary'
                        }`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-text-primary tracking-tight font-sans">
                            {ach.name}
                          </h3>
                          <p className="text-[11px] text-text-secondary/80 font-medium mt-0.5">
                            {ach.desc}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Completion date (unlocked) or locked description */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-text-secondary/60">
                      {ach.earned ? (
                        <>
                          <span>Earned Date</span>
                          <span className="font-bold text-text-primary/90">
                            {new Date(ach.earnedAt).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </>
                      ) : (
                        <span className="font-medium">Complete requirements to unlock.</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
    </div>
  );
};

export default AchievementsPage;
