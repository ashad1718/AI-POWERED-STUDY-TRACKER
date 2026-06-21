import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import AuthFormLayout from '../components/AuthFormLayout';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { authAPI } from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';
import { generateStrongPassword, isStrongPassword } from '../utils/passwordUtils';

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState(location.state?.otp || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isStrongPassword(newPassword)) {
      setError('Please choose a stronger password that meets all requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await authAPI.resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });
      setSuccess(data.data.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Unable to reset password. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout
      title="Reset Password"
      subtitle="Create a new secure password for your account."
      backTo="/verify-otp"
    >
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400 text-xs anim-item">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start space-x-3 text-green-400 text-xs anim-item">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2 anim-item">
          <label
            htmlFor="email"
            className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]/60">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="glass-input w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none"
              placeholder="name@example.com"
            />
          </div>
        </div>


        <div className="space-y-2 anim-item">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="newPassword"
              className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block"
            >
              New Password
            </label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#5EEAD4] hover:text-[#5EEAD4]/80 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Strong Password
            </button>
          </div>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Create a strong password"
          />
        </div>

        {newPassword && (
          <div className="anim-item">
            <PasswordStrengthMeter password={newPassword} />
          </div>
        )}

        <div className="space-y-2 anim-item">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block"
          >
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Re-enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3.5 text-sm rounded-xl font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 anim-item"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto block" />
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Reset Password</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </button>
      </form>

      <div className="mt-8 text-center anim-item">
        <p className="text-xs text-[#94A3B8]">
          Back to{' '}
          <Link to="/login" className="text-[#5EEAD4] hover:underline font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </AuthFormLayout>
  );
};

export default ResetPasswordPage;
