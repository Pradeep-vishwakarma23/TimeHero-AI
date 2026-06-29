import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, Check, X } from "lucide-react";

interface ResetPasswordProps {
  token: string;
  onBackToLogin: () => void;
}

export default function ResetPassword({ token, onBackToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate the reset token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        setIsValidating(true);
        const res = await fetch("/api/auth/validate-reset-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "This reset token is invalid or has expired.");
        }

        setIsTokenValid(true);
      } catch (err: any) {
        setIsTokenValid(false);
        setValidationError(err.message || "Invalid or expired password reset link.");
      } finally {
        setIsValidating(false);
      }
    }

    if (token) {
      validateToken();
    } else {
      setIsTokenValid(false);
      setValidationError("No reset token found in URL.");
      setIsValidating(false);
    }
  }, [token]);

  // Password requirements checklist
  const requirements = [
    { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { label: "An uppercase letter (A-Z)", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "A lowercase letter (a-z)", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "A number (0-9)", test: (pw: string) => /[0-9]/.test(pw) },
    { label: "A special character (!@#...)", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
  ];

  const metCount = requirements.filter(req => req.test(password)).length;

  const getStrengthLabel = () => {
    if (!password) return { label: "Empty", color: "bg-white/10", text: "text-white/40", width: "w-0" };
    if (metCount <= 1) return { label: "Weak", color: "bg-red-500", text: "text-red-400", width: "w-1/5" };
    if (metCount <= 3) return { label: "Fair", color: "bg-amber-500", text: "text-amber-400", width: "w-3/5" };
    if (metCount === 4) return { label: "Good", color: "bg-yellow-500", text: "text-yellow-400", width: "w-4/5" };
    return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-400", width: "w-full" };
  };

  const strength = getStrengthLabel();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Client-side requirement verification
    const unmet = requirements.some(req => !req.test(password));
    if (unmet) {
      setError("Password does not meet all security requirements.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed.");
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

          {isValidating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
              <p className="text-white/40 text-xs font-semibold">Validating secure reset token...</p>
            </div>
          ) : !isTokenValid ? (
            <div className="space-y-6 text-center py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Invalid Reset Link</h2>
                <p className="text-red-400/80 text-xs px-2 leading-relaxed">
                  {validationError || "This password reset link is invalid, has already been used, or has expired."}
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
          ) : success ? (
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
                <h2 className="text-xl font-bold text-white">Password Reset Successful</h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  Your password has been reset successfully. You can now log in using your new credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-sm font-black tracking-wider text-white uppercase shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Log In Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Create New Password</h2>
                <p className="text-white/50 text-xs mt-1">
                  Ensure your password meets the security criteria below.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                {/* New Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Strength Meter */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white/50 uppercase tracking-wider">Password Strength:</span>
                    <span className={`uppercase tracking-wider ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-1">Requirements</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {requirements.map((req, idx) => {
                      const met = req.test(password);
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs font-semibold">
                          {met ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-white/20 shrink-0" />
                          )}
                          <span className={met ? "text-emerald-400/90" : "text-white/40"}>{req.label}</span>
                        </div>
                      );
                    })}
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
                    "Reset Password"
                  )}
                </button>
              </form>

              {/* Back to Login Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel and Go Back</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
