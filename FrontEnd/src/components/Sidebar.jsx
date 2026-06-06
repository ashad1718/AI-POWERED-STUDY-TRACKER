import React, { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, User, ChevronLeft, ChevronRight, LogOut, Brain } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const Sidebar = ({ isCollapsed, setIsCollapsed, handleLogout }) => {
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  useGSAP(() => {
    // Animate sidebar width transition
    gsap.to(sidebarRef.current, {
      width: isCollapsed ? '72px' : '260px',
      duration: 0.35,
      ease: 'power3.inOut'
    });
  }, { dependencies: [isCollapsed], scope: sidebarRef });

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Study Session', path: '/study-session', icon: BookOpen },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <aside
      ref={sidebarRef}
      className="fixed left-0 top-0 h-screen z-40 bg-[#050816]/80 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between pt-20 pb-6 overflow-hidden w-[260px]"
    >
      <div>
        {/* Toggle Collapse Button */}
        <div className="absolute top-6 right-3 z-50">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Brand Logo inside Sidebar */}
        <div className="px-5 mb-8 flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] rounded-lg shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg text-white tracking-wider whitespace-nowrap animate-fade-in">
              Study<span className="text-[#00E5FF]">AI</span>
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#6C63FF]/20 to-[#00E5FF]/10 text-white border-l-2 border-[#00E5FF]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                {!isCollapsed && (
                  <span className="ml-4 text-sm font-medium whitespace-nowrap animate-fade-in">
                    {item.name}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout button at bottom */}
      <div className="px-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/10 transition-all duration-300 group cursor-pointer"
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
          {!isCollapsed && (
            <span className="ml-4 text-sm font-medium whitespace-nowrap animate-fade-in">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
