import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Archive, RefreshCw, ArrowUp, ArrowDown, 
  Edit2, Check, X, BookOpen, Clock, AlertCircle, Sparkles 
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { subjectAPI } from '../services/api';

const SubjectManagerPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [newSubName, setNewSubName] = useState('');
  const [newSubSessions, setNewSubSessions] = useState('3');
  const [newSubHours, setNewSubHours] = useState('5');
  const [newSubRule, setNewSubRule] = useState('first_session');
  const [isAdding, setIsAdding] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSessions, setEditSessions] = useState('3');
  const [editHours, setEditHours] = useState('5');
  const [editRule, setEditRule] = useState('first_session');

  const fetchSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await subjectAPI.getAll();
      setSubjects(res.data.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setError('');
    try {
      await subjectAPI.create({
        name: newSubName.trim(),
        completionThreshold: {
          sessions: parseInt(newSubSessions, 10) || 3,
          hours: parseFloat(newSubHours) || 5,
        },
        completionRule: newSubRule
      });
      setNewSubName('');
      setNewSubSessions('3');
      setNewSubHours('5');
      setIsAdding(false);
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add subject.');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    setError('');
    try {
      await subjectAPI.update(id, {
        name: editName.trim(),
        completionThreshold: {
          sessions: parseInt(editSessions, 10) || 3,
          hours: parseFloat(editHours) || 5,
        },
        completionRule: editRule
      });
      setEditingId(null);
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update subject.');
    }
  };

  const startEditing = (sub) => {
    setEditingId(sub._id);
    setEditName(sub.name);
    setEditSessions(String(sub.completionThreshold?.sessions || 3));
    setEditHours(String(sub.completionThreshold?.hours || 5));
    setEditRule(sub.completionRule || 'first_session');
  };

  const handleToggleArchive = async (sub) => {
    setError('');
    try {
      await subjectAPI.update(sub._id, {
        isArchived: !sub.isArchived,
        active: sub.isArchived, // if archiving, make inactive. If restoring, make active.
      });
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to toggle archive status.');
    }
  };

  const handleToggleActive = async (sub) => {
    setError('');
    try {
      await subjectAPI.update(sub._id, {
        active: !sub.active,
      });
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to toggle active status.');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject? This will soft-delete all its chapters. Historical study sessions will be preserved.')) return;
    setError('');
    try {
      await subjectAPI.remove(id);
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete subject.');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    const list = [...subjects];
    // Swap items
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Optimistically update state
    setSubjects(list);

    // Persist new orders to backend
    try {
      await Promise.all([
        subjectAPI.update(list[index]._id, { order: index }),
        subjectAPI.update(list[targetIndex]._id, { order: targetIndex })
      ]);
    } catch (err) {
      console.error('Failed to save order change:', err);
      // Revert if API fails
      fetchSubjects();
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Subject Manager</h1>
          <p className="text-sm text-gray-400 mt-1">Configure subjects, toggle archiving, and set graduation rules.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] text-[#070B14] font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_20px_rgba(94,234,212,0.4)] transition-all"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#5EEAD4]" />
                Create New Subject
              </h2>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-xs text-gray-400">Subject Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Database Systems"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#5EEAD4] text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Completion Rule</label>
                    <select
                      value={newSubRule}
                      onChange={(e) => setNewSubRule(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm"
                    >
                      <option value="first_session">First Session (Default)</option>
                      <option value="sixty_minutes">60 Minutes Focus</option>
                      <option value="custom_threshold">Custom Threshold</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Threshold (Sessions)</label>
                    <input
                      type="number"
                      min="1"
                      value={newSubSessions}
                      onChange={(e) => setNewSubSessions(e.target.value)}
                      disabled={newSubRule !== 'custom_threshold'}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm disabled:opacity-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Threshold (Hours)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={newSubHours}
                      onChange={(e) => setNewSubHours(e.target.value)}
                      disabled={newSubRule !== 'custom_threshold'}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm disabled:opacity-40"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#5EEAD4] text-[#070B14] font-bold text-sm hover:opacity-90 transition-all"
                  >
                    Create Subject
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subjects list */}
      <GlassCard hoverEffect={false}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Your Subject List</h2>
          <button 
            onClick={fetchSubjects} 
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <div className="w-8 h-8 rounded-full border-2 border-t-[#5EEAD4] border-white/10 animate-spin" />
            <span className="text-sm">Loading academic data...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-sm font-semibold">No subjects registered</p>
            <p className="text-xs mt-1">Start by adding a subject using the button above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjects.map((sub, index) => {
              const isEditing = editingId === sub._id;
              
              return (
                <div
                  key={sub._id}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all ${
                    sub.isArchived 
                      ? 'bg-white/2 border-white/5 opacity-60' 
                      : 'bg-[#0F172A]/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Left Section: Info / Edit form */}
                  <div className="flex-1 space-y-3 md:space-y-0 md:flex md:items-center gap-4">
                    {/* Reorder Buttons */}
                    {!isEditing && (
                      <div className="flex md:flex-col gap-1 items-center justify-start">
                        <button
                          onClick={() => handleMoveOrder(index, -1)}
                          disabled={index === 0}
                          className="p-1 rounded bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(index, 1)}
                          disabled={index === subjects.length - 1}
                          className="p-1 rounded bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-[#162033] border border-white/10 text-white text-sm"
                          title="Subject Name"
                        />
                        <select
                          value={editRule}
                          onChange={(e) => setEditRule(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-[#162033] border border-white/10 text-white text-sm"
                          title="Completion Rule"
                        >
                          <option value="first_session">First Session (Default)</option>
                          <option value="sixty_minutes">60 Minutes Focus</option>
                          <option value="custom_threshold">Custom Threshold</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={editSessions}
                          placeholder="Sess"
                          disabled={editRule !== 'custom_threshold'}
                          onChange={(e) => setEditSessions(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-[#162033] border border-white/10 text-white text-sm disabled:opacity-40"
                          title="Sessions Threshold"
                        />
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={editHours}
                          placeholder="Hrs"
                          disabled={editRule !== 'custom_threshold'}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-[#162033] border border-white/10 text-white text-sm disabled:opacity-40"
                          title="Hours Threshold"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-base">{sub.name}</span>
                          {sub.isArchived && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-300">
                              ARCHIVED
                            </span>
                          )}
                          {!sub.active && !sub.isArchived && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-500/20 border border-gray-500/30 text-gray-400">
                              INACTIVE
                            </span>
                          )}
                          {sub.active && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-500/20 border border-teal-500/30 text-teal-300">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            {sub.completionRule === 'first_session' && 'Rule: Completed on First Session'}
                            {sub.completionRule === 'sixty_minutes' && 'Rule: Completed after 60 Minutes focus'}
                            {(sub.completionRule === 'custom_threshold' || !sub.completionRule) && `Rule: Custom Threshold (${sub.completionThreshold?.sessions || 3} sessions / ${sub.completionThreshold?.hours || 5} hours)`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Section: Action Controls */}
                  <div className="flex items-center justify-end gap-2 mt-4 md:mt-0 border-t border-white/5 pt-3 md:pt-0 md:border-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(sub._id)}
                          className="p-2 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 hover:bg-teal-500/30"
                          title="Save Changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                          title="Cancel Edit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleActive(sub)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            sub.active 
                              ? 'bg-teal-500/10 border-teal-500/20 text-teal-300 hover:bg-teal-500/20' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                          title={sub.active ? 'Set Inactive' : 'Set Active'}
                        >
                          {sub.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleToggleArchive(sub)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-yellow-500/30 hover:bg-yellow-500/10 hover:text-yellow-400 transition-colors"
                          title={sub.isArchived ? 'Restore from Archive' : 'Archive Subject'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEditing(sub)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                          title="Edit Settings"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(sub._id)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default SubjectManagerPage;
