import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, MapPin, Calendar, Shield,
  Award, Zap, Clock, Brain, CheckCircle, AlertCircle,
  Plus, Edit, Trash2, ArrowUp, ArrowDown, X, Save, BookOpen
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';
import { achievementAPI, statsAPI, subjectAPI } from '../services/api';

const ICON_MAP = { Clock, Zap, Award, Brain };

const ProfilePage = ({ user = {} }) => {
  const pageRef = useRef(null);

  const [achievements, setAchievements] = useState([]);
  const [overview,     setOverview]     = useState(null);
  const [subjects,     setSubjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // ── Subject management states ──────────────────────────────────────────────
  const [newSubName, setNewSubName] = useState('');
  const [newSubThreshold, setNewSubThreshold] = useState(15);
  const [editingSubId, setEditingSubId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingThreshold, setEditingThreshold] = useState(15);
  const [subActionLoading, setSubActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [achRes, ovRes, subRes] = await Promise.all([
        achievementAPI.getAll(),
        statsAPI.overview(),
        subjectAPI.getAll(),
      ]);
      setAchievements(achRes.data.data.achievements);
      setOverview(ovRes.data.data);
      // Sort subjects by order property
      const fetchedSubjects = subRes.data.data.subjects || [];
      setSubjects(fetchedSubjects.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      setError('Failed to load profile data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  // ── Create Subject ─────────────────────────────────────────────────────────
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubName.trim() || subActionLoading) return;
    setSubActionLoading(true);
    try {
      const nextOrder = subjects.length > 0 ? Math.max(...subjects.map(s => s.order || 0)) + 1 : 0;
      await subjectAPI.create({
        name: newSubName,
        completionThreshold: {
          sessions: 3,
          hours: newSubThreshold
        },
        order: nextOrder,
        active: true
      });
      setNewSubName('');
      setNewSubThreshold(15);
      // Refresh subjects
      const subRes = await subjectAPI.getAll();
      setSubjects((subRes.data.data.subjects || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      console.error('Failed to create subject', err);
      alert('Error creating subject.');
    } finally {
      setSubActionLoading(false);
    }
  };

  // ── Toggle Active Status ───────────────────────────────────────────────────
  const handleToggleActive = async (sub) => {
    if (subActionLoading) return;
    setSubActionLoading(true);
    try {
      await subjectAPI.update(sub._id, { active: !sub.active });
      setSubjects(prev =>
        prev.map(s => s._id === sub._id ? { ...s, active: !s.active } : s)
      );
    } catch (err) {
      console.error('Failed to update active status', err);
    } finally {
      setSubActionLoading(false);
    }
  };

  // ── Edit Subject ───────────────────────────────────────────────────────────
  const startEditing = (sub) => {
    setEditingSubId(sub._id);
    setEditingName(sub.name);
    setEditingThreshold(sub.completionThreshold?.hours || (typeof sub.completionThreshold === 'number' ? sub.completionThreshold : 15));
  };

  const handleUpdateSubject = async (id) => {
    if (!editingName.trim() || subActionLoading) return;
    setSubActionLoading(true);
    try {
      await subjectAPI.update(id, {
        name: editingName,
        completionThreshold: {
          sessions: 3,
          hours: editingThreshold
        }
      });
      setSubjects(prev =>
        prev.map(s => s._id === id ? { ...s, name: editingName, completionThreshold: { sessions: 3, hours: editingThreshold } } : s)
      );
      setEditingSubId(null);
    } catch (err) {
      console.error('Failed to update subject', err);
    } finally {
      setSubActionLoading(false);
    }
  };

  // ── Delete Subject ─────────────────────────────────────────────────────────
  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject? Historical study sessions will be preserved, but new ones cannot be logged.')) return;
    if (subActionLoading) return;
    setSubActionLoading(true);
    try {
      await subjectAPI.remove(id);
      setSubjects(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error('Failed to delete subject', err);
    } finally {
      setSubActionLoading(false);
    }
  };

  // ── Reorder Subjects ───────────────────────────────────────────────────────
  const handleReorder = async (index, direction) => {
    if (subActionLoading) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    setSubActionLoading(true);
    try {
      const updatedList = [...subjects];
      // Swap items in memory
      const temp = updatedList[index];
      updatedList[index] = updatedList[targetIndex];
      updatedList[targetIndex] = temp;

      // Update order values sequentially
      const updatedPromises = updatedList.map((sub, i) => {
        return subjectAPI.update(sub._id, { order: i });
      });
      
      await Promise.all(updatedPromises);
      
      // Update local state
      setSubjects(updatedList.map((sub, i) => ({ ...sub, order: i })));
    } catch (err) {
      console.error('Failed to reorder subjects', err);
    } finally {
      setSubActionLoading(false);
    }
  };

  const totalHrs     = overview ? (overview.totalMinutes / 60).toFixed(1) : '—';
  const totalSessions= overview?.totalSessions ?? '—';
  const earnedCount  = achievements.filter((a) => a.earned).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <span className="w-10 h-10 border-4 border-[#5EEAD4] border-t-transparent rounded-full animate-spin" />
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
        <p className="text-sm text-gray-400 mt-1">Manage credentials, review achievements, and customize your academic syllabus.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar Card */}
        <div className="space-y-6">
          <GlassCard className="profile-stagger-card flex flex-col items-center justify-center text-center p-8 relative" hoverEffect={false}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#6EA8FE]/10 blur-2xl pointer-events-none rounded-full" />
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#6EA8FE] to-[#5EEAD4] p-1 shadow-[0_0_30px_rgba(94,234,212,0.3)] flex items-center justify-center">
                <div className="w-full h-full bg-[#070B14] rounded-full flex items-center justify-center font-black text-white text-3xl">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
              </div>
              <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-[#070B14] shadow-md" />
            </motion.div>

            <h3 className="text-xl font-bold text-white capitalize">{user?.name || 'Academic Scholar'}</h3>
            <p className="text-sm text-[#5EEAD4] mt-1 font-medium">Premium Member</p>

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
                <h4 className="text-3xl font-black text-[#5EEAD4] font-mono mt-1">{totalSessions}</h4>
                <p className="text-[10px] text-gray-500">Saved study sessions</p>
              </div>
            </GlassCard>

            <GlassCard className="profile-stagger-card flex flex-col justify-between h-32">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Badges Claimed</span>
              <div>
                <h4 className="text-3xl font-black text-[#6EA8FE] font-mono mt-1">
                  {earnedCount} / {achievements.length}
                </h4>
                <p className="text-[10px] text-gray-500">Progress toward milestone cap</p>
              </div>
            </GlassCard>
          </div>

          {/* Achievements */}
          <GlassCard className="profile-stagger-card" hoverEffect={false}>
            <div className="flex items-center space-x-2 text-[#5EEAD4] mb-6">
              <Award className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Milestones & Achievements</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map((item) => {
                const Icon = ICON_MAP[item.icon] || Award;
                return (
                  <div key={item.slug}
                    className={`p-4 rounded-xl border flex items-start space-x-4 transition-all duration-300 ${item.earned ? 'bg-white/5 border-white/10 opacity-100 hover:border-[#5EEAD4]/30' : 'bg-white/[0.01] border-white/5 opacity-50'}`}>
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

      {/* ── Academic Profile Section ───────────────────────────────────────── */}
      <div className="profile-stagger-card">
        <GlassCard hoverEffect={false}>
          <div className="flex items-center space-x-2 text-[#5EEAD4] mb-6">
            <BookOpen className="w-5 h-5" />
            <h3 className="text-lg font-bold text-white">Academic Profile</h3>
          </div>

          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Manage your enrollment syllabus below. Add, edit, reorder, or toggle active/inactive status of your academic subjects. Reordering defines your preference display across logs and dashboard lists.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Subject Creation Form */}
            <div className="lg:col-span-4 bg-white/2 border border-white/5 p-5 rounded-xl self-start space-y-4">
              <h4 className="text-sm font-bold text-white mb-2">Add New Subject</h4>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="glass-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none bg-[#0F172A] border border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Auto-Completion Threshold (Hrs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newSubThreshold}
                    onChange={(e) => setNewSubThreshold(parseInt(e.target.value, 10))}
                    className="glass-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none bg-[#0F172A] border border-white/10 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={subActionLoading}
                  className="w-full py-2 bg-[#5EEAD4] text-[#070B14] font-black text-xs rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              </form>
            </div>

            {/* List and Customization */}
            <div className="lg:col-span-8 space-y-3">
              {subjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                  No subjects registered. Use the left panel to register your first subject.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {subjects.map((sub, index) => {
                    const isEditing = editingSubId === sub._id;
                    return (
                      <div
                        key={sub._id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                          sub.active ? 'bg-white/5 border-white/10' : 'bg-white/[0.01] border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                          {/* Reordering arrows */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              onClick={() => handleReorder(index, 'up')}
                              disabled={index === 0 || subActionLoading}
                              className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleReorder(index, 'down')}
                              disabled={index === subjects.length - 1 || subActionLoading}
                              className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          {isEditing ? (
                            <div className="flex gap-2 flex-1 items-center">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="glass-input px-2.5 py-1 text-xs rounded-md focus:outline-none bg-[#0F172A] border border-white/20 text-white w-full max-w-[200px]"
                              />
                              <input
                                type="number"
                                value={editingThreshold}
                                onChange={(e) => setEditingThreshold(parseInt(e.target.value, 10))}
                                className="glass-input px-2.5 py-1 text-xs rounded-md focus:outline-none bg-[#0F172A] border border-white/20 text-white w-16"
                                title="Completion Threshold (Hours)"
                              />
                              <span className="text-[10px] text-gray-500">hrs</span>
                            </div>
                          ) : (
                            <div className="truncate pr-4">
                              <span className="text-sm font-bold text-white block truncate">{sub.name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${sub.active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                  {sub.active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  Threshold: {sub.completionThreshold?.hours || (typeof sub.completionThreshold === 'number' ? sub.completionThreshold : 15)} hrs
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 mt-3 sm:mt-0 justify-end shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleUpdateSubject(sub._id)}
                                className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors cursor-pointer"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSubId(null)}
                                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleActive(sub)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                  sub.active
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                    : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                }`}
                              >
                                {sub.active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => startEditing(sub)}
                                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Edit Name"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(sub._id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
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
            </div>
          </div>
        </GlassCard>
      </div>

    </div>
  );
};

export default ProfilePage;
