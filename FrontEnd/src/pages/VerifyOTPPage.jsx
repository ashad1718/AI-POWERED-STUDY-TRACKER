import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import AuthFormLayout from '../components/AuthFormLayout';
import { authAPI } from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const VerifyOTPPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const purpose = location.state?.purpose || 'email_verification';
  const isPasswordReset = purpose === 'password_reset';

  const [email, setEmail] = useState(location.state?.email || '');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.message || '');

  const otp = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const focusInput = (index) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const setOtpFromString = (value, startIndex = 0) => {
    const numbers = value.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex).split('');
    if (!numbers.length) return;

    setDigits((current) => {
      const next = [...current];
      numbers.forEach((number, offset) => {
        next[startIndex + offset] = number;
      });
      return next;
    });

    focusInput(Math.min(startIndex + numbers.length, OTP_LENGTH - 1));
  };

  const handleDigitChange = (index, value) => {
    if (value.length > 1) {
      setOtpFromString(value, index);
      return;
    }

    const number = value.replace(/\D/g, '');
    setDigits((current) => {
      const next = [...current];
      next[index] = number;
      return next;
    });

    if (number && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) => {
        const next = [...current];
        next[index - 1] = '';
        return next;
      });
      focusInput(index - 1);
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (index, event) => {
    event.preventDefault();
    setOtpFromString(event.clipboardData.getData('text'), index);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data } = await authAPI.verifyOtp({ email: normalizedEmail, otp, purpose });
      setSuccess(data.data.message);

      window.setTimeout(() => {
        if (isPasswordReset) {
          navigate('/reset-password', {
            state: { email: normalizedEmail, otp },
          });
        } else {
          navigate('/login', {
            state: { message: 'Email verified successfully. Please sign in.' },
          });
        }
      }, 900);
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Verification failed. Please check your code and try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResending(true);

    try {
      const { data } = await authAPI.resendOtp({
        email: email.trim().toLowerCase(),
        purpose,
      });
      setDigits(Array(OTP_LENGTH).fill(''));
      setCountdown(RESEND_SECONDS);
      setSuccess(data.data.message || 'Verification code sent successfully.');
      focusInput(0);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to send OTP. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthFormLayout
      title="Verify Code"
      subtitle="Enter the 6-digit code sent to your email. It expires in 10 minutes."
      backTo={isPasswordReset ? '/forgot-password' : '/register'}
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

        <div className="space-y-3 anim-item">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
              Verification Code
            </label>
            <ShieldCheck className="w-4 h-4 text-[#5EEAD4]" />
          </div>

          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(index, e)}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`OTP digit ${index + 1}`}
                className="glass-input h-12 sm:h-14 w-full rounded-xl text-center text-lg font-bold focus:outline-none"
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || resending || otp.length !== OTP_LENGTH || !email.trim()}
          className="btn-primary w-full py-3.5 text-sm rounded-xl font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 anim-item"
        >
          {loading ? (
            <span>Sending verification code...</span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Verify Code</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </button>
      </form>

      <div className="mt-8 text-center anim-item">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || loading || countdown > 0 || !email.trim()}
          className="inline-flex items-center justify-center gap-2 text-xs text-[#5EEAD4] hover:text-[#5EEAD4]/80 font-semibold transition-colors disabled:text-[#94A3B8]/60 disabled:cursor-not-allowed"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
          {resending
            ? 'Sending verification code...'
            : countdown > 0
              ? `Resend available in ${countdown}s`
              : 'Resend OTP'}
        </button>

        <p className="mt-5 text-xs text-[#94A3B8]">
          {isPasswordReset ? 'Remember your password?' : 'Already verified?'}{' '}
          <Link to="/login" className="text-[#5EEAD4] hover:underline font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </AuthFormLayout>
  );
};

export default VerifyOTPPage;
