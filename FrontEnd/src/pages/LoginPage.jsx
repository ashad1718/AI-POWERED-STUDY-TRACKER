import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const LoginPage = ({ handleLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      handleLogin({ email, name: email.split('@')[0] });
      setLoading(false);
      navigate('/dashboard');
    }, 1200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="min-h-screen flex items-center justify-center px-4 relative"
    >
      {/* Return to Home link */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> <span>Back to Home</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] rounded-2xl shadow-[0_0_20px_rgba(108,99,255,0.4)] mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white text-center">Welcome Back</h2>
          <p className="text-xs text-gray-400 mt-2">Log in to check your AI study streaks</p>
        </div>

        {/* Login Form Card */}
        <GlassCard className="!p-8 shadow-2xl relative" hoverEffect={false}>
          {/* Neon side highlight glows */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E5FF]/10 blur-2xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#6C63FF]/10 blur-2xl pointer-events-none rounded-full" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Password</label>
                <a href="#" className="text-xs text-[#00E5FF] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#00E5FF] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(108,99,255,0.3)] hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(108,99,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Redirect link */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#00E5FF] hover:underline font-semibold">
                Sign Up
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default LoginPage;
