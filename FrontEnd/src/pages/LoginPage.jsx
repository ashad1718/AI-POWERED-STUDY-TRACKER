import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const LoginPage = ({ handleLogin }) => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const message = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // handleLogin is now the real `login` function from useAuth
      await handleLogin(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error?.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="min-h-screen flex items-center justify-center px-4 relative"
    >
      <Link to="/" className="absolute top-8 left-8 flex items-center space-x-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> <span>Back to Home</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] rounded-2xl shadow-[0_0_20px_rgba(108,99,255,0.4)] mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-text-primary text-center">Welcome Back</h2>
          <p className="text-xs text-text-secondary mt-2">Log in to check your AI study streaks</p>
        </div>

        <GlassCard className="!p-8 shadow-2xl relative" hoverEffect={false}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E5FF]/10 blur-2xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#6C63FF]/10 blur-2xl pointer-events-none rounded-full" />

          {/* Session Expired / Info Banner */}
          {message && !error && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center space-x-2 text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Password</label>
                <a href="#" className="text-xs text-[#00E5FF] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#00E5FF] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(108,99,255,0.3)] hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(108,99,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <div className="mt-8 text-center">
              <p className="text-xs text-text-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#00E5FF] hover:underline font-semibold">Sign Up</Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default LoginPage;
