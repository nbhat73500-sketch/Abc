import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  Lock,
  User as UserIcon,
  Shield,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Send,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const {
    sendPhoneOtp,
    verifyPhoneOtp,
    loginWithEmail,
    registerWithEmail,
    signInWithGoogle,
    quickLoginAsDevAdmin,
    switchToDevAccount,
    switchToUserAccount,
    isDevAccount,
    accountKind,
    cooldownSeconds,
    isRateLimited,
    currentUser,
    userProfile,
    activeOtpCode,
    activeOtpPhone,
    logout,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'phone' | 'email' | 'register'>('phone');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [incomingSmsBanner, setIncomingSmsBanner] = useState<{ code: string; phone: string } | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Synchronize incoming SMS banner if activeOtpCode changes
  useEffect(() => {
    if (activeOtpCode && activeOtpPhone) {
      setIncomingSmsBanner({ code: activeOtpCode, phone: activeOtpPhone });
      setOtpSent(true);
    }
  }, [activeOtpCode, activeOtpPhone]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit Indian mobile number');
      }

      const res = await sendPhoneOtp(cleanPhone);
      setOtpSent(true);
      setIncomingSmsBanner({ code: res.code, phone: cleanPhone });
      setSuccessMessage(`SMS dispatched to +91-${cleanPhone}. Check incoming notification.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const cleanCode = otpCode.trim();
      if (cleanCode.length < 6) {
        throw new Error('Please enter the full 6-digit OTP code');
      }

      const verified = await verifyPhoneOtp(cleanCode);
      if (verified) {
        setSuccessMessage('Phone verified successfully! Authenticated.');
        if (onSuccess) {
          setTimeout(() => onSuccess(), 400);
        }
      } else {
        throw new Error('Invalid OTP code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (authMode === 'email') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName);
      }
      setSuccessMessage('Logged in successfully!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      setSuccessMessage('Signed in with Google! Real-time Mobile ↔ Desktop Cloud Sync enabled.');
      if (onSuccess) setTimeout(() => onSuccess(), 400);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl shadow-inner">
              ₹
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Budget Management</h1>
              <p className="text-emerald-100 text-xs mt-0.5">
                Financial Management System & Cloud Authentication
              </p>
            </div>
          </div>
        </div>

        {/* Current Session Badge if logged in */}
        {userProfile && (
          <div
            className={`border-b p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDevAccount
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                  isDevAccount
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {isDevAccount ? '⚡' : '👤'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {userProfile.displayName || userProfile.email}
                  </p>
                  <span
                    className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full ${
                      isDevAccount
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    }`}
                  >
                    {isDevAccount ? 'DEVELOPER · SUPER ADMIN' : 'USER ACCOUNT'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Phone: {userProfile.phoneNumber || '+91-9845012345'} · Role: <span className="uppercase font-semibold">{userProfile.role}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isDevAccount) {
                    switchToUserAccount();
                    setSuccessMessage('Switched to Personal User Account. Existing financial data preserved.');
                  } else {
                    switchToDevAccount();
                    setSuccessMessage('Switched to Developer Account (Naseer Ul Haq).');
                  }
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shadow-2xs ${
                  isDevAccount
                    ? 'border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                    : 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50'
                }`}
              >
                {isDevAccount ? 'Switch to User Account' : 'Switch to Dev Account'}
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Data Protection Guard Status */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Data Protection Active:</strong> Switching accounts or signing in never overwrites your existing transactions, accounts, categories, or budgets.
            </span>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google Sign-In for Instant Cross-Device Cloud Sync */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            <span>Continue with Google (Auto Mobile ↔ Desktop Sync)</span>
          </button>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('phone');
                setErrorMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                authMode === 'phone'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile Phone OTP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setErrorMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                authMode === 'email'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Sign-In</span>
            </button>
          </div>

          {/* Form: Phone Auth */}
          {authMode === 'phone' && (
            <div className="space-y-5">
              {/* Incoming SMS Notification Simulation Card */}
              {incomingSmsBanner && otpSent && (
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 shadow-xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                            VM-BUDGET • SMS Alert
                          </span>
                          <span className="text-[10px] text-slate-400">Just now</span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                          Your verification code is{' '}
                          <span className="font-mono font-bold text-base text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/40">
                            {incomingSmsBanner.code}
                          </span>
                          . Valid for 5 minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setOtpCode(incomingSmsBanner.code)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Auto-Fill {incomingSmsBanner.code}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(incomingSmsBanner.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-medium transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Enter Mobile Number (India +91)
                    </label>
                    <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 shadow-sm">
                      <span className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 flex items-center">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="e.g. 9845012345"
                        maxLength={10}
                        required
                        className="flex-1 px-3.5 py-2.5 bg-transparent text-sm text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Standard User login (Enter your mobile number)
                      </p>
                      <button
                        type="button"
                        onClick={() => switchToDevAccount()}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                      >
                        ⚡ Dev Login (Naseer)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || isRateLimited}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-sm"
                  >
                    <span>{isLoading ? 'Sending SMS OTP...' : 'Send SMS OTP Verification'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {cooldownSeconds > 0 && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Resend cooldown: {cooldownSeconds} seconds</span>
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Change Number</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      maxLength={6}
                      autoFocus
                      required
                      className="w-full tracking-[0.4em] text-center text-2xl font-mono font-bold py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Active code: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{incomingSmsBanner?.code || '123456'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(incomingSmsBanner?.code || '123456')}
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900"
                      >
                        Auto-fill Code
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 6}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-sm"
                  >
                    <span>{isLoading ? 'Verifying OTP...' : 'Verify OTP & Continue'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={cooldownSeconds > 0 || isLoading}
                      onClick={() => handleSendOtp()}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{cooldownSeconds > 0 ? `Resend SMS in ${cooldownSeconds}s` : 'Resend SMS OTP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpCode('123456')}
                      className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Use Test Code: 123456
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Form: Email Auth */}
          {authMode === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-sm"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In with Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
