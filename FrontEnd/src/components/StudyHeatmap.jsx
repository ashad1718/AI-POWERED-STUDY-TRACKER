import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, HelpCircle } from 'lucide-react';
import { statsAPI } from '../services/api';

const StudyHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const { data } = await statsAPI.heatmap();
        if (data?.success) {
          setHeatmapData(data.data || {});
        } else {
          setError('Failed to fetch consistency heatmap.');
        }
      } catch (err) {
        console.error('[HEATMAP FETCH ERROR]', err);
        setError('Could not establish connection to stats heatmap.');
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, []);

  // Generate 53 weeks of dates ending today
  const getHeatmapDays = () => {
    const list = [];
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(endDate);
    // Align to start on Sunday 52 weeks ago
    startDate.setDate(endDate.getDate() - (52 * 7) - endDate.getDay());

    let current = new Date(startDate);
    while (current <= endDate) {
      list.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return list;
  };

  const days = getHeatmapDays();
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Calculate month labels with column offsets
  const monthLabels = [];
  let prevMonth = -1;
  weeks.forEach((week, colIdx) => {
    const firstDayOfMonth = week.find(d => d.getDate() <= 7);
    if (firstDayOfMonth) {
      const month = firstDayOfMonth.getMonth();
      if (month !== prevMonth) {
        monthLabels.push({
          colIdx,
          label: firstDayOfMonth.toLocaleString('default', { month: 'short' }),
        });
        prevMonth = month;
      }
    }
  });

  const getCellColor = (mins) => {
    if (!mins || mins === 0) return 'bg-white/5 dark:bg-white/5 bg-slate-200/50';
    if (mins < 15) return 'bg-[#00D4C7]/20';
    if (mins < 45) return 'bg-[#00D4C7]/40';
    if (mins < 90) return 'bg-[#00D4C7]/70';
    return 'bg-[#00D4C7]';
  };

  const handleMouseEnter = (e, date, info) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest('.heatmap-relative-container');
    const containerRect = container.getBoundingClientRect();

    setHoveredCell({
      date,
      minutes: info?.minutes || 0,
      completedChapters: info?.completedChapters || 0,
    });

    setTooltipPos({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 10,
    });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-surface/40 backdrop-blur-xl border border-border shadow-2xl flex flex-col items-center justify-center min-h-[220px]">
        <span className="w-8 h-8 border-4 border-[#00D4C7] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-text-secondary mt-3">Synthesizing study heatmap history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-surface/40 backdrop-blur-xl border border-border shadow-2xl flex items-center justify-center text-error min-h-[220px]">
        <p className="text-xs font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface/40 backdrop-blur-xl border border-border shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <span className="px-2.5 py-1 text-[10px] font-black tracking-widest rounded bg-[#00D4C7]/10 border border-[#00D4C7]/20 text-[#00D4C7] uppercase">
            Consistency Map
          </span>
          <h3 className="text-lg font-black text-white mt-2">Study Consistency Heatmap</h3>
          <p className="text-xs text-gray-400">Track and visualize your daily study minutes and syllabus accomplishments.</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-text-secondary/70 font-semibold self-start sm:self-center bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-white/5" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#00D4C7]/20" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#00D4C7]/40" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#00D4C7]/70" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#00D4C7]" />
          <span>More</span>
          <div className="w-[1px] h-3 bg-white/10 mx-1" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#00D4C7]/40 border border-[#FFD700] shadow-[0_0_3px_#FFD700]" />
          <span>Chapter Completed</span>
        </div>
      </div>

      {/* Heatmap Area */}
      <div className="relative heatmap-relative-container">
        
        {/* Tooltip Overlay */}
        <AnimatePresence>
          {hoveredCell && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute z-50 transform -translate-x-1/2 -translate-y-full bg-[#11072F]/95 text-white text-[10px] p-2.5 rounded-xl border border-white/15 shadow-2xl backdrop-blur-md pointer-events-none select-none min-w-[155px] text-center"
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
              }}
            >
              <p className="font-extrabold text-white">
                {hoveredCell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="w-full h-[1px] bg-white/10 my-1.5" />
              <p className="text-text-secondary font-medium">
                Studied: <span className="text-[#00D4C7] font-extrabold">{hoveredCell.minutes} mins</span>
              </p>
              {hoveredCell.completedChapters > 0 && (
                <p className="text-yellow-400 font-extrabold mt-1 flex items-center justify-center gap-1">
                  🏆 Finished {hoveredCell.completedChapters} {hoveredCell.completedChapters === 1 ? 'chapter' : 'chapters'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable grid wrapper */}
        <div data-lenis-prevent className="overflow-x-auto pb-2 heatmap-scroll-container scroll-smooth">
          <div className="min-w-[760px] flex flex-row items-end">
            
            {/* Weekday indicator labels */}
            <div className="flex flex-col gap-[3px] text-[9px] text-text-secondary/60 font-semibold justify-between pr-2 pb-0.5 select-none h-[102px]">
              <span className="h-3 flex items-center">Sun</span>
              <span className="h-3 flex items-center">Tue</span>
              <span className="h-3 flex items-center">Thu</span>
              <span className="h-3 flex items-center">Sat</span>
            </div>

            {/* Grid display */}
            <div className="flex-1">
              {/* Months timeline header */}
              <div className="flex gap-[3px] text-[10px] text-text-secondary/70 font-semibold mb-2 h-4 select-none">
                {weeks.map((_, colIdx) => {
                  const labelObj = monthLabels.find(m => m.colIdx === colIdx);
                  return (
                    <div key={colIdx} className="w-3 shrink-0 relative">
                      {labelObj && (
                        <span className="absolute left-0 -top-1 whitespace-nowrap text-[9px] font-bold">
                          {labelObj.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid Column Layout */}
              <div className="flex gap-[3px] select-none">
                {weeks.map((week, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-[3px] shrink-0">
                    {week.map((date, dayIdx) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const cellInfo = heatmapData[dateStr] || { minutes: 0, completedChapters: 0 };
                      const colorClass = getCellColor(cellInfo.minutes);
                      const hasCompleted = cellInfo.completedChapters > 0;

                      return (
                        <div
                          key={dayIdx}
                          onMouseEnter={(e) => handleMouseEnter(e, date, cellInfo)}
                          onMouseLeave={handleMouseLeave}
                          className={`w-3 h-3 rounded-[3px] cursor-pointer transition-all duration-150 ${colorClass} ${
                            hasCompleted 
                              ? 'border border-[#FFD700] ring-[1px] ring-[#FFD700]/30 shadow-[0_0_4px_#FFD700]' 
                              : 'hover:scale-125'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default StudyHeatmap;
