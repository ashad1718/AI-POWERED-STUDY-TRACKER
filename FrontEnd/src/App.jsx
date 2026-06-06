import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// Component imports
import BlobBackground from './components/BlobBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';

// Page imports
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import StudySessionPage from './pages/StudySessionPage';
import ProfilePage from './pages/ProfilePage';

// Inner App component to access location context for animations/layouts
const AppContent = () => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [sessions, setSessions] = useState(() => {
    const stored = localStorage.getItem('sessions');
    return stored ? JSON.parse(stored) : [];
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    // Only use smooth scroll on desktop for performance optimization
    if (window.innerWidth < 1024) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const rafTicker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(rafTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(rafTicker);
    };
  }, [location.pathname]); // Re-init scroll layout on page changes

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [isLoggedIn, user]);


  useEffect(() => {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Auth Action Handlers
  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
  };

  const addSession = (session) => {
    setSessions((prev) => [...prev, session]);
  };

  // Determine layout style based on path
  const isDashboardRoute = ['/dashboard', '/study-session', '/profile'].includes(location.pathname);

  // Private Route Wrapper Component
  const PrivateRoute = ({ children }) => {
    return isLoggedIn ? children : <Navigate to="/login" replace />;
  };

  // Public Route Wrapper (Redirects to dashboard if already logged in)
  const PublicRoute = ({ children }) => {
    return !isLoggedIn ? children : <Navigate to="/dashboard" replace />;
  };

  // Handle scrolling to elements on page redirect
  useEffect(() => {
    if (location.state && location.state.scrollTo) {
      const element = document.getElementById(location.state.scrollTo);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return (
    <div className="relative min-h-screen font-sans antialiased text-white selection:bg-[#6C63FF]/30 select-none">
      {/* Floating Animated Gradient Blobs Background */}
      <BlobBackground />

      {/* Conditionally Render Navigation Layout */}
      {!isDashboardRoute ? (
        // Public Layout
        <div className="flex flex-col min-h-screen">
          <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
          
          <main className="flex-1 w-full">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<LandingPage />} />
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <LoginPage handleLogin={handleLogin} />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <PublicRoute>
                      <RegisterPage handleLogin={handleLogin} />
                    </PublicRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </main>

          <Footer />
        </div>
      ) : (
        // Dashboard Private Layout
        <div className="flex min-h-screen overflow-hidden">
          {/* Collapsible Sidebar */}
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            setIsCollapsed={setIsSidebarCollapsed} 
            handleLogout={handleLogout}
          />
          
          {/* Main workspace container with transition margins */}
          <div 
            className="flex-1 min-h-screen transition-all duration-350 flex flex-col"
            style={{ 
              paddingLeft: isSidebarCollapsed ? '72px' : '260px' 
            }}
          >
            {/* Inner Dashboard Header bar */}
            <header className="h-16 border-b border-white/5 bg-[#050816]/30 backdrop-blur-md sticky top-0 z-30 flex items-center justify-end px-6 md:px-8">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-400 font-medium">Logged in as:</span>
                <span className="text-xs text-[#00E5FF] font-bold capitalize">{user?.name || 'Scholar'}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] flex items-center justify-center font-bold text-white text-xs shadow-md">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
              </div>
            </header>

            {/* Dashboard Content body */}
            <main className="flex-grow p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route 
                    path="/dashboard" 
                    element={
                      <PrivateRoute>
                        <Dashboard sessions={sessions} user={user} />
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/study-session" 
                    element={
                      <PrivateRoute>
                        <StudySessionPage addSession={addSession} />
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <PrivateRoute>
                        <ProfilePage user={user} sessions={sessions} />
                      </PrivateRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AnimatePresence>
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
