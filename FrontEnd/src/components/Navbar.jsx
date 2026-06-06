import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Brain, Menu, X, ArrowRight, User } from 'lucide-react';

const Navbar = ({ isLoggedIn, handleLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'py-4 bg-[#050816]/75 backdrop-blur-md border-b border-white/5' 
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] rounded-lg shadow-[0_0_15px_rgba(108,99,255,0.4)] transition-transform duration-300 group-hover:scale-110">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Study<span className="text-[#00E5FF]">AI</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => handleNavClick('features')} 
              className="text-sm text-gray-400 hover:text-[#00E5FF] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button 
              onClick={() => handleNavClick('stats')} 
              className="text-sm text-gray-400 hover:text-[#00E5FF] transition-colors cursor-pointer"
            >
              Impact
            </button>
            <button 
              onClick={() => handleNavClick('timeline')} 
              className="text-sm text-gray-400 hover:text-[#00E5FF] transition-colors cursor-pointer"
            >
              Roadmap
            </button>
            <button 
              onClick={() => handleNavClick('testimonials')} 
              className="text-sm text-gray-400 hover:text-[#00E5FF] transition-colors cursor-pointer"
            >
              Testimonials
            </button>
            {isLoggedIn && (
              <Link 
                to="/dashboard" 
                className="text-sm text-[#00E5FF] hover:text-white font-medium transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center space-x-1 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-gray-300">
                  <User className="w-4 h-4" />
                </Link>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#6C63FF] to-[#00E5FF] rounded-xl hover:shadow-[0_0_20px_rgba(108,99,255,0.4)] transition-all duration-300 hover:scale-[1.02] flex items-center gap-1.5"
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
              className="text-gray-400 hover:text-white p-2 rounded-lg focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden mt-2 mx-4 p-4 rounded-2xl bg-[#050816]/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-in">
          <div className="flex flex-col space-y-4">
            <button 
              onClick={() => handleNavClick('features')} 
              className="text-left text-sm text-gray-400 hover:text-white transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => handleNavClick('stats')} 
              className="text-left text-sm text-gray-400 hover:text-white transition-colors"
            >
              Impact
            </button>
            <button 
              onClick={() => handleNavClick('timeline')} 
              className="text-left text-sm text-gray-400 hover:text-white transition-colors"
            >
              Roadmap
            </button>
            <button 
              onClick={() => handleNavClick('testimonials')} 
              className="text-left text-sm text-gray-400 hover:text-white transition-colors"
            >
              Testimonials
            </button>
            {isLoggedIn ? (
              <>
                <Link 
                  to="/dashboard" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-[#00E5FF]"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/profile" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-gray-300"
                >
                  Profile
                </Link>
                <button 
                  onClick={() => { setIsOpen(false); handleLogout(); }}
                  className="text-left text-sm text-red-400"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#6C63FF] to-[#00E5FF] rounded-xl"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
