import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  BookOpen, 
  Clock, 
  Calendar,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import GlassCard from '../components/GlassCard';

const StudySessionPage = ({ addSession }) => {
  // 1. Form States
  const [subject, setSubject] = useState('');
  const [durationVal, setDurationVal] = useState('45');
  const [durationUnit, setDurationUnit] = useState('minutes');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [success, setSuccess] = useState(false);

  // 2. Timer States
  const [timeRemaining, setTimeRemaining] = useState(2700); // 45 mins in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [selectedTimerMins, setSelectedTimerMins] = useState(45);
  const [customTimerOpen, setCustomTimerOpen] = useState(false);
  const [customTimerVal, setCustomTimerVal] = useState('');
  const [customTimerUnit, setCustomTimerUnit] = useState('minutes');
  const timerIntervalRef = useRef(null);

  // Sync timer remaining with preset minutes
  const changePresetMinutes = (mins) => {
    setSelectedTimerMins(mins);
    setTimeRemaining(mins * 60);
    setTimerActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Timer Tick Hook
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimerActive(false);
            // Completed! Auto log session
            handleLogSession(selectedTimerMins, "AI Focus Session: " + (subject || "General Study"));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerActive, selectedTimerMins, subject]);

  // Form Submit Handler
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!subject) return;
    
    const mins = durationUnit === 'hours'
      ? Math.round(parseFloat(durationVal) * 60)
      : parseInt(durationVal, 10);
    
    handleLogSession(mins, subject, date);
  };

  // Shared logging handler
  const handleLogSession = (mins, sub, logDate = null) => {
    const targetDate = logDate || new Date().toISOString().split('T')[0];
    addSession({
      subject: sub,
      duration: mins,
      date: targetDate
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSubject('');
    }, 3000);
  };

  // Formatting helpers
  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    if (selectedTimerMins >= 60) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((selectedTimerMins * 60 - timeRemaining) / (selectedTimerMins * 60)) * 100;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Focus & Session Logger</h1>
        <p className="text-sm text-gray-400 mt-1">Initialize your study block, toggle timers, or record manual entries.</p>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Form Logger (Col span 5) */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard hoverEffect={false}>
            <div className="flex items-center space-x-2 text-[#6C63FF] mb-6">
              <Plus className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Log Completed Session</h3>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-6">
              
              {/* Subject Dropdown / Text Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Subject Topic</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                    placeholder="e.g. Quantum Physics, Calculus, etc."
                  />
                </div>
              </div>

              {/* Duration Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                    Duration ({durationUnit === 'hours' ? 'Hours' : 'Minutes'})
                  </label>
                  <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setDurationUnit('minutes');
                        if (durationUnit === 'hours') {
                          const val = parseFloat(durationVal);
                          if (!isNaN(val)) setDurationVal(Math.round(val * 60).toString());
                        }
                      }}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                        durationUnit === 'minutes' ? 'bg-[#6C63FF] text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Min
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDurationUnit('hours');
                        if (durationUnit === 'minutes') {
                          const val = parseFloat(durationVal);
                          if (!isNaN(val)) setDurationVal((val / 60).toFixed(1).replace(/\.0$/, ''));
                        }
                      }}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                        durationUnit === 'hours' ? 'bg-[#6C63FF] text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Hrs
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    required
                    step={durationUnit === 'hours' ? '0.1' : '1'}
                    min={durationUnit === 'hours' ? '0.1' : '1'}
                    max={durationUnit === 'hours' ? '24' : '1440'}
                    value={durationVal}
                    onChange={(e) => setDurationVal(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                    placeholder={durationUnit === 'hours' ? 'e.g. 1.5, 2, 3' : 'e.g. 45, 60, 90'}
                  />
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-3 bg-[#6C63FF] hover:bg-[#594fff] text-white font-semibold text-sm rounded-xl shadow-[0_4px_15px_rgba(108,99,255,0.2)] hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                Log Session
              </button>
            </form>

            {/* Success notification banner */}
            <AnimatePresence>
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center space-x-3 text-green-400 text-xs font-medium"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                  <span>Session recorded successfully! Analytics charts updated.</span>
                </motion.div>
              )}
            </AnimatePresence>

          </GlassCard>
        </div>

        {/* Right Column - Pomodoro Timer (Col span 7) */}
        <div className="lg:col-span-7">
          <GlassCard className="h-full flex flex-col items-center justify-center text-center p-8 md:p-12 relative" hoverEffect={false}>
            {/* Glowing blur background blob behind timer */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#00E5FF]/10 blur-3xl pointer-events-none rounded-full" />
            
            <div className="flex items-center space-x-2 text-[#00E5FF] mb-8 z-10">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Active Focus Pomodoro</h3>
            </div>

            {/* Presets selection */}
            <div className="flex flex-col items-center space-y-3 mb-10 z-10 w-full">
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {[
                  { label: '25 min', mins: 25 },
                  { label: '45 min', mins: 45 },
                  { label: '1 hr', mins: 60 },
                  { label: '1.5 hr', mins: 90 },
                  { label: '2 hr', mins: 120 },
                  { label: '3 hr', mins: 180 },
                  { label: '4 hr', mins: 240 }
                ].map((preset) => (
                  <button
                    key={preset.mins}
                    type="button"
                    onClick={() => {
                      changePresetMinutes(preset.mins);
                      setCustomTimerOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                      selectedTimerMins === preset.mins && !customTimerOpen
                        ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 shadow-[0_0_10px_rgba(0,229,255,0.15)]' 
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={() => setCustomTimerOpen(!customTimerOpen)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    customTimerOpen
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 shadow-[0_0_10px_rgba(0,229,255,0.15)]' 
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:bg-white/10'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Custom Timer Input Area */}
              <AnimatePresence>
                {customTimerOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden w-full max-w-xs"
                  >
                    <div className="flex items-center space-x-2 mt-2 p-2 bg-white/5 rounded-xl border border-white/5">
                      <input
                        type="number"
                        min="1"
                        step={customTimerUnit === 'hours' ? '0.1' : '1'}
                        value={customTimerVal}
                        onChange={(e) => setCustomTimerVal(e.target.value)}
                        placeholder={customTimerUnit === 'hours' ? 'e.g. 1.5' : 'e.g. 50'}
                        className="glass-input flex-1 px-3 py-1.5 text-xs rounded-lg focus:outline-none bg-transparent"
                      />
                      
                      <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                        <button
                          type="button"
                          onClick={() => setCustomTimerUnit('minutes')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                            customTimerUnit === 'minutes' ? 'bg-[#00E5FF] text-[#050816]' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Min
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomTimerUnit('hours')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                            customTimerUnit === 'hours' ? 'bg-[#00E5FF] text-[#050816]' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Hrs
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const val = parseFloat(customTimerVal);
                          if (isNaN(val) || val <= 0) return;
                          const mins = customTimerUnit === 'hours' ? Math.round(val * 60) : Math.round(val);
                          changePresetMinutes(mins);
                        }}
                        className="px-3 py-1.5 bg-[#00E5FF] hover:bg-[#00cce6] text-[#050816] text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Circular Timer Graphics */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-10 z-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  className="stroke-white/5 stroke-[8px]"
                  fill="transparent"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  className="stroke-[#00E5FF] stroke-[8px] transition-all duration-300"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 110}
                  strokeDashoffset={2 * Math.PI * 110 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-white font-mono tracking-tight select-none">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs text-gray-500 uppercase tracking-widest mt-2 select-none">
                  {timerActive ? 'DEEP WORK' : 'PAUSED'}
                </span>
              </div>
            </div>

            {/* Timer Actions */}
            <div className="flex items-center space-x-6 z-10">
              <button
                onClick={() => changePresetMinutes(selectedTimerMins)}
                className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl transition-all duration-200 cursor-pointer"
                title="Reset timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={() => setTimerActive(!timerActive)}
                className={`p-5 rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${
                  timerActive 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-[#00E5FF] hover:bg-[#00cce6] text-[#050816] shadow-[#00E5FF]/20'
                }`}
              >
                {timerActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>

              <button
                onClick={() => handleLogSession(selectedTimerMins, "AI Focus Session: " + (subject || "General Study"))}
                className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-[#00E5FF] border border-white/5 rounded-xl transition-all duration-200 cursor-pointer"
                title="Log this block immediately"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-8 text-xs text-gray-500 max-w-xs z-10 leading-normal">
              Press the play button to initiate your session. Completing the full countdown automatically writes a focus entry to your analytics board.
            </div>

          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default StudySessionPage;
