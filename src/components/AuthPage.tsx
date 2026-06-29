import React, { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";

interface AuthPageProps {
  onAuthSuccess: (sessionData: {
    user_id: string;
    name: string;
    email: string;
    isGuest: boolean;
    token?: string;
  }) => void;
  onForgotPassword: () => void;
}

export default function AuthPage({ onAuthSuccess, onForgotPassword }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email format helper
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      onAuthSuccess({
        user_id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        isGuest: false,
        token: data.token,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      onAuthSuccess({
        user_id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        isGuest: false,
        token: data.token,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Guest login failed.");
      }
      onAuthSuccess({
        user_id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        isGuest: true,
        token: data.token,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during guest sign in.");
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-purple-300 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Empowered Productivity
          </div>
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
          layout
          className="border border-white/10 bg-slate-950/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/15 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full filter blur-[40px] pointer-events-none" />

          {/* Heading */}
          <h2 className="text-xl font-bold text-white mb-6">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {/* Full Name field for registration */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First & Last Name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
              </div>
            )}

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

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">Password</label>
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

            {/* Confirm Password Field for registration */}
            {!isLogin && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">Confirm Password</label>
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
            )}

            {/* Remember me & Forgot Password */}
            {isLogin && (
              <div className="flex items-center justify-between text-xs font-semibold pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500/30 w-4 h-4"
                  />
                  <span>Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-bold cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 mt-6 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-sm font-black tracking-wider text-white uppercase shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          {/* Guest login action */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold tracking-wide text-purple-300 hover:text-purple-200 transition-all duration-150 active:scale-[0.98] flex items-center justify-center cursor-pointer"
            >
              Continue as Guest
            </button>
          </div>

          {/* Toggle Login/Register */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs font-semibold">
            <span className="text-white/40">
              {isLogin ? "Don't have an account yet?" : "Already have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors font-bold ml-1 cursor-pointer"
            >
              {isLogin ? "Register here" : "Login here"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
