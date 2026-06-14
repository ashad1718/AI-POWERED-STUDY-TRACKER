import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Plus, BookOpen,
  Clock, Calendar, Sparkles, CheckCircle2, AlertCircle, Layers
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { sessionAPI, subjectAPI, chapterAPI } from '../services/api';

const StudySessionPage = () => {
  // ── Database lists state ───────────────────────────────────────────────────
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // ── Form & Selection State ─────────────────────────────────────────────────
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [durationVal,  setDurationVal]  = useState('45');
  const [durationUnit, setDurationUnit] = useState('minutes');
  const [date,         setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  // ── Timer State ────────────────────────────────────────────────────────────
  const [timeRemaining,    setTimeRemaining]    = useState(2700);
  const [timerActive,      setTimerActive]      = useState(false);
  const [selectedTimerMins,setSelectedTimerMins]= useState(45);
  const [customTimerOpen,  setCustomTimerOpen]  = useState(false);
  const [customTimerVal,   setCustomTimerVal]   = useState('');
  const [customTimerUnit,  setCustomTimerUnit]  = useState('minutes');
  const timerRef = useRef(null);

  // ── Fetch active subjects ──────────────────────────────────────────────────
  const fetchActiveSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const res = await subjectAPI.getAll({ active: true });
      const activeSubjects = res.data.data.subjects || [];
      setSubjects(activeSubjects);
      if (activeSubjects.length > 0) {
        setSelectedSubjectId(activeSubjects[0]._id);
      }
    } catch (err) {
      console.error('Failed to load active subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ── Fetch chapters when subject changes ────────────────────────────────────
  const fetchChaptersForSubject = async (subId) => {
    if (!subId) {
      setChapters([]);
      setSelectedChapterId('');
      return;
    }
    setLoadingChapters(true);
    try {
      const res = await chapterAPI.getAll({ subjectId: subId });
      const chaptersList = res.data.data.chapters || [];
      setChapters(chaptersList);
      setSelectedChapterId(''); // default to empty (general study)
    } catch (err) {
      console.error('Failed to load chapters:', err);
    } finally {
      setLoadingChapters(false);
    }
  };

  useEffect(() => {
    fetchActiveSubjects();
  }, []);

  useEffect(() => {
    fetchChaptersForSubject(selectedSubjectId);
  }, [selectedSubjectId]);

  const changePresetMinutes = (mins) => {
    setSelectedTimerMins(mins);
    setTimeRemaining(mins * 60);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ── Timer Tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            logSession(selectedTimerMins, selectedSubjectId, selectedChapterId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, selectedTimerMins, selectedSubjectId, selectedChapterId]);

  // ── Core log function — calls real API ────────────────────────────────────
  const logSession = async (mins, subjectId, chapterId, logDate = null) => {
    if (!subjectId) {
      setError('Please select a subject to log your study session.');
      return;
    }
    const targetDate = logDate || new Date().toISOString().split('T')[0];
    setError('');
    try {
      const payload = {
        subjectId,
        duration: mins,
        date: targetDate,
      };
      if (chapterId) {
        payload.chapterId = chapterId;
      }
      
      await sessionAPI.create(payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 4000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to log session. Please try again.');
    }
  };

  // ── Form Submit ────────────────────────────────────────────────────────────
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setSubmitting(true);
    const mins = durationUnit === 'hours'
      ? Math.round(parseFloat(durationVal) * 60)
      : parseInt(durationVal, 10);
    await logSession(mins, selectedSubjectId, selectedChapterId, date);
    setSubmitting(false);
  };

  // ── Formatting helpers ─────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (selectedTimerMins >= 60) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const progressPercent = ((selectedTimerMins * 60 - timeRemaining) / (selectedTimerMins * 60)) * 100;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Focus & Session Logger</h1>
        <p className="text-sm text-gray-400 mt-1">Initialize your study block, toggle timers, or record manual entries.</p>
      </div>

      {loadingSubjects ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
          <div className="w-8 h-8 rounded-full border-2 border-t-[#5EEAD4] border-white/10 animate-spin" />
          <span className="text-sm">Loading active subjects...</span>
        </div>
      ) : subjects.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No Active Subjects Configured</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              You must configure your subjects in the Subject Manager before you can start logging study sessions.
            </p>
            <Link 
              to="/subjects" 
              className="px-6 py-2.5 rounded-xl bg-[#5EEAD4] text-[#070B14] font-bold text-sm hover:opacity-90 inline-block"
            >
              Go to Subject Manager
            </Link>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Form Logger ────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard hoverEffect={false}>
              <div className="flex items-center space-x-2 text-[#5EEAD4] mb-6">
                <Plus className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Log Completed Session</h3>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-5">
                {/* Subject Dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Subject</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none appearance-none bg-[#0F172A] border border-white/10 text-white"
                      required
                    >
                      {subjects.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chapter Dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                    Chapter / Topic {loadingChapters && <span className="text-gray-500 text-[10px] animate-pulse">(loading...)</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Layers className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none appearance-none bg-[#0F172A] border border-white/10 text-white"
                    >
                      <option value="">No specific chapter (General study)</option>
                      {chapters.map((chap) => (
                        <option key={chap._id} value={chap._id}>
                          {chap.name} {chap.completed ? '✓' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                      Duration ({durationUnit === 'hours' ? 'Hours' : 'Minutes'})
                    </label>
                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                      {['minutes','hours'].map((unit) => (
                        <button key={unit} type="button"
                          onClick={() => setDurationUnit(unit)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${durationUnit === unit ? 'bg-[#5EEAD4] text-[#070B14]' : 'text-gray-400 hover:text-white'}`}>
                          {unit === 'minutes' ? 'Min' : 'Hrs'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><Clock className="w-4 h-4" /></div>
                    <input type="number" required step={durationUnit === 'hours' ? '0.1' : '1'}
                      min={durationUnit === 'hours' ? '0.1' : '1'} max={durationUnit === 'hours' ? '24' : '1440'}
                      value={durationVal} onChange={(e) => setDurationVal(e.target.value)}
                      className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none bg-[#0F172A] border border-white/10 text-white"
                      placeholder={durationUnit === 'hours' ? 'e.g. 1.5' : 'e.g. 45'} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><Calendar className="w-4 h-4" /></div>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                      className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none bg-[#0F172A] border border-white/10 text-white" />
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-3 bg-[#5EEAD4] text-[#070B14] font-black text-sm rounded-xl shadow-[0_4px_15px_rgba(94,234,212,0.2)] hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Log Session'}
                </button>
              </form>

              <AnimatePresence>
                {success && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center space-x-3 text-green-400 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Session recorded successfully! Syllabus stats updated.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

          {/* ── Pomodoro Timer ─────────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <GlassCard className="h-full flex flex-col items-center justify-center text-center p-8 md:p-12 relative" hoverEffect={false}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#5EEAD4]/10 blur-3xl pointer-events-none rounded-full" />

              <div className="flex items-center space-x-2 text-[#5EEAD4] mb-6 z-10">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Active Focus Pomodoro</h3>
              </div>

              {/* Selection context for Pomodoro */}
              <div className="mb-6 z-10 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-gray-300 flex items-center gap-2">
                <span className="font-bold text-white">Focus:</span>
                <span>
                  {subjects.find(s => s._id === selectedSubjectId)?.name || 'General'}
                  {selectedChapterId && ` / ${chapters.find(c => c._id === selectedChapterId)?.name}`}
                </span>
              </div>

              {/* Presets */}
              <div className="flex flex-col items-center space-y-3 mb-10 z-10 w-full">
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {[{label:'25 min',mins:25},{label:'45 min',mins:45},{label:'1 hr',mins:60},{label:'1.5 hr',mins:90},{label:'2 hr',mins:120}].map((p) => (
                    <button key={p.mins} type="button" onClick={() => { changePresetMinutes(p.mins); setCustomTimerOpen(false); }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${selectedTimerMins === p.mins && !customTimerOpen ? 'bg-[#5EEAD4]/20 text-[#5EEAD4] border border-[#5EEAD4]/30' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:bg-white/10'}`}>
                      {p.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setCustomTimerOpen(!customTimerOpen)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${customTimerOpen ? 'bg-[#5EEAD4]/20 text-[#5EEAD4] border border-[#5EEAD4]/30' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:bg-white/10'}`}>
                    Custom
                  </button>
                </div>

                <AnimatePresence>
                  {customTimerOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden w-full max-w-xs">
                      <div className="flex items-center space-x-2 mt-2 p-2 bg-white/5 rounded-xl border border-white/5">
                        <input type="number" min="1" step={customTimerUnit === 'hours' ? '0.1' : '1'} value={customTimerVal}
                          onChange={(e) => setCustomTimerVal(e.target.value)} placeholder={customTimerUnit === 'hours' ? 'e.g. 1.5' : 'e.g. 50'}
                          className="glass-input flex-1 px-3 py-1.5 text-xs rounded-lg focus:outline-none bg-transparent" />
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                          {['minutes','hours'].map(u => (
                            <button key={u} type="button" onClick={() => setCustomTimerUnit(u)}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${customTimerUnit === u ? 'bg-[#5EEAD4] text-[#070B14]' : 'text-gray-400 hover:text-white'}`}>
                              {u === 'minutes' ? 'Min' : 'Hrs'}
                            </button>
                          ))}
                        </div>
                        <button type="button"
                          onClick={() => { const v = parseFloat(customTimerVal); if (!isNaN(v) && v > 0) changePresetMinutes(customTimerUnit === 'hours' ? Math.round(v*60) : Math.round(v)); }}
                          className="px-3 py-1.5 bg-[#5EEAD4] hover:opacity-90 text-[#070B14] text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer">
                          Set
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Circular Timer */}
              <div className="relative w-64 h-64 flex items-center justify-center mb-10 z-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="128" cy="128" r="110" className="stroke-white/5 stroke-[8px]" fill="transparent" />
                  <circle cx="128" cy="128" r="110" className="stroke-[#5EEAD4] stroke-[8px] transition-all duration-300" fill="transparent"
                    strokeDasharray={2 * Math.PI * 110}
                    strokeDashoffset={2 * Math.PI * 110 * (1 - progressPercent / 100)}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white font-mono tracking-tight select-none">{formatTime(timeRemaining)}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-widest mt-2 select-none">{timerActive ? 'DEEP WORK' : 'PAUSED'}</span>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center space-x-6 z-10">
                <button onClick={() => changePresetMinutes(selectedTimerMins)}
                  className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl transition-all duration-200 cursor-pointer" title="Reset">
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button onClick={() => setTimerActive(!timerActive)}
                  className={`p-5 rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${timerActive ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-[#5EEAD4] hover:opacity-90 text-[#070B14] shadow-[#5EEAD4]/20'}`}>
                  {timerActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button
                  onClick={() => logSession(selectedTimerMins, selectedSubjectId, selectedChapterId)}
                  className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-[#5EEAD4] border border-white/5 rounded-xl transition-all duration-200 cursor-pointer" title="Log now">
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-8 text-xs text-gray-500 max-w-xs z-10 leading-normal">
                Press play to start. Completing the countdown auto-logs a focus entry.
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudySessionPage;
