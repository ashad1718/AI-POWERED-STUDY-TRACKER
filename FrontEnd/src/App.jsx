import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

import BlobBackground   from './components/BlobBackground';
import Navbar           from './components/Navbar';
import Footer           from './components/Footer';
import Sidebar          from './components/Sidebar';

import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import Dashboard        from './pages/Dashboard';
import StudySessionPage from './pages/StudySessionPage';
import ProfilePage      from './pages/ProfilePage';
import AICoachPage      from './pages/AICoachPage';

import { useAuth }      from './hooks/useAuth';

const AppContent = () => {
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('accessToken');
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { login, register, logout } = useAuth(setIsLoggedIn, setUser);

  // ─── Lenis Smooth Scroll ───────────────────────────────────────────────────
  useEffect(() => {
    if (window.innerWidth < 1024) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenis.on('scroll', ScrollTrigger.update);
    const rafTicker = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(rafTicker);
    gsap.ticker.lagSmoothing(0);
    return () => { lenis.destroy(); gsap.ticker.remove(rafTicker); };
  }, [location.pathname]);

  // ─── Sync user to localStorage when it changes ────────────────────────────
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  // ─── Scroll-to anchor after navigation ────────────────────────────────────
  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const isDashboardRoute = ['/dashboard', '/study-session', '/profile', '/ai-coach'].includes(location.pathname);

  const PrivateRoute = ({ children }) =>
    isLoggedIn ? children : <Navigate to="/login" replace />;

  const PublicRoute = ({ children }) =>
    !isLoggedIn ? children : <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-screen font-sans antialiased text-white selection:bg-[#6C63FF]/30 select-none">
      <BlobBackground />

      <div className="flex flex-col min-h-screen">
        <Navbar isLoggedIn={isLoggedIn} handleLogout={logout} user={user} />
        
        <main className={`flex-grow w-full ${isDashboardRoute ? 'pt-28 pb-12 px-4 md:px-8 max-w-7xl mx-auto' : ''}`}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Public/Landing Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login"    element={<PublicRoute><LoginPage    handleLogin={login}    /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage handleLogin={register} /></PublicRoute>} />
              
              {/* Private Dashboard/App Routes */}
              <Route path="/dashboard"    element={<PrivateRoute><Dashboard        user={user} /></PrivateRoute>} />
              <Route path="/study-session"element={<PrivateRoute><StudySessionPage /></PrivateRoute>} />
              <Route path="/ai-coach"     element={<PrivateRoute><AICoachPage      user={user} /></PrivateRoute>} />
              <Route path="/profile"      element={<PrivateRoute><ProfilePage      user={user} /></PrivateRoute>} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/"} replace />} />
            </Routes>
          </AnimatePresence>
        </main>
        
        {!isDashboardRoute && <Footer />}
      </div>
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
