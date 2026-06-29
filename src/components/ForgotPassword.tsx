import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E5EEF9] relative flex flex-col justify-center items-center p-4 overflow-hidden select-none">
      {/* Background Ambient cosmic blurs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-purple-900/40 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-900/30 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center gap-3">
            <img 
              src="/branding/logo-mark.svg" 
              alt="TimeHero AI Logo" 
              className="w-16 h-16 object-contain animate-fade-in" 
              referrerPolicy="no-referrer"
            />
            <h1 className="text-3xl font-black tracking-tight text-white">TimeHero AI</h1>
          </div>
          <p className="text-white/50 text-sm">Predictive scheduling meets flawless execution</p>
        </div>

        {/* Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="border border-white/10 bg-slate-950/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/15 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full filter blur-[40px] pointer-events-none" />

          {success ? (
            <div className="space-y-6 text-center py-4">
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"
                >
                  <CheckCircle2 className="w-8 h-8" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Check your email</h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  If an account exists for this email, a password reset link has been sent.
                </p>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold tracking-wide text-purple-300 hover:text-purple-200 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Reset Password</h2>
                <p className="text-white/50 text-xs mt-1">
                  Enter your registered email address to receive password reset instructions.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-sm font-black tracking-wider text-white uppercase shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              {/* Back to Login Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
