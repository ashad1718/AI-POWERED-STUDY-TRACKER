import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthFormLayout from '../components/AuthFormLayout';
import { authAPI } from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await authAPI.forgotPassword({ email });
      setSuccess(data.data.message);
      setTimeout(() => {
        navigate('/verify-otp', {
          state: {
            email: email.trim().toLowerCase(),
            purpose: 'password_reset',
            message: 'Verification code sent successfully.',
          },
        });
      }, 1200);
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Unable to process your request. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout
      title="Forgot Password"
      subtitle="Enter your registered email and we will send a 6-digit verification code."
      backTo="/login"
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

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3.5 text-sm rounded-xl font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 anim-item"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto block" />
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Send Verification Code</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </button>
      </form>

      <div className="mt-8 text-center anim-item">
        <p className="text-xs text-[#94A3B8]">
          Remember your password?{' '}
          <Link to="/login" className="text-[#5EEAD4] hover:underline font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </AuthFormLayout>
  );
};

export default ForgotPasswordPage;
