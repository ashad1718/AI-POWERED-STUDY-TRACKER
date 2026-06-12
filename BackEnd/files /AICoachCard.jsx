import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Brain, TrendingUp, AlertTriangle,
  Target, Star, Zap, RefreshCw, BookOpen
} from 'lucide-react';
import AIScoreRing from './AIScoreRing';

// ─── Sub-components ───────────────────────────────────────────────────────────

const InsightSection = ({ icon: Icon, title, items, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    className="space-y-2"
  >
    <div className="flex items-center space-x-2 mb-3">
      <div className={`p-1.5 rounded-lg ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
    </div>
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start space-x-2 text-xs text-gray-300 leading-relaxed">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="text-center space-y-2">
      <div className="text-sm text-[#00E5FF] font-medium">Analyzing your study habits...</div>
      <div className="flex justify-center">
        <div className="w-6 h-6 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>

    {/* Score rings skeleton */}
    <div className="flex justify-around">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-center space-y-2">
          <div className="w-24 h-24 rounded-full bg-white/5" />
          <div className="w-16 h-2.5 bg-white/5 rounded" />
        </div>
      ))}
    </div>

    {/* Insight sections skeleton */}
    {[0, 1, 2].map((i) => (
      <div key={i} className="space-y-2">
        <div className="w-28 h-3 bg-white/5 rounded" />
        <div className="w-full h-2.5 bg-white/5 rounded" />
        <div className="w-4/5 h-2.5 bg-white/5 rounded" />
      </div>
    ))}
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ onAnalyze, loading }) => (
  <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
    <div className="p-4 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20">
      <BookOpen className="w-8 h-8 text-[#6C63FF]" />
    </div>
    <div>
      <p className="text-sm font-semibold text-white mb-1">No study data yet</p>
      <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
        Start logging study sessions to receive AI-powered recommendations.
      </p>
    </div>
    <button
      onClick={onAnalyze}
      disabled={loading}
      className="px-4 py-2 text-xs font-semibold text-[#00E5FF] border border-[#00E5FF]/30 rounded-xl hover:bg-[#00E5FF]/10 transition-all cursor-pointer disabled:opacity-50"
    >
      Check Again
    </button>
  </div>
);

// ─── Error state ──────────────────────────────────────────────────────────────

const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-6 space-y-3">
    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
      <AlertTriangle className="w-6 h-6 text-red-400" />
    </div>
    <div>
      <p className="text-xs font-semibold text-white mb-1">Analysis failed</p>
      <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500/20 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-all cursor-pointer"
    >
      <RefreshCw className="w-3 h-3" />
      <span>Try Again</span>
    </button>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * AICoachCard
 * Full AI Study Coach panel — handles all states: idle, loading, error, results.
 *
 * Props:
 *   data        {Object|null}   result from useGeminiAnalysis
 *   loading     {boolean}
 *   error       {string|null}
 *   hasAnalysed {boolean}
 *   onAnalyze   {Function}      trigger analysis
 */
const AICoachCard = ({ data, loading, error, hasAnalysed, onAnalyze }) => {
  const isEmpty = data?.isEmpty;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Animated gradient border */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-0"
        style={{
          background: 'linear-gradient(135deg, #6C63FF40, #00E5FF20, #6C63FF40)',
          padding: '1px',
        }}
      />

      {/* Glow blobs behind card */}
      <div className="absolute -top-8 -left-8 w-40 h-40 bg-[#6C63FF]/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-[#00E5FF]/10 blur-3xl rounded-full pointer-events-none" />

      {/* Card body */}
      <div
        className="relative z-10 rounded-2xl p-6"
        style={{
          background:   'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          border:       '1px solid rgba(108,99,255,0.25)',
          boxShadow:    '0 8px 40px rgba(108,99,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {/* Floating AI icon with pulse ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] blur-md opacity-50 animate-pulse" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">AI Study Coach</h3>
              <p className="text-[10px] text-gray-500 font-mono">Powered by Google Gemini</p>
            </div>
          </div>

          {/* Analyze / Re-analyze button */}
          {(!loading) && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAnalyze}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:  hasAnalysed && !isEmpty
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #6C63FF, #00E5FF)',
                border:      hasAnalysed && !isEmpty
                  ? '1px solid rgba(255,255,255,0.1)'
                  : 'none',
                color:       hasAnalysed && !isEmpty ? '#9ca3af' : '#fff',
                boxShadow:   hasAnalysed && !isEmpty
                  ? 'none'
                  : '0 4px 15px rgba(108,99,255,0.3)',
              }}
            >
              {hasAnalysed && !isEmpty ? (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-analyze</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Analyze My Progress</span>
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* ── Content area ── */}
        <AnimatePresence mode="wait">

          {/* Loading */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingSkeleton />
            </motion.div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ErrorState message={error} onRetry={onAnalyze} />
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && !error && hasAnalysed && isEmpty && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState onAnalyze={onAnalyze} loading={loading} />
            </motion.div>
          )}

          {/* Idle — not yet analyzed */}
          {!loading && !error && !hasAnalysed && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center py-8 space-y-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#6C63FF]/20 to-[#00E5FF]/20 flex items-center justify-center border border-white/10">
                  <Sparkles className="w-7 h-7 text-[#00E5FF]" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6C63FF] flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Ready to coach you</p>
                <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                  Click "Analyze My Progress" for personalised AI insights powered by Gemini.
                </p>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {!loading && !error && hasAnalysed && data && !isEmpty && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Score rings */}
              <div className="flex justify-around py-2">
                <AIScoreRing
                  score={data.stats?.studyScore ?? 0}
                  label="Study Score"
                  color="#6C63FF"
                  delay={0}
                />
                <AIScoreRing
                  score={data.stats?.consistencyScore ?? 0}
                  label="Consistency"
                  color="#00E5FF"
                  delay={0.15}
                />
                <AIScoreRing
                  score={data.stats?.productivityScore ?? 0}
                  label="Productivity"
                  color="#A78BFA"
                  delay={0.3}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Insight sections */}
              <div className="grid grid-cols-1 gap-5">
                <InsightSection
                  icon={Star}
                  title="Strengths"
                  items={data.insights?.strengths ?? []}
                  color="bg-green-500/20 text-green-400"
                  delay={0.1}
                />
                <InsightSection
                  icon={AlertTriangle}
                  title="Areas to Improve"
                  items={data.insights?.weaknesses ?? []}
                  color="bg-amber-500/20 text-amber-400"
                  delay={0.2}
                />
                <InsightSection
                  icon={Target}
                  title="Recommendations"
                  items={data.insights?.recommendations ?? []}
                  color="bg-[#6C63FF]/20 text-[#6C63FF]"
                  delay={0.3}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Weekly goal */}
              {data.insights?.weeklyGoal && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider">
                      Weekly Goal
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed">
                    {data.insights.weeklyGoal}
                  </p>
                </motion.div>
              )}

              {/* Motivation */}
              {data.insights?.motivation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-4 rounded-xl border border-[#6C63FF]/20 bg-gradient-to-br from-[#6C63FF]/10 to-[#00E5FF]/5"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-3.5 h-3.5 text-[#6C63FF]" />
                    <span className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider">
                      Motivation
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed italic">
                    "{data.insights.motivation}"
                  </p>
                </motion.div>
              )}

              {/* Analysed timestamp */}
              {data.analysedAt && (
                <p className="text-[10px] text-gray-600 text-center font-mono">
                  Analysed at {new Date(data.analysedAt).toLocaleTimeString()}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AICoachCard;
