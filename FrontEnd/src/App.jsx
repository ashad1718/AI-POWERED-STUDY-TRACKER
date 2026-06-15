import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import SubjectManagerPage from './pages/SubjectManagerPage';
import ChapterManagerPage from './pages/ChapterManagerPage';
import SemesterSetupPage  from './pages/SemesterSetupPage';

import { useAuth }      from './hooks/useAuth';
import { userAPI, refreshAccessToken } from './services/api';
import { ThemeProvider } from './context/ThemeContext';

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('accessToken');
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isRestoringAuth, setIsRestoringAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { login, register, logout } = useAuth(setIsLoggedIn, setUser);

  // ─── Initial Session Restoration & Verification ────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        console.log('[AUTH] Token found on startup. Verifying session...');
        try {
          const res = await userAPI.getMe();
          const verifiedUser = res.data.data;
          console.log(`[AUTH] Authentication restored. Logged in as: ${verifiedUser.name}`);
          setUser(verifiedUser);
          setIsLoggedIn(true);
        } catch (err) {
          console.error('[AUTH] Startup token verification failed. Clearing session.', err);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        console.log('[AUTH] No access token in localStorage. Attempting automatic refresh...');
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            const res = await userAPI.getMe();
            const verifiedUser = res.data.data;
            console.log(`[AUTH] Authentication restored via refresh token. Logged in as: ${verifiedUser.name}`);
            setUser(verifiedUser);
            setIsLoggedIn(true);
          } else {
            setUser(null);
            setIsLoggedIn(false);
          }
        } catch (refreshErr) {
          console.log('[AUTH] No active session found on startup.');
          setUser(null);
          setIsLoggedIn(false);
        }
      }
      setIsRestoringAuth(false);
    };

    restoreSession();
  }, []);

  // ─── Listen to Centralized Auth Logout Events (from interceptor) ─────────────
  useEffect(() => {
    const handleAuthLogout = (e) => {
      console.warn('[AUTH] Received logout event. Session invalidated.');
      logout();
      if (e.detail?.expired) {
        navigate('/login', { state: { message: 'Your session has expired. Please sign in again.' } });
      }
    };
    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, [logout, navigate]);

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
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  // ─── Scroll-to anchor after navigation ────────────────────────────────────
  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const isDashboardRoute = [
    '/dashboard', '/study-session', '/profile', '/ai-coach',
    '/subjects', '/chapters', '/semester-setup'
  ].includes(location.pathname);

  const PrivateRoute = ({ children }) =>
    isLoggedIn ? children : <Navigate to="/login" replace />;

  const PublicRoute = ({ children }) =>
    !isLoggedIn ? children : <Navigate to="/dashboard" replace />;

  // Render loading screen while verifying credentials
  if (isRestoringAuth) {
    return (
      <div className="relative min-h-screen font-sans antialiased text-text-primary selection:bg-primary/30 select-none bg-background flex items-center justify-center">
        <BlobBackground />
        <div className="flex flex-col items-center space-y-6 z-10 p-8 rounded-3xl bg-surface/40 backdrop-blur-xl border border-border shadow-2xl max-w-sm text-center">
          <div className="relative flex items-center justify-center w-16 h-16">
            <span className="absolute w-16 h-16 border-4 border-secondary/20 rounded-full" />
            <span className="absolute w-16 h-16 border-4 border-t-secondary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <div className="p-3 bg-gradient-to-tr from-[#7B4DFF] to-[#00D4C7] rounded-xl flex items-center justify-center shadow-lg">
              <span className="w-6 h-6 rounded-full bg-white/10" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary tracking-tight">StudyAI</h3>
            <p className="text-xs text-text-secondary mt-1.5 font-medium">Verifying credentials and restoring session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen font-sans antialiased text-text-primary selection:bg-primary/30 select-none bg-background transition-colors duration-300">
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
              <Route path="/subjects"     element={<PrivateRoute><SubjectManagerPage /></PrivateRoute>} />
              <Route path="/chapters"     element={<PrivateRoute><ChapterManagerPage /></PrivateRoute>} />
              <Route path="/semester-setup"element={<PrivateRoute><SemesterSetupPage /></PrivateRoute>} />
              
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
  <ThemeProvider>
    <Router>
      <AppContent />
    </Router>
  </ThemeProvider>
);

export default App;
