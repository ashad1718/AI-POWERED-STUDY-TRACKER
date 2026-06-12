import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * AIScoreRing
 * Animated circular progress ring for displaying AI scores (0–100).
 *
 * Props:
 *   score   {number}  0–100
 *   label   {string}  e.g. "Study Score"
 *   color   {string}  Tailwind gradient class or hex
 *   size    {number}  SVG size in px (default 120)
 *   delay   {number}  animation delay in seconds (default 0)
 */
const AIScoreRing = ({
  score  = 0,
  label  = 'Score',
  color  = '#6C63FF',
  color2 = '#00E5FF',
  size   = 120,
  delay  = 0,
}) => {
  const radius      = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset       = circumference - (score / 100) * circumference;

  // Determine colour based on score
  const getScoreColor = () => {
    if (score >= 80) return '#34D399';  // green
    if (score >= 60) return color;      // brand purple
    if (score >= 40) return '#FBBF24';  // amber
    return '#F472B6';                   // pink
  };

  const ringColor = getScoreColor();

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{
              duration:  1.4,
              delay,
              ease:      [0.16, 1, 0.3, 1],
            }}
            style={{
              filter: `drop-shadow(0 0 6px ${ringColor}60)`,
            }}
          />
        </svg>

        {/* Score number in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-black text-white font-mono leading-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.4, duration: 0.5, ease: 'backOut' }}
          >
            {score}
          </motion.span>
          <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">/ 100</span>
        </div>
      </div>

      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
        {label}
      </span>
    </div>
  );
};

export default AIScoreRing;
