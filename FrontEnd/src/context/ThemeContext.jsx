import React, { createContext, useContext, useState, useEffect } from 'react';
import gsap from 'gsap';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // 1. Check local storage
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // 2. Detect system preference
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemDark ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Add temporary transitioning class for smooth color morphing
    document.documentElement.classList.add('theme-transitioning');
    
    setTheme(nextTheme);

    // GSAP page fade enhancement
    gsap.fromTo('main', 
      { opacity: 0.9, y: 2 }, 
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    );

    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 450);
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
