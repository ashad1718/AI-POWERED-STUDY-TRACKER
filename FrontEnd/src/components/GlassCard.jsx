import React from 'react';

const GlassCard = ({ children, className = '', hoverEffect = true }) => {
  return (
    <div 
      className={`glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden ${
        hoverEffect ? 'hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(79,124,255,0.15)]' : ''
      } ${className}`}
    >
      {/* Subtle top inner glow line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      
      {/* Card Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
