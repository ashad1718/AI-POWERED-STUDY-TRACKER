import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Brain, Menu, X, ArrowRight, User } from 'lucide-react';
import { useMagnetic } from '../hooks/useMagnetic';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ isLoggedIn, handleLogout, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);

  // Magnetic refs
  const logoRef = useMagnetic();
  const ctaRef = useMagnetic(!isLoggedIn); 

  useGSAP(() => {
    gsap.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out', delay: 0.1 }
    );
  }, { scope: navRef });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (anchorId) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: anchorId } });
    } else {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav 
      ref={navRef}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'py-4 bg-background/80 backdrop-blur-lg border-b border-border shadow-md' 
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" ref={logoRef} className="flex items-center space-x-2 group inline-block">
            <div className="p-2 bg-gradient-to-tr from-[#7B4DFF] to-[#00D4C7] rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white dark:text-[#11072F]" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight text-text-primary">
              Study<span className="text-secondary">AI</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {location.pathname !== '/' && isLoggedIn && (
              <>
                <Link 
                  to="/dashboard" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/dashboard' ? 'text-secondary' : 'text-text-secondary hover:text-secondary'
                  }`}
                >
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-secondary scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/study-session" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/study-session' ? 'text-secondary' : 'text-text-secondary hover:text-secondary'
                  }`}
                >
                  Study Session
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-secondary scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/subjects" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/subjects' ? 'text-secondary' : 'text-text-secondary hover:text-secondary'
                  }`}
                >
                  Subjects
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-secondary scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/chapters" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/chapters' ? 'text-secondary' : 'text-text-secondary hover:text-secondary'
                  }`}
                >
                  Chapters
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-secondary scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/ai-coach" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/ai-coach' ? 'text-secondary' : 'text-text-secondary hover:text-secondary'
                  }`}
                >
                  AI Coach
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-secondary scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/profile" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/profile' ? 'text-secondary' : 'text-text-secondary hover:text-secondary'
                  }`}
                >
                  Profile
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-secondary scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            {isLoggedIn ? (
              <div className="flex items-center space-x-4 animate-fade-in">
                {location.pathname === '/' && (
                  <Link 
                    to="/dashboard"
                    className="text-sm font-medium text-text-secondary hover:text-secondary transition-colors cursor-pointer mr-2"
                  >
                    Dashboard
                  </Link>
                )}
                <div className="flex items-center space-x-2 mr-2">
                  <span className="text-xs text-text-secondary/60 font-medium">Logged in as:</span>
                  <span className="text-xs text-secondary font-bold capitalize">{user?.name || 'Scholar'}</span>
                </div>
                <Link to="/profile" className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7B4DFF] to-[#00D4C7] flex items-center justify-center font-bold text-white text-xs shadow-md hover:scale-105 transition-transform duration-200">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary px-4 py-2 text-sm rounded-xl cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  ref={ctaRef}
                  className="btn-primary px-5 py-2.5 text-sm rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-3">
            <ThemeToggle />
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-text-secondary hover:text-text-primary p-2 rounded-lg focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden mt-2 mx-4 p-4 rounded-2xl bg-background/95 backdrop-blur-xl border border-border shadow-2xl animate-fade-in">
          <div className="flex flex-col space-y-4">
            {location.pathname === '/' ? (
              <>
                {isLoggedIn ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      onClick={() => setIsOpen(false)}
                      className="text-left text-sm text-text-secondary hover:text-secondary font-semibold"
                    >
                      Dashboard
                    </Link>
                    <button 
                      onClick={() => { setIsOpen(false); handleLogout(); }}
                      className="text-left text-sm text-error hover:text-red-400 font-semibold"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      onClick={() => setIsOpen(false)}
                      className="text-sm text-text-secondary hover:text-text-primary"
                    >
                      Sign In
                    </Link>
                    <Link 
                      to="/register" 
                      onClick={() => setIsOpen(false)}
                      className="btn-primary w-full py-2.5 text-sm rounded-xl text-center"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </>
            ) : (
              isLoggedIn && (
                <>
                  <Link 
                    to="/dashboard" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-semibold ${location.pathname === '/dashboard' ? 'text-secondary' : 'text-text-secondary'}`}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/study-session" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-semibold ${location.pathname === '/study-session' ? 'text-secondary' : 'text-text-secondary'}`}
                  >
                    Study Session
                  </Link>
                  <Link 
                    to="/subjects" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-semibold ${location.pathname === '/subjects' ? 'text-secondary' : 'text-text-secondary'}`}
                  >
                    Subjects
                  </Link>
                  <Link 
                    to="/chapters" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-semibold ${location.pathname === '/chapters' ? 'text-secondary' : 'text-text-secondary'}`}
                  >
                    Chapters
                  </Link>
                  <Link 
                    to="/ai-coach" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-semibold ${location.pathname === '/ai-coach' ? 'text-secondary' : 'text-text-secondary'}`}
                  >
                    AI Coach
                  </Link>
                  <Link 
                    to="/profile" 
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-semibold ${location.pathname === '/profile' ? 'text-secondary' : 'text-text-secondary'}`}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={() => { setIsOpen(false); handleLogout(); }}
                    className="text-left text-sm text-error hover:text-red-400 font-semibold"
                  >
                    Sign Out
                  </button>
                </>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
