import React, { useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import gsap from 'gsap';

const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const indicatorRef = useRef(null);
  const sunRef = useRef(null);
  const moonRef = useRef(null);

  const handleToggle = () => {
    // Select the target icon that is being activated
    const targetIcon = isDark ? sunRef.current : moonRef.current;
    
    // Scale bounce on the incoming icon
    gsap.fromTo(targetIcon,
      { scale: 0.6, rotate: -45 },
      { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2)' }
    );

    // Organic squishy stretch on the slider circle
    gsap.fromTo(indicatorRef.current,
      { scaleY: 0.85, scaleX: 1.25 },
      { scaleY: 1, scaleX: 1, duration: 0.35, ease: 'power3.out' }
    );

    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="relative w-14 h-8 rounded-full p-1 bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between cursor-pointer select-none transition-all duration-300 focus:outline-none overflow-hidden shadow-inner group"
      aria-label="Toggle theme"
    >
      {/* Sliding Background Indicator */}
      <span
        ref={indicatorRef}
        className={`absolute w-6 h-6 rounded-full bg-gradient-to-tr transition-transform duration-300 ease-out shadow-md ${
          isDark 
            ? 'translate-x-6 from-[#6EA8FE] to-[#5EEAD4]' 
            : 'translate-x-0 from-[#4F7CFF] to-[#00C2A8]'
        }`}
      />

      {/* Sun Icon (Light Mode) */}
      <div 
        ref={sunRef}
        className={`z-10 flex items-center justify-center w-6 h-6 transition-colors duration-300 ${
          !isDark ? 'text-white font-bold' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </div>

      {/* Moon Icon (Dark Mode) */}
      <div 
        ref={moonRef}
        className={`z-10 flex items-center justify-center w-6 h-6 transition-colors duration-300 ${
          isDark ? 'text-white font-bold' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </div>
    </button>
  );
};

export default ThemeToggle;
