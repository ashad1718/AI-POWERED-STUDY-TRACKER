import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Check, X, BookOpen, Clock, AlertCircle, 
  RefreshCw, ArrowUp, ArrowDown, Edit2, Layers, CheckCircle2 
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { subjectAPI, chapterAPI } from '../services/api';

const ChapterManagerPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [newChapName, setNewChapName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    setError('');
    try {
      const res = await subjectAPI.getAll({ active: true });
      const activeSubs = res.data.data.subjects || [];
      setSubjects(activeSubs);
      if (activeSubs.length > 0) {
        setSelectedSubId(activeSubs[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch subjects.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchChapters = async (subId, showLoading = true) => {
    if (!subId) return;
    if (showLoading) setLoadingChapters(true);
    setError('');
    try {
      const res = await chapterAPI.getAll({ subjectId: subId });
      setChapters(res.data.data.chapters || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch chapters.');
    } finally {
      if (showLoading) setLoadingChapters(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubId) {
      fetchChapters(selectedSubId);
    } else {
      setChapters([]);
    }
  }, [selectedSubId]);

  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapName.trim() || !selectedSubId) return;
    setError('');
    try {
      await chapterAPI.create({
        subjectId: selectedSubId,
        name: newChapName.trim(),
        order: chapters.length,
      });
      setNewChapName('');
      setIsAdding(false);
      fetchChapters(selectedSubId, false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add chapter.');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    setError('');
    try {
      await chapterAPI.update(id, { name: editName.trim() });
      setEditingId(null);
      fetchChapters(selectedSubId, false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update chapter.');
    }
  };

  const startEditing = (chap) => {
    setEditingId(chap._id);
    setEditName(chap.name);
  };

  const handleToggleCompleted = async (chap) => {
    setError('');
    
    // Optimistic UI Update
    const previousChapters = [...chapters];
    setChapters(prev => prev.map(c => {
      if (c._id === chap._id) {
        const nextCompleted = !c.completed;
        return {
          ...c,
          completed: nextCompleted,
          completedMethod: nextCompleted ? 'manual' : 'none'
        };
      }
      return c;
    }));

    try {
      await chapterAPI.update(chap._id, {
        completed: !chap.completed,
        completedMethod: !chap.completed ? 'manual' : 'none'
      });
      // Background sync without loader
      await fetchChapters(selectedSubId, false);
    } catch (err) {
      // Revert optimistic update on error
      setChapters(previousChapters);
      setError(err.response?.data?.error?.message || 'Failed to toggle chapter completion.');
    }
  };

  const handleDeleteChapter = async (id) => {
    if (!window.confirm('Are you sure you want to delete this chapter? Historical logged sessions will still be preserved.')) return;
    setError('');
    try {
      await chapterAPI.remove(id);
      fetchChapters(selectedSubId, false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete chapter.');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const list = [...chapters];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    setChapters(list);

    try {
      await Promise.all([
        chapterAPI.update(list[index]._id, { order: index }),
        chapterAPI.update(list[targetIndex]._id, { order: targetIndex })
      ]);
    } catch (err) {
      console.error('Failed to save chapter reorder:', err);
      fetchChapters(selectedSubId);
    }
  };

  const completedCount = chapters.filter(c => c.completed).length;
  const totalCount = chapters.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Chapter Manager</h1>
          <p className="text-sm text-gray-400 mt-1">Break your subjects down into chapters and track syllabus completion status.</p>
        </div>
        {selectedSubId && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] text-[#070B14] font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_20px_rgba(94,234,212,0.4)] transition-all"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancel' : 'Add Chapter'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loadingSubjects ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-t-[#5EEAD4] border-white/10 animate-spin" />
        </div>
      ) : subjects.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600 animate-pulse" />
            <h3 className="text-lg font-bold text-white mb-2">No Active Subjects Found</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              You must have at least one active subject before configuring chapters.
            </p>
            <a 
              href="/subjects" 
              className="px-6 py-2.5 rounded-xl bg-[#5EEAD4] text-[#070B14] font-bold text-sm hover:opacity-90 inline-block"
            >
              Go to Subject Manager
            </a>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subject selector and Stats */}
          <div className="space-y-6 lg:col-span-1">
            <GlassCard hoverEffect={false}>
              <h3 className="text-lg font-bold text-white mb-4">Select Subject</h3>
              <div className="space-y-2">
                {subjects.map((sub) => (
                  <button
                    key={sub._id}
                    onClick={() => setSelectedSubId(sub._id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-semibold flex items-center justify-between ${
                      selectedSubId === sub._id
                        ? 'bg-[#162033]/60 border-[#5EEAD4] text-white shadow-[0_0_15px_rgba(94,234,212,0.1)]'
                        : 'bg-white/2 border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{sub.name}</span>
                    <Layers className="w-4 h-4 text-gray-500" />
                  </button>
                ))}
              </div>
            </GlassCard>

            {selectedSubId && (
              <GlassCard hoverEffect={false} className="bg-gradient-to-br from-[#0F172A]/80 to-[#162033]/40">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Syllabus Completion</h4>
                <div className="flex items-center gap-6">
                  {/* Circular progress SVG */}
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className="stroke-white/5 fill-transparent"
                        strokeWidth="6"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className="stroke-[#5EEAD4] fill-transparent transition-all duration-1000"
                        strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - progressPercent / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-extrabold text-white text-sm">
                      {progressPercent}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-white">{completedCount} / {totalCount}</p>
                    <p className="text-xs text-gray-400">Chapters Completed</p>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Chapters Manager list */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Chapter Card */}
            <AnimatePresence>
              {isAdding && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <GlassCard>
                    <h3 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#5EEAD4]" />
                      Add Chapter for {subjects.find(s => s._id === selectedSubId)?.name}
                    </h3>
                    <form onSubmit={handleAddChapter} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="e.g. Chapter 1: Introduction to SQL"
                        value={newChapName}
                        onChange={(e) => setNewChapName(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm"
                        required
                      />
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#5EEAD4] text-[#070B14] font-bold text-sm hover:opacity-90 transition-all"
                      >
                        Add
                      </button>
                    </form>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chapters list card */}
            <GlassCard hoverEffect={false}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Syllabus Breakdown: {subjects.find(s => s._id === selectedSubId)?.name}
                </h3>
                <button
                  onClick={() => fetchChapters(selectedSubId)}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loadingChapters ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                  <div className="w-8 h-8 rounded-full border-2 border-t-[#5EEAD4] border-white/10 animate-spin" />
                  <span className="text-sm">Loading chapters...</span>
                </div>
              ) : chapters.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm font-semibold">No chapters defined yet</p>
                  <p className="text-xs mt-1">Add a chapter using the button in the top right.</p>
                </div>
              ) : (
                <div 
                  data-lenis-prevent 
                  className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar-chat"
                >
                  {chapters.map((chap, index) => {
                    const isEditing = editingId === chap._id;

                    return (
                      <div
                        key={chap._id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          chap.completed
                            ? 'bg-[#5EEAD4]/5 border-[#5EEAD4]/20'
                            : 'bg-[#0F172A]/40 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Checkbox button */}
                          <button
                            onClick={() => handleToggleCompleted(chap)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              chap.completed
                                ? 'bg-[#5EEAD4] border-[#5EEAD4] text-[#070B14]'
                                : 'border-white/20 hover:border-[#5EEAD4] text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          {/* Reorder actions */}
                          {!isEditing && (
                            <div className="flex flex-col shrink-0 gap-0.5">
                              <button
                                onClick={() => handleMoveOrder(index, -1)}
                                disabled={index === 0}
                                className="p-0.5 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-20"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveOrder(index, 1)}
                                disabled={index === chapters.length - 1}
                                className="p-0.5 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-20"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-[#162033] border border-white/10 text-white text-sm"
                              autoFocus
                            />
                          ) : (
                            <div className="truncate">
                              <p className={`text-sm font-semibold truncate ${chap.completed ? 'text-gray-300 line-through' : 'text-white'}`}>
                                {chap.name}
                              </p>
                              {chap.completed && (
                                <p className="text-[10px] text-[#5EEAD4] font-medium mt-0.5">
                                  ✓ Completed {chap.completedMethod === 'auto' ? '(Auto-logged)' : '(Manual)'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(chap._id)}
                                className="p-1.5 rounded bg-[#5EEAD4]/20 border border-[#5EEAD4]/30 text-[#5EEAD4] hover:bg-[#5EEAD4]/30"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(chap)}
                                className="p-1.5 rounded bg-white/5 text-gray-500 hover:text-white border border-white/5"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteChapter(chap._id)}
                                className="p-1.5 rounded bg-white/5 text-gray-500 border border-white/5 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}
    </div>
  );
};

export default ChapterManagerPage;
