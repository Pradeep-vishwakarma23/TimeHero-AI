import React, { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings as SettingsIcon, Shield, Sparkles, Award, Flame, X } from "lucide-react";

interface ProfileMenuProps {
  session: {
    user_id: string;
    name: string;
    email: string;
    isGuest: boolean;
  };
  onLogout: () => void;
}

export default function ProfileMenu({ session, onLogout }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"profile" | "settings" | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const initials = getInitials(session.name);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 text-left transition-all duration-200 cursor-pointer shadow-lg active:scale-95"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-md shadow-purple-500/10">
          {initials}
        </div>
        <div className="hidden sm:block">
          <p className="text-[11px] font-black leading-none text-white">{session.name}</p>
          <p className="text-[9px] text-white/50 leading-none mt-0.5 font-medium">
            {session.isGuest ? "Guest Mode" : "Pro Member"}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-slate-950/95 border border-white/10 shadow-2xl backdrop-blur-xl py-2 z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-black text-white">{session.name}</p>
            <p className="text-[10px] text-white/40 truncate mt-0.5">{session.email}</p>
          </div>

          <div className="p-1.5 space-y-0.5">
            {/* My Profile */}
            <button
              onClick={() => {
                setActiveModal("profile");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer"
            >
              <User className="w-4 h-4 text-purple-400" />
              <span>My Profile</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                setActiveModal("settings");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4 text-purple-400" />
              <span>Settings</span>
            </button>

            <div className="h-px bg-white/5 my-1" />

            {/* Logout */}
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-black text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {activeModal === "profile" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020202]/80 backdrop-blur-sm animate-fade-in select-none">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full filter blur-[40px] pointer-events-none" />
            
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-xl text-white uppercase shadow-lg shadow-purple-500/25">
                {initials}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{session.name}</h3>
                <p className="text-xs text-white/50">{session.email}</p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-300 uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                {session.isGuest ? "Guest Access" : "Authorized User"}
              </div>

              <div className="w-full border-t border-white/5 my-2 pt-4 space-y-3 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-bold">Account ID</span>
                  <span className="font-mono text-white/80 text-[11px] bg-white/5 px-2 py-0.5 rounded-md">{session.user_id}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-bold">Account Status</span>
                  <span className="text-emerald-400 font-bold">✓ Active</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-bold">Scope Mode</span>
                  <span className="text-purple-300 font-bold">{session.isGuest ? "Offline Transient Sandbox" : "Persistent Cloud Sync"}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all duration-150 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020202]/80 backdrop-blur-sm animate-fade-in select-none">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full filter blur-[40px] pointer-events-none" />
            
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Application Settings</h3>
                  <p className="text-xs text-white/50">Manage your command center preferences</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Gemini API Engine</span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Powered by TimeHero dual-fallback engine utilizing <strong className="text-purple-300">gemini-3.1-flash-lite</strong> for latency-optimal scheduling suggestions.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Focus Scheduling</span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Dynamic peak focus window set to <strong className="text-amber-400">2 PM - 5 PM</strong> based on global productivity benchmarks.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span>UI Theme Preference</span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Optimized on <strong className="text-indigo-300">Cosmic Obsidian Theme</strong>. Visual customization locked to maintain accessibility and elite aesthetic branding.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-xs font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
