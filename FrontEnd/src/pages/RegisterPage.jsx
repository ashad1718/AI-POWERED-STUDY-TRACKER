import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, User, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const RegisterPage = ({ handleLogin }) => {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      // handleLogin is the real `register` function from useAuth
      await handleLogin(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error?.message || 'Registration failed. Please try again.'
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
          <h2 className="text-3xl font-extrabold text-text-primary text-center">Create Account</h2>
          <p className="text-xs text-text-secondary mt-2">Start mapping your learning goals in 60 seconds</p>
        </div>

        <GlassCard className="!p-8 shadow-2xl relative" hoverEffect={false}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E5FF]/10 blur-2xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#6C63FF]/10 blur-2xl pointer-events-none rounded-full" />

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            <p className="text-[10px] text-text-secondary leading-normal">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#00E5FF] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(108,99,255,0.3)] hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>Register Now</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-[#00E5FF] hover:underline font-semibold">Sign In</Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
