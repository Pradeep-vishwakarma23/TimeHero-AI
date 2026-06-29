import React, { useState, useEffect } from "react";
import { Mic, Sparkles, Play, Volume2, VolumeX, RefreshCw } from "lucide-react";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

interface TopActionBarProps {
  title: string;
  session: {
    user_id: string;
    name: string;
    email: string;
    isGuest: boolean;
  };
  onLogout: () => void;
  onNavigate: (tab: string) => void;
}

export default function TopActionBar({ title, session, onLogout, onNavigate }: TopActionBarProps) {
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Listen to custom events from AI Coach or Voice to sync states
  useEffect(() => {
    const handleDemoState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isRunning: boolean }>;
      if (customEvent.detail) {
        setIsDemoRunning(customEvent.detail.isRunning);
      }
    };

    const handleSpeechState = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail) {
        setSpeechEnabled(customEvent.detail.enabled);
      }
    };

    window.addEventListener("demo-state-changed", handleDemoState);
    window.addEventListener("speech-state-changed", handleSpeechState);

    // Initial check: request current speech state from coach
    const reqEvent = new CustomEvent("request-speech-state");
    window.dispatchEvent(reqEvent);

    return () => {
      window.removeEventListener("demo-state-changed", handleDemoState);
      window.removeEventListener("speech-state-changed", handleSpeechState);
    };
  }, []);

  const handleLaunchVoice = () => {
    const event = new CustomEvent("open-voice-assistant");
    window.dispatchEvent(event);
  };

  const handleTriggerDemo = () => {
    const event = new CustomEvent("trigger-hackathon-demo");
    window.dispatchEvent(event);
  };

  const handleToggleSpeech = () => {
    const event = new CustomEvent("toggle-speech");
    window.dispatchEvent(event);
  };

  const isCoachPage = title === "AI Coach";

  return (
    <header 
      id="top-action-bar"
      className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-white/5 pb-6 mb-6"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        boxSizing: "border-box"
      }}
    >
      {/* Left side: Page Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-2">
          {title === "Dashboard" && "🚀 "}
          {title === "Future You Simulator" && "🔮 "}
          {title === "Calendar" && "📅 "}
          {title === "AI Planner" && "📋 "}
          {title === "AI Coach" && "🧠 "}
          {title === "Add Task" && "✍️ "}
          {title === "Task Pipeline" && "⚙️ "}
          {title === "Intelligence Hub" && "🛡️ "}
          {title === "Voice History" && "🎤 "}
          <span>{title === "Future You Simulator" ? "Future You" : title}</span>
        </h1>
        <p className="text-xs text-white/40 mt-1 font-medium">
          {title === "Dashboard" && "Your executive control center for high-risk deliverables."}
          {title === "Future You Simulator" && "Predictive future timeline simulation and risk calculation."}
          {title === "Calendar" && "Schedule, deconflict, and optimize focus blocks."}
          {title === "AI Planner" && "Decompose high-stress deliverables into modular sub-phases."}
          {title === "AI Coach" && "Live copilot and stress analyst monitoring system status."}
          {title === "Add Task" && "Register new deliverables to synthesize your schedule."}
          {title === "Task Pipeline" && "Interactive priority queue and development backlog."}
          {title === "Intelligence Hub" && "Notification history, logs, and simulated testing grounds."}
          {title === "Voice History" && "Processed voice logs and structured interactions."}
        </p>
      </div>

      {/* Right side Container */}
      <div 
        className="flex flex-col items-end gap-3 w-full sm:w-auto"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "12px",
          boxSizing: "border-box"
        }}
      >
        {/* Top Row: Bell + Profile (Desktop: Side-by-side, Tablet/Mobile: Stacked/Wrapped) */}
        <div className="flex flex-row items-center gap-3">
          {/* Notification Bell Container - Fixed Size 48x48 */}
          <div 
            className="w-12 h-12 flex items-center justify-center"
            style={{
              width: "48px",
              height: "48px",
              flexShrink: 0,
              boxSizing: "border-box"
            }}
          >
            <NotificationBell userId={session.user_id} onNavigate={onNavigate} />
          </div>

          {/* Profile Card Menu - Fixed width, Never shrink, Never overlap */}
          <div 
            className="flex-shrink-0"
            style={{
              flexShrink: 0,
              boxSizing: "border-box"
            }}
          >
            <ProfileMenu session={session} onLogout={onLogout} />
          </div>
        </div>

        {/* Bottom Row: Primary Button + Speaker if Coach page */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {isCoachPage && (
            <button
              onClick={handleToggleSpeech}
              className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${
                speechEnabled
                  ? "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 text-purple-400"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white/40"
              }`}
              style={{
                width: "48px",
                height: "48px",
                flexShrink: 0,
                boxSizing: "border-box"
              }}
              title={speechEnabled ? "Mute Voice Responses" : "Unmute Voice Responses"}
            >
              {speechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          )}

          {isCoachPage ? (
            <button
              onClick={handleTriggerDemo}
              disabled={isDemoRunning}
              className={`rounded-xl border font-black text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] ${
                isDemoRunning 
                  ? "bg-purple-600/20 border-purple-500/30 text-purple-300 animate-pulse cursor-not-allowed" 
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/10 cursor-pointer"
              }`}
              style={{
                width: "220px",
                height: "64px",
                maxWidth: "100%",
                flexShrink: 0,
                boxSizing: "border-box"
              }}
            >
              {isDemoRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Demo Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Judge Demo</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleLaunchVoice}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              style={{
                width: "220px",
                height: "64px",
                maxWidth: "100%",
                flexShrink: 0,
                boxSizing: "border-box"
              }}
            >
              <Mic className="w-4 h-4 text-purple-200" />
              <span>Launch Voice AI</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
