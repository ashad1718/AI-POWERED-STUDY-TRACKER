import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Edit2, Check, X, AlertTriangle, Play, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { examAPI } from '../services/api';

const RiskBadge = ({ level }) => {
  const styles = {
    GREEN: { bg: 'bg-green-500/10 border-green-500/20 text-green-400', label: 'On Track' },
    YELLOW: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'Slightly Behind' },
    RED: { bg: 'bg-red-500/10 border-red-500/20 text-red-400', label: 'High Risk' },
    NONE: { bg: 'bg-white/5 border-white/5 text-gray-500', label: 'Set Exam' },
  };

  const current = styles[level] || styles.NONE;

  return (
    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${current.bg}`}>
      {current.label}
    </span>
  );
};

const ExamPredictorSection = ({ data, onRefresh }) => {
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleEditClick = (subjectId, currentDate) => {
    setEditingSubjectId(subjectId);
    if (currentDate) {
      // Format to YYYY-MM-DD for input value
      setSelectedDate(new Date(currentDate).toISOString().split('T')[0]);
    } else {
      setSelectedDate('');
    }
  };

  const handleCancel = () => {
    setEditingSubjectId(null);
    setSelectedDate('');
  };

  const handleSave = async (subjectId, examId) => {
    if (!selectedDate) return;
    setActionLoading(true);
    try {
      if (examId) {
        // Update existing
        await examAPI.update(examId, { date: selectedDate });
      } else {
        // Create new
        await examAPI.create({ subjectId, date: selectedDate });
      }
      onRefresh(); // refresh parent dashboard data
      handleCancel();
    } catch (err) {
      console.error('Failed to save exam date', err);
      alert('Failed to save exam date. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Are you sure you want to remove this exam date?')) return;
    setActionLoading(true);
    try {
      await examAPI.remove(examId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete exam date', err);
      alert('Failed to delete exam date.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const { subjects = [], insights = [], overview = {} } = data || {};

  return (
    <div className="relative rounded-2xl overflow-hidden dashboard-stagger-card w-full">
      {/* Glow blobs */}
      <div className="absolute -top-8 -left-8 w-40 h-40 bg-[#6EA8FE]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-[#A78BFA]/5 blur-3xl rounded-full pointer-events-none" />

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
        <div className="flex items-center space-x-3 mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#6EA8FE] to-[#A78BFA] blur-md opacity-50" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-[#6EA8FE] to-[#A78BFA] shadow-lg">
              <Calendar className="w-5 h-5 text-[#070B14]" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Exam Predictor & Date Manager</h3>
            <p className="text-[10px] text-gray-500 font-mono">Pace analysis and risk forecasting against exams</p>
          </div>
        </div>

        {/* Prediction table */}
        {subjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-600 opacity-60" />
            <p className="text-sm font-semibold text-gray-400">No active subjects tracked.</p>
            <p className="text-xs text-gray-500 mt-1">Configure subjects in Semester Setup to unlock predictions.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Responsive table */}
            <div className="overflow-x-auto w-full border border-white/5 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Subject</th>
                    <th className="p-4">Progress %</th>
                    <th className="p-4">Chapters Left</th>
                    <th className="p-4">Exam Date</th>
                    <th className="p-4">Predicted Completion</th>
                    <th className="p-4">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subjects.map((sub) => {
                    const isEditing = editingSubjectId === sub.subjectId;

                    return (
                      <tr key={sub.subjectId} className="hover:bg-white/2 transition-colors">
                        {/* Name */}
                        <td className="p-4 font-bold text-white max-w-[150px] truncate">{sub.name}</td>

                        {/* Progress */}
                        <td className="p-4 min-w-[120px]">
                          <div className="space-y-1">
                            <span className="font-semibold text-gray-300 font-mono">{sub.progress}%</span>
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] rounded-full"
                                style={{ width: `${sub.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Chapters Remaining */}
                        <td className="p-4 font-mono font-semibold text-gray-300">
                          {sub.remainingChapters} / {sub.totalChapters}
                        </td>

                        {/* Exam Date */}
                        <td className="p-4 min-w-[180px]">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-2 py-1 bg-[#162033] border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5EEAD4]"
                                disabled={actionLoading}
                              />
                              <button
                                onClick={() => handleSave(sub.subjectId, sub.examId)}
                                disabled={!selectedDate || actionLoading}
                                className="p-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{formatDate(sub.examDate)}</span>
                              {sub.examDate ? (
                                <>
                                  <button
                                    onClick={() => handleEditClick(sub.subjectId, sub.examDate)}
                                    className="p-1 rounded bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(sub.examId)}
                                    className="p-1 rounded bg-red-500/10 border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleEditClick(sub.subjectId, null)}
                                  className="px-2 py-1 rounded bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 text-[#5EEAD4] font-bold text-[10px] hover:bg-[#5EEAD4]/20 transition-all cursor-pointer"
                                >
                                  Set Date
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Predicted Date */}
                        <td className="p-4 font-mono font-semibold text-gray-300">
                          {sub.remainingChapters === 0 ? (
                            <span className="text-green-400">Completed</span>
                          ) : sub.predictedCompletionDate ? (
                            formatDate(sub.predictedCompletionDate)
                          ) : (
                            <span className="text-gray-500 italic">No study logs</span>
                          )}
                        </td>

                        {/* Risk Level */}
                        <td className="p-4">
                          <RiskBadge level={sub.riskLevel} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* AI Insights & Info footer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-white/5">
              {/* Pace details */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Pace Overview</span>
                  <div className="space-y-2 mt-3 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span>Daily Study Average:</span>
                      <span className="font-mono font-bold text-white">{overview.avgDailyStudyTime}h/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weekly Study Average:</span>
                      <span className="font-mono font-bold text-white">{overview.avgWeeklyStudyTime}h/week</span>
                    </div>
                  </div>
                </div>

                {overview.isNoRecentHistory && (
                  <div className="flex items-start gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] mt-2">
                    <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>No study logs in the last 30 days. Displaying fallback estimations.</span>
                  </div>
                )}
              </div>

              {/* AI Predictions insights */}
              {insights.length > 0 && (
                <div className="lg:col-span-2 p-4 rounded-xl border border-[#6EA8FE]/20 bg-[#6EA8FE]/5 space-y-3">
                  <span className="text-[10px] font-black uppercase text-[#6EA8FE] tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#6EA8FE]" /> AI Prediction Insights
                  </span>
                  <ul className="space-y-2 text-xs text-gray-200">
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6EA8FE] shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamPredictorSection;
