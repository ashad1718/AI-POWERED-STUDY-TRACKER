import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

import BlobBackground   from './components/BlobBackground';
import Navbar           from './components/Navbar';
import Footer           from './components/Footer';

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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyOTPPage      from './pages/VerifyOTPPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import AchievementsPage   from './pages/AchievementsPage';

import { useAuth }      from './hooks/useAuth';
import { userAPI, authAPI, refreshAccessToken, achievementAPI } from './services/api';
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const { login, register, logout } = useAuth(setIsLoggedIn, setUser);

  // ─── Initial Session Restoration & Verification ────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.log('[AUTH] Development Reload Detected');
        console.log('[AUTH] Session Preserved');
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        console.log('[AUTH] Token found on startup. Verifying session...');
        try {
          const res = await authAPI.getMe();
          const verifiedUser = res.data.data;
          console.log('[AUTH] Current User Loaded');
          console.log('[AUTH] Session Restored');
          setUser(verifiedUser);
          setIsLoggedIn(true);
        } catch (err) {
          console.warn('[AUTH] Startup token verification failed. Attempting refresh recovery...');
          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              const res = await authAPI.getMe();
              const verifiedUser = res.data.data;
              console.log('[AUTH] Current User Loaded');
              console.log('[AUTH] Session Restored');
              setUser(verifiedUser);
              setIsLoggedIn(true);
            } else {
              throw new Error('Refresh token did not return a new access token');
            }
          } catch (refreshErr) {
            console.error('[AUTH] Startup token verification and refresh both failed. Clearing session.', refreshErr);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            setUser(null);
            setIsLoggedIn(false);
          }
        }
      } else {
        console.log('[AUTH] No access token in localStorage. Attempting automatic refresh...');
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            const res = await authAPI.getMe();
            const verifiedUser = res.data.data;
            console.log('[AUTH] Current User Loaded');
            console.log('[AUTH] Session Restored');
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
      setIsAuthLoading(false);
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

  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const checkAchievements = async () => {
      try {
        const { data } = await achievementAPI.getAll();
        if (data?.success && data?.data?.newlyUnlocked && data.data.newlyUnlocked.length > 0) {
          data.data.newlyUnlocked.forEach((ach) => {
            addToast({
              title: 'Achievement Unlocked! 🏆',
              desc: `${ach.name}: ${ach.desc}`,
              level: ach.level,
            });
          });
        }
      } catch (err) {
        console.warn('[ACHIEVEMENTS] Failed to poll achievements', err);
      }
    };

    checkAchievements();
    const interval = setInterval(checkAchievements, 12000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const isDashboardRoute = [
    '/dashboard', '/study-session', '/profile', '/ai-coach',
    '/subjects', '/chapters', '/semester-setup', '/achievements'
  ].includes(location.pathname);

  const PrivateRoute = ({ children }) =>
    isLoggedIn ? children : <Navigate to="/login" replace />;

  const PublicRoute = ({ children }) =>
    !isLoggedIn ? children : <Navigate to="/dashboard" replace />;

  // Render loading screen while verifying credentials
  if (isAuthLoading) {
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
              <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
              <Route path="/verify-otp"      element={<PublicRoute><VerifyOTPPage /></PublicRoute>} />
              <Route path="/reset-password"  element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
              
              {/* Private Dashboard/App Routes */}
              <Route path="/dashboard"    element={<PrivateRoute><Dashboard        user={user} /></PrivateRoute>} />
              <Route path="/study-session"element={<PrivateRoute><StudySessionPage /></PrivateRoute>} />
              <Route path="/ai-coach"     element={<PrivateRoute><AICoachPage      user={user} /></PrivateRoute>} />
              <Route path="/profile"      element={<PrivateRoute><ProfilePage      user={user} /></PrivateRoute>} />
              <Route path="/subjects"     element={<PrivateRoute><SubjectManagerPage /></PrivateRoute>} />
              <Route path="/chapters"     element={<PrivateRoute><ChapterManagerPage /></PrivateRoute>} />
              <Route path="/semester-setup"element={<PrivateRoute><SemesterSetupPage /></PrivateRoute>} />
              <Route path="/achievements" element={<PrivateRoute><AchievementsPage /></PrivateRoute>} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/"} replace />} />
            </Routes>
          </AnimatePresence>
        </main>
        
        {!isDashboardRoute && <Footer />}
      </div>

      {/* Toast notifications container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4">
        <AnimatePresence>
          {toasts.map((toast) => {
            const colors = {
              bronze: 'border-[#CD7F32]/40 bg-surface/90 text-[#CD7F32]',
              silver: 'border-slate-300/40 bg-surface/90 text-slate-300',
              gold: 'border-[#FFD700]/40 bg-surface/90 text-[#FFD700]',
              diamond: 'border-[#B9F2FF]/40 bg-surface/90 text-[#B9F2FF]',
            }[toast.level] || 'border-primary/40 bg-surface/90 text-primary';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
                className={`pointer-events-auto flex items-start gap-4 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${colors}`}
                style={{
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className="flex-grow">
                  <h4 className="text-sm font-bold tracking-tight">{toast.title}</h4>
                  <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed">{toast.desc}</p>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-text-secondary hover:text-text-primary transition-colors text-xs font-semibold p-1"
                >
                  ✕
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
