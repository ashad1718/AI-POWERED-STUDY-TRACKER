import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Brain, Menu, X, ArrowRight, User } from 'lucide-react';
import { useMagnetic } from '../hooks/useMagnetic';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

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
          ? 'py-4 bg-[#11072F]/80 backdrop-blur-lg border-b border-white/10 shadow-[0_4px_30px_rgba(17,7,47,0.5)]' 
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" ref={logoRef} className="flex items-center space-x-2 group inline-block">
            <div className="p-2 bg-gradient-to-tr from-[#7B4DFF] to-[#00D4C7] rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#11072F]" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Study<span className="text-[#00D4C7]">AI</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {!isLoggedIn ? (
              <>
                <button 
                  onClick={() => handleNavClick('story-1')} 
                  className="text-sm text-white/70 hover:text-[#00D4C7] transition-colors cursor-pointer relative py-1 group/item"
                >
                  Coach
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </button>
                <button 
                  onClick={() => handleNavClick('story-2')} 
                  className="text-sm text-white/70 hover:text-[#00D4C7] transition-colors cursor-pointer relative py-1 group/item"
                >
                  Analytics
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </button>
                <button 
                  onClick={() => handleNavClick('story-4')} 
                  className="text-sm text-white/70 hover:text-[#00D4C7] transition-colors cursor-pointer relative py-1 group/item"
                >
                  Timeline
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </button>
                <button 
                  onClick={() => handleNavClick('story-6')} 
                  className="text-sm text-white/70 hover:text-[#00D4C7] transition-colors cursor-pointer relative py-1 group/item"
                >
                  Insights
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/dashboard" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/dashboard' ? 'text-[#00D4C7]' : 'text-white/70 hover:text-[#00D4C7]'
                  }`}
                >
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/study-session" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/study-session' ? 'text-[#00D4C7]' : 'text-white/70 hover:text-[#00D4C7]'
                  }`}
                >
                  Study Session
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/ai-coach" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/ai-coach' ? 'text-[#00D4C7]' : 'text-white/70 hover:text-[#00D4C7]'
                  }`}
                >
                  AI Coach
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
                <Link 
                  to="/profile" 
                  className={`text-sm font-medium transition-colors relative py-1 group/item ${
                    location.pathname === '/profile' ? 'text-[#00D4C7]' : 'text-white/70 hover:text-[#00D4C7]'
                  }`}
                >
                  Profile
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#00D4C7] scale-x-0 group-hover/item:scale-x-100 transition-transform duration-300 origin-left" />
                </Link>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4 animate-fade-in">
                <div className="flex items-center space-x-2 mr-2">
                  <span className="text-xs text-white/45 font-medium">Logged in as:</span>
                  <span className="text-xs text-[#00D4C7] font-bold capitalize">{user?.name || 'Scholar'}</span>
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
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
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
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-white/75 hover:text-white p-2 rounded-lg focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden mt-2 mx-4 p-4 rounded-2xl bg-[#11072F]/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-in">
          <div className="flex flex-col space-y-4">
            {!isLoggedIn ? (
              <>
                <button 
                  onClick={() => handleNavClick('story-1')} 
                  className="text-left text-sm text-white/70 hover:text-[#00D4C7] transition-colors"
                >
                  Coach
                </button>
                <button 
                  onClick={() => handleNavClick('story-2')} 
                  className="text-left text-sm text-white/70 hover:text-[#00D4C7] transition-colors"
                >
                  Analytics
                </button>
                <button 
                  onClick={() => handleNavClick('story-4')} 
                  className="text-left text-sm text-white/70 hover:text-[#00D4C7] transition-colors"
                >
                  Timeline
                </button>
                <button 
                  onClick={() => handleNavClick('story-6')} 
                  className="text-left text-sm text-white/70 hover:text-[#00D4C7] transition-colors"
                >
                  Insights
                </button>
                <Link 
                  to="/login" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-white/70 hover:text-white"
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
            ) : (
              <>
                <Link 
                  to="/dashboard" 
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-semibold ${location.pathname === '/dashboard' ? 'text-[#00D4C7]' : 'text-white/70'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/study-session" 
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-semibold ${location.pathname === '/study-session' ? 'text-[#00D4C7]' : 'text-white/70'}`}
                >
                  Study Session
                </Link>
                <Link 
                  to="/ai-coach" 
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-semibold ${location.pathname === '/ai-coach' ? 'text-[#00D4C7]' : 'text-white/70'}`}
                >
                  AI Coach
                </Link>
                <Link 
                  to="/profile" 
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-semibold ${location.pathname === '/profile' ? 'text-[#00D4C7]' : 'text-white/70'}`}
                >
                  Profile
                </Link>
                <button 
                  onClick={() => { setIsOpen(false); handleLogout(); }}
                  className="text-left text-sm text-[#EF4444] hover:text-red-300 font-semibold"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
