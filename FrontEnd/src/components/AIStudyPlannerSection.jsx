import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, RefreshCw, BookOpen, AlertTriangle, Zap, Calendar, ListOrdered } from 'lucide-react';
import GlassCard from './GlassCard';
import { plannerAPI } from '../services/api';

const AIStudyPlannerSection = () => {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);

  const fetchPlan = async (tab, forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'daily') {
        const res = await plannerAPI.getDaily(!forceRefresh);
        setDailyData(res.data.data);
      } else {
        const res = await plannerAPI.getWeekly(!forceRefresh);
        setWeeklyData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial plans silently on load
  useEffect(() => {
    fetchPlan('daily', false);
    fetchPlan('weekly', false);
  }, []);

  const handleRegenerate = () => {
    fetchPlan(activeTab, true);
  };

  const currentData = activeTab === 'daily' ? dailyData : weeklyData;
  const isEmpty = !currentData || currentData.isEmpty;

  return (
    <div className="relative rounded-2xl overflow-hidden dashboard-stagger-card w-full">
      {/* Glow blobs behind card */}
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#5EEAD4]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#6EA8FE]/5 blur-3xl rounded-full pointer-events-none" />

      <div
        className="relative z-10 rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#5EEAD4] to-[#6EA8FE] blur-md opacity-50" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-[#5EEAD4] to-[#6EA8FE] shadow-lg">
                <Sparkles className="w-5 h-5 text-[#070B14]" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">AI Study Planner</h3>
              <p className="text-[10px] text-gray-500 font-mono">Tailored Daily & Weekly Study Action Plans</p>
            </div>
          </div>

          {/* Tabs & Action */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 text-xs">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-[#5EEAD4] text-[#070B14]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Daily Plan
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'weekly'
                    ? 'bg-[#5EEAD4] text-[#070B14]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Weekly Plan
              </button>
            </div>

            {!isEmpty && !loading && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#5EEAD4] border border-[#5EEAD4]/20 rounded-xl hover:bg-[#5EEAD4]/10 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Update Plan</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 space-y-4"
            >
              <span className="w-8 h-8 border-3 border-[#5EEAD4] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Synthesizing study sessions and pacing active chapters...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 text-center space-y-3"
            >
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-400 max-w-sm">{error}</p>
              <button
                onClick={() => fetchPlan(activeTab, true)}
                className="px-4 py-2 text-xs font-semibold bg-[#5EEAD4] text-[#070B14] rounded-xl hover:scale-[1.02] transition-all cursor-pointer"
              >
                Try Again
              </button>
            </motion.div>
          ) : isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center py-10 space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">No active study data discovered</p>
                <p className="text-xs text-gray-400 max-w-[280px] mt-1">
                  You need to have at least one active subject and chapter configured to generate your personalized study plan.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Daily Plan Layout */}
              {activeTab === 'daily' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Today's Tasks */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#5EEAD4]" /> Today's Focus Plan
                    </h4>
                    <div className="space-y-3">
                      {currentData.plan?.map((task, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 text-[10px] font-black tracking-wider rounded bg-[#6EA8FE]/10 border border-[#6EA8FE]/20 text-[#6EA8FE] uppercase">
                              {task.subject}
                            </span>
                            <span className="text-xs font-bold text-[#5EEAD4] font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {task.duration} mins
                            </span>
                          </div>
                          <h5 className="text-sm font-extrabold text-white">{task.chapter}</h5>
                          <p className="text-xs text-gray-400 mt-1">{task.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right side priorities */}
                  <div className="space-y-6">
                    {/* Focus tip */}
                    {currentData.dailyFocusTip && (
                      <div className="p-4 rounded-xl bg-[#5EEAD4]/5 border border-[#5EEAD4]/20 space-y-1">
                        <span className="text-[9px] font-black uppercase text-[#5EEAD4] tracking-widest block">Focus Tip</span>
                        <p className="text-xs text-gray-200 font-medium italic">"{currentData.dailyFocusTip}"</p>
                      </div>
                    )}

                    {/* Priorities list */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                      {currentData.prioritySubjects?.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Priority Subjects</span>
                          <div className="flex flex-wrap gap-1.5">
                            {currentData.prioritySubjects.map((sub, i) => (
                              <span key={i} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-white font-semibold">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentData.priorityChapters?.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Priority Chapters</span>
                          <ul className="space-y-1.5 text-xs text-gray-300">
                            {currentData.priorityChapters.map((chap, i) => (
                              <li key={i} className="flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#5EEAD4]" />
                                <span className="truncate">{chap}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Weekly Plan Layout */}
              {activeTab === 'weekly' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Weekly calendar */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5EEAD4]" /> Weekly Schedule
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentData.plan?.map((dayPlan, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                        >
                          <span className="text-xs font-black text-[#5EEAD4] block mb-2">{dayPlan.day}</span>
                          <div className="space-y-2">
                            {dayPlan.tasks?.length > 0 ? (
                              dayPlan.tasks.map((task, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between items-center gap-1">
                                    <span className="text-[10px] font-extrabold text-[#6EA8FE] truncate max-w-[120px]">{task.subject}</span>
                                    <span className="text-[9px] font-mono text-gray-500 shrink-0">{task.duration}m</span>
                                  </div>
                                  <p className="text-xs font-bold text-white truncate">{task.chapter}</p>
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-500 block py-2">No scheduled study session</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right side Strategy & Milestones */}
                  <div className="space-y-6">
                    {/* Strategy tip */}
                    {currentData.weeklyStrategy && (
                      <div className="p-4 rounded-xl bg-[#6EA8FE]/5 border border-[#6EA8FE]/20 space-y-1">
                        <span className="text-[9px] font-black uppercase text-[#6EA8FE] tracking-widest block">Weekly Strategy</span>
                        <p className="text-xs text-gray-200 font-medium italic">"{currentData.weeklyStrategy}"</p>
                      </div>
                    )}

                    {/* Milestones list */}
                    {currentData.weeklyMilestones?.length > 0 && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                          <ListOrdered className="w-3.5 h-3.5 text-[#5EEAD4]" /> Weekly Milestones
                        </span>
                        <ul className="space-y-2">
                          {currentData.weeklyMilestones.map((milestone, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#5EEAD4] shrink-0" />
                              <span>{milestone}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIStudyPlannerSection;
