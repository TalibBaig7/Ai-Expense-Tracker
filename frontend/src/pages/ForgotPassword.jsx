import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wallet, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../lib/axios.js';
import { API_PATHS } from '../utils/apiPaths.js';
import AuthHero from '../components/AuthHero.jsx';
import Spinner from '../components/Spinner.jsx';

const inputClass =
    'w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-violet-500 rounded-2xl px-5 py-4 text-slate-900 text-sm focus:outline-none transition';

const submitClass =
    'w-full inline-flex items-center justify-center gap-2 bg-linear-to-br from-violet-400 to-violet-600 active:bg-violet-800 text-white font-semibold py-4 rounded-2xl transition shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed';

const RESEND_SECONDS = 60;

const STEPS = {
    request: { title: 'Forgot Password', subtitle: 'Enter your account email and we’ll send you a 6-digit code' },
    verify: { title: 'Enter OTP', subtitle: null },
    reset: { title: 'New Password', subtitle: 'Choose a new password for your account' },
};

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('request');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const requestOtp = async (e) => {
        e?.preventDefault();
        setLoading(true);
        try {
            const res = await api.post(API_PATHS.AUTH.FORGOT_PASSWORD, { email: email.trim() });
            toast.success(res.data.message);
            setStep('verify');
            setOtp('');
            setCooldown(RESEND_SECONDS);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send OTP');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post(API_PATHS.AUTH.VERIFY_RESET_OTP, { email: email.trim(), otp });
            setResetToken(res.data.resetToken);
            setStep('reset');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post(API_PATHS.AUTH.RESET_PASSWORD, { resetToken, password });
            toast.success(res.data.message);
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not reset password');
            if (err.response?.status === 400) setStep('request');
        } finally {
            setLoading(false);
        }
    };

    const { title, subtitle } = STEPS[step];

    return (
        <div className="min-h-screen flex bg-white">
            <div className="flex-1 flex flex-col px-6 sm:px-10 lg:px-14 py-8 order-1">
                <div className="flex justify-start items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                        <Wallet size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-xl text-slate-900">ExpenseAI</span>
                </div>

                <div className="flex-1 flex items-center justify-center py-10">
                    <div className="w-full max-w-md">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">{title}</h2>
                        <p className="text-slate-500 mb-10">
                            {subtitle ?? (
                                <>
                                    We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>, if an account exists for it.
                                </>
                            )}
                        </p>

                        {step === 'request' && (
                            <form onSubmit={requestOtp} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Email</label>
                                    <input
                                        type="email"
                                        required
                                        autoFocus
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={inputClass}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                                <button type="submit" disabled={loading} className={submitClass}>
                                    {loading ? <><Spinner size="sm" /> Sending...</> : 'Send OTP'}
                                </button>
                            </form>
                        )}

                        {step === 'verify' && (
                            <form onSubmit={verifyOtp} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">OTP code</label>
                                    <input
                                        required
                                        autoFocus
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        pattern="\d{6}"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className={`${inputClass} text-center text-2xl tracking-[0.5em] font-semibold`}
                                        placeholder="••••••"
                                    />
                                </div>
                                <button type="submit" disabled={loading || otp.length !== 6} className={submitClass}>
                                    {loading ? <><Spinner size="sm" /> Verifying...</> : 'Verify OTP'}
                                </button>
                                <div className="flex justify-between text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setStep('request')}
                                        className="text-slate-500 hover:text-slate-700 transition"
                                    >
                                        Change email
                                    </button>
                                    <button
                                        type="button"
                                        disabled={cooldown > 0 || loading}
                                        onClick={requestOtp}
                                        className="text-violet-600 font-semibold hover:text-violet-700 transition disabled:text-slate-400 disabled:cursor-not-allowed"
                                    >
                                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 'reset' && (
                            <form onSubmit={resetPassword} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">New password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            autoFocus
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`${inputClass} pr-12`}
                                            placeholder="At least 6 characters"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Confirm password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        className={inputClass}
                                        placeholder="Re-enter password"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <button type="submit" disabled={loading} className={submitClass}>
                                    {loading ? <><Spinner size="sm" /> Saving...</> : 'Reset Password'}
                                </button>
                            </form>
                        )}

                        <p className="text-center mt-8 text-sm text-slate-500">
                            <Link to="/login" className="inline-flex items-center gap-1 text-violet-600 font-semibold hover:text-violet-700 transition">
                                <ArrowLeft size={14} /> Back to Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] order-2">
                <AuthHero headline="Recover" subheadline="access to your account" />
            </div>
        </div>
    );
};

export default ForgotPassword;
