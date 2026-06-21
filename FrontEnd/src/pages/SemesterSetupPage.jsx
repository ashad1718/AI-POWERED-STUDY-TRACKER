import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ShieldAlert, Plus, Trash2, ArrowRight, CheckCircle2, AlertCircle, BookOpen, Settings
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { semesterAPI } from '../services/api';

const SemesterSetupPage = () => {
  const navigate = useNavigate();
  const [newSubjects, setNewSubjects] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [archiveActive, setArchiveActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Semester Configuration State
  const [semesterNameOption, setSemesterNameOption] = useState('Semester 1');
  const [customSemesterName, setCustomSemesterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expectedHoursPerWeek, setExpectedHoursPerWeek] = useState('10');
  const [goalGPA, setGoalGPA] = useState('');

  const handleAddSubjectToList = (e) => {
    e.preventDefault();
    if (!currentInput.trim()) return;
    if (newSubjects.includes(currentInput.trim())) {
      setError('Subject already added to the list.');
      return;
    }
    setError('');
    setNewSubjects([...newSubjects, currentInput.trim()]);
    setCurrentInput('');
  };

  const handleRemoveSubjectFromList = (name) => {
    setNewSubjects(newSubjects.filter(sub => sub !== name));
  };

  const handleLaunchSemester = async () => {
    const finalName = semesterNameOption === 'Custom' ? customSemesterName : semesterNameOption;
    if (!finalName || !finalName.trim()) {
      setError('Semester name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date.');
      return;
    }
    const hours = parseFloat(expectedHoursPerWeek);
    if (isNaN(hours) || hours <= 0) {
      setError('Expected study hours per week must be greater than 0.');
      return;
    }
    if (newSubjects.length === 0) {
      setError('Please add at least one subject for the new semester.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await semesterAPI.setupSemester({
        name: finalName.trim(),
        startDate,
        endDate,
        expectedHoursPerWeek: hours,
        goalGPA: goalGPA ? parseFloat(goalGPA) : undefined,
        archiveActive,
        newSubjects,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to initialize the new semester.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="max-w-md w-full text-center py-12 space-y-6">
          <div className="w-16 h-16 bg-[#5EEAD4]/20 rounded-full flex items-center justify-center mx-auto text-[#5EEAD4] animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Semester Launched!</h2>
            <p className="text-sm text-gray-400">
              Your previous subjects are archived. The new academic profile is active!
            </p>
          </div>
          <div className="text-xs text-teal-400 font-bold animate-pulse">
            Redirecting to Dashboard...
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#5EEAD4]" /> New Semester Setup
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Archive previous subjects and establish your new academic curriculum.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left column: Information and options */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard hoverEffect={false} className="border-yellow-500/20 bg-yellow-500/5">
            <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4" />
              Academic Rollover
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Starting a new semester rolls over your current subject setup. 
              All active subjects will be marked as archived, freeing up your dashboard 
              for new coursework while fully retaining all historical study hours and logs.
            </p>
          </GlassCard>

          <GlassCard hoverEffect={false}>
            <h3 className="text-base font-bold text-white mb-4">Semester Configuration</h3>
            <div className="space-y-4">
              {/* Semester Name Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Semester Name</label>
                <select
                  value={semesterNameOption}
                  onChange={(e) => setSemesterNameOption(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm"
                >
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Custom">Custom Name...</option>
                </select>
              </div>

              {semesterNameOption === 'Custom' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Semester Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Fall 2026"
                    value={customSemesterName}
                    onChange={(e) => setCustomSemesterName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#5EEAD4] text-sm"
                    required
                  />
                </div>
              )}

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm"
                  required
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm"
                  required
                />
              </div>

              {/* Expected study hours per week */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Study Hours / Week</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={expectedHoursPerWeek}
                  onChange={(e) => setExpectedHoursPerWeek(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm"
                  required
                />
              </div>

              {/* Optional Goal GPA */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Goal GPA (Optional)</label>
                <input
                  type="number"
                  min="0.0"
                  max="10.0"
                  step="0.1"
                  placeholder="e.g. 3.8"
                  value={goalGPA}
                  onChange={(e) => setGoalGPA(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white focus:outline-none focus:border-[#5EEAD4] text-sm"
                />
              </div>

              {/* Rollover Settings Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={archiveActive}
                  onChange={(e) => setArchiveActive(e.target.checked)}
                  className="mt-1 accent-[#5EEAD4]"
                />
                <div>
                  <p className="text-sm font-semibold text-white">Archive Current Curriculum</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Set all currently active subjects to "Archived" status automatically.
                  </p>
                </div>
              </label>
            </div>
          </GlassCard>
        </div>

        {/* Right column: Subject adding and listing */}
        <div className="lg:col-span-3 space-y-6">
          <GlassCard hoverEffect={false}>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#6EA8FE]" />
              New Curriculum Intake
            </h3>
            
            <form onSubmit={handleAddSubjectToList} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="e.g. Operating Systems"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#162033] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#5EEAD4] text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#5EEAD4] text-[#070B14] font-bold text-sm flex items-center gap-1 hover:opacity-90 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </form>

            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              List of New Subjects ({newSubjects.length})
            </h4>

            {newSubjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-white/5 rounded-xl">
                <p className="text-xs">No subjects added to the list yet.</p>
              </div>
            ) : (
              <div data-lenis-prevent className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {newSubjects.map((sub, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0F172A]/60 border border-white/5 animate-fadeIn"
                  >
                    <span className="text-sm font-semibold text-white">{sub}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubjectFromList(sub)}
                      className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleLaunchSemester}
              disabled={loading}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#6EA8FE] to-[#5EEAD4] text-[#070B14] font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(94,234,212,0.4)] disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-[#070B14] border-black/10 animate-spin" />
              ) : (
                <>
                  <span>Launch New Semester</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default SemesterSetupPage;
