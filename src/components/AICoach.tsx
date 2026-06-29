import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  AlertTriangle, 
  BatteryCharging, 
  Briefcase, 
  Clock, 
  Zap,
  Info,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Activity,
  Volume2,
  VolumeX,
  Play,
  Gauge,
  Check
} from "lucide-react";
import { CoachReply, Task, DashboardStats } from "../types";

interface AICoachProps {
  tasks?: Task[];
  stats?: DashboardStats | null;
  session?: any;
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function AICoach({ 
  tasks = [], 
  stats = null,
  session = null,
  onLogout = undefined,
  onNavigate = undefined
}: AICoachProps) {
  // Global states
  const [messages, setMessages] = useState<Array<{ role: "user" | "coach" | "alert" | "system"; text: string }>>([
    { 
      role: "coach", 
      text: "Daily Executive Brief: Welcome to your Central Intelligence Center. I am monitoring your task volume, connected calendar, and fatigue indicators to keep your success likelihood optimized." 
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimulationScenario, setActiveSimulationScenario] = useState<string | null>(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'coaching' | 'recovery' | 'bottlenecks'>('coaching');

  // Sync state changes with the shared TopActionBar
  useEffect(() => {
    const event = new CustomEvent("demo-state-changed", { detail: { isRunning: isDemoRunning } });
    window.dispatchEvent(event);
  }, [isDemoRunning]);

  useEffect(() => {
    const event = new CustomEvent("speech-state-changed", { detail: { enabled: speechEnabled } });
    window.dispatchEvent(event);
  }, [speechEnabled]);

  useEffect(() => {
    const handleTriggerDemo = () => {
      runHackathonDemo();
    };

    const handleToggleSpeech = () => {
      setSpeechEnabled(prev => !prev);
    };

    const handleRequestSpeech = () => {
      const event = new CustomEvent("speech-state-changed", { detail: { enabled: speechEnabled } });
      window.dispatchEvent(event);
    };

    window.addEventListener("trigger-hackathon-demo", handleTriggerDemo);
    window.addEventListener("toggle-speech", handleToggleSpeech);
    window.addEventListener("request-speech-state", handleRequestSpeech);

    return () => {
      window.removeEventListener("trigger-hackathon-demo", handleTriggerDemo);
      window.removeEventListener("toggle-speech", handleToggleSpeech);
      window.removeEventListener("request-speech-state", handleRequestSpeech);
    };
  }, [speechEnabled, isDemoRunning]);

  // Executive Scores state
  const [metrics, setMetrics] = useState({
    productivityScore: 82,
    successProbability: 84,
    burnoutRisk: "Medium" as 'Low' | 'Medium' | 'High',
    deadlineHealth: 88,
    focusHoursLeft: 4.8,
    criticalTasksCount: 2,
    calendarConflicts: 1,
    deepWorkAvailability: 3.5,
    upcomingDeadlines: 3,
    estimatedCompletionDate: "Today"
  });

  // AI predictions history
  const [predictions, setPredictions] = useState<Array<{
    type: string;
    title: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    reason: string;
    impact: string;
  }>>([
    {
      type: "success_probability",
      title: "Success Probability",
      value: 84,
      trend: "stable",
      reason: "Moderate deliverable count with balanced effort parameters.",
      impact: "High likelihood of milestone completion."
    },
    {
      type: "burnout_risk",
      title: "Burnout Risk",
      value: 58,
      trend: "up",
      reason: "Consecutive deep focus sessions scheduled late into evening hours.",
      impact: "May lead to a 15% reduction in focus endurance."
    },
    {
      type: "missed_deadline",
      title: "Missed Deadline Risk",
      value: 16,
      trend: "down",
      reason: "Current focus velocity aligns comfortably with imminent deliverable timelines.",
      impact: "Zero overdue items anticipated."
    },
    {
      type: "calendar_overload",
      title: "Calendar Collision Risk",
      value: 30,
      trend: "stable",
      reason: "Calendar contains 1 overlapping slot due to rehearsal syncs.",
      impact: "Minor schedule conflict detected."
    }
  ]);

  // Bottlenecks list
  const [bottlenecks, setBottlenecks] = useState<Array<{
    type: string;
    title: string;
    item: string;
    why: string;
    impact: string;
    recommendation: string;
    improvement: number;
  }>>([
    {
      type: "task",
      title: "Highest Risk Task",
      item: "Finalize TimeHero AI MVP demo",
      why: "High complexity element scheduled near deadline window.",
      impact: "Reduces afternoon recovery bandwidth.",
      recommendation: "Reallocate development blocks to 9 AM tomorrow.",
      improvement: 14
    },
    {
      type: "context_switch",
      title: "Largest Context Switch",
      item: "Strategy Deck vs Core API coding",
      why: "Alternating between creative slides and backend databases in under 1 hour.",
      impact: "Generates an estimated 22% fatigue penalty.",
      recommendation: "Group all coding tasks in mornings, deck review in evenings.",
      improvement: 8
    }
  ]);

  // Recovery Plan state
  const [activeRecoveryPlan, setActiveRecoveryPlan] = useState<{
    id: number;
    title: string;
    status: "active" | "completed" | "archived";
    steps: { id: number; title: string; desc: string; done: boolean }[];
    tasksAffectedCount: number;
  } | null>({
    id: 1,
    title: "Strategic Workload Compression Plan",
    status: "active",
    steps: [
      { id: 1, title: "Defer Secondary Pitch Deck Design", desc: "Move secondary styling deliverables out by 48 hours to protect core code.", done: false },
      { id: 2, title: "Lock Contiguous Morning Deep Blocks", desc: "Reserve 9:00 AM to 11:30 AM exclusively for API database synchronization.", done: false },
      { id: 3, title: "Automate Calendar Deconfliction", desc: "Politely reschedule the overlapping rehearsal slot to Thursday afternoon.", done: false }
    ],
    tasksAffectedCount: 2
  });

  // Load live statistics from props
  useEffect(() => {
    if (stats) {
      const computedEnergy = Math.max(20, Math.min(98, 100 - Math.round(stats.avgRisk * 0.4)));
      const computedBurnout = stats.avgRisk >= 74 ? "High" : stats.avgRisk >= 44 ? "Medium" : "Low";
      
      setMetrics(prev => ({
        ...prev,
        productivityScore: stats.productivityScore,
        deadlineHealth: stats.deadlineHealth,
        criticalTasksCount: stats.dueToday,
        focusHoursLeft: stats.focusHours || 4.8,
        successProbability: Math.min(98, Math.max(45, 100 - stats.avgRisk)),
        burnoutRisk: computedBurnout as 'Low' | 'Medium' | 'High'
      }));
    }
  }, [stats]);

  // Load intelligence data on load
  const fetchIntelligence = async () => {
    try {
      const res = await fetch("/api/intelligence");
      if (res.ok) {
        const data = await res.json();
        if (data.predictions && data.predictions.length > 0) {
          setPredictions(data.predictions);
        }
        if (data.recoveryPlans && data.recoveryPlans.length > 0) {
          const active = data.recoveryPlans.find((p: any) => p.status === "active");
          if (active) {
            setActiveRecoveryPlan(active);
          }
        }
        if (data.recommendations && data.recommendations.length > 0) {
          // Sync recommendations with metric highlights
        }
      }
    } catch (err) {
      console.error("Error loading persistent intelligence:", err);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Voice synthesis synthesis
  const speakText = (text: string) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    // Find a nice female or default clear neural voice if available
    const voices = window.speechSynthesis.getVoices();
    const selectVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Female")) || voices[0];
    if (selectVoice) utterance.voice = selectVoice;
    window.speechSynthesis.speak(utterance);
  };

  const triggerToast = (msg: string) => {
    // Local fallback indicator
    console.log(`[TimeHero Coach Toast]: ${msg}`);
  };

  // Chat message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== "alert" && m.role !== "system")
        .map(m => ({
          role: m.role === "user" ? "user" as const : "model" as const,
          parts: [{ text: m.text }]
        }));

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: userText, chatHistory: history }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev, 
          { role: "coach", text: data.reply }
        ]);

        if (data.burnoutRisk === "High") {
          setMessages((prev) => [
            ...prev,
            { role: "alert", text: "🚨 Executive Danger: Cognitive depletion risk is exceeding safe limits. Immediate decompression advised." }
          ]);
        }

        // Speak response out loud
        speakText(data.reply);

        // Update predictions and live layout
        if (data.predictions) setPredictions(data.predictions);
        if (data.bottlenecks) setBottlenecks(data.bottlenecks);
        if (data.recoveryPlan) {
          const formattedPlan = {
            id: Date.now(),
            title: data.recoveryPlan.title,
            status: "active" as const,
            steps: data.recoveryPlan.steps.map((s: any, idx: number) => ({
              id: idx + 1,
              title: s.title,
              desc: s.desc,
              done: false
            })),
            tasksAffectedCount: tasks.filter(t => t.status !== "Completed").length
          };
          setActiveRecoveryPlan(formattedPlan);
        }

        setMetrics(prev => ({
          ...prev,
          productivityScore: data.workloadScore ? Math.min(98, 110 - data.workloadScore) : prev.productivityScore,
          successProbability: data.successProbability || prev.successProbability,
          burnoutRisk: data.burnoutRisk || prev.burnoutRisk
        }));
      } else {
        throw new Error("Failed response");
      }
    } catch (err) {
      console.error("AI Coach communication failure:", err);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { 
            role: "coach", 
            text: "My neural models suggest focusing strictly on your highest-risk task right now. Work on 'Finalize TimeHero AI MVP demo' for 25 minutes without notifications." 
          }
        ]);
        speakText("I suggest focusing strictly on your highest risk task right now.");
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  // What-If Simulator Action
  const runSimulation = async (scenario: string) => {
    setIsSimulating(true);
    setActiveSimulationScenario(scenario);
    triggerToast(`⚡ Simulating Timeline impact: "${scenario}"`);

    // Add a system loading message
    setMessages(prev => [...prev, { role: "system", text: `⏳ AI Simulator: Projecting metrics for scenario "${scenario}"...` }]);

    try {
      const res = await fetch("/api/coach/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Highlight updated stats with a small simulation message
        setMessages(prev => [...prev, { role: "coach", text: `📊 ${data.reply}` }]);
        speakText(data.reply);

        if (data.predictions) setPredictions(data.predictions);
        if (data.bottlenecks) setBottlenecks(data.bottlenecks);

        setMetrics(prev => ({
          ...prev,
          successProbability: data.successProbability,
          burnoutRisk: data.burnoutRisk,
          productivityScore: Math.round(data.energyScore * 1.1)
        }));
      }
    } catch (err) {
      console.error("Error executing What-If simulation:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // One-click Apply Recovery Plan
  const applyRecoveryPlan = async () => {
    if (!activeRecoveryPlan) return;
    setLoading(true);
    triggerToast("⚡ Executing Autonomous Recovery schedule re-allocation...");

    try {
      const res = await fetch("/api/intelligence/recovery/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planId: activeRecoveryPlan.id, 
          steps: activeRecoveryPlan.steps 
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          { role: "system", text: "✅ SUCCESS: Workspace re-allocated and synchronized." },
          { role: "coach", text: "I have successfully pushed non-essential deadlines back by 48 hours, muted slack notifications, and locked in a 90-minute morning deep focus window. Your Success Probability is restored to 94%!" }
        ]);
        speakText("Your recovery plan has been applied successfully. Deadlines are de-conflicted!");

        setMetrics(prev => ({
          ...prev,
          successProbability: data.successProbability,
          burnoutRisk: data.burnoutRisk as 'Low' | 'Medium' | 'High'
        }));

        setActiveRecoveryPlan(prev => prev ? { ...prev, status: "completed", steps: prev.steps.map(s => ({ ...s, done: true })) } : null);
      }
    } catch (err) {
      console.error("Error applying recovery plan:", err);
    } finally {
      setLoading(false);
    }
  };

  // Hackathon Demo Mode
  const runHackathonDemo = async () => {
    setIsDemoRunning(true);
    setMessages(prev => [...prev, { role: "system", text: "⚡ HACKATHON DEMO MODE ACTIVE: Stress-testing AI Coach brain..." }]);

    try {
      const res = await fetch("/api/intelligence/demo", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        
        // Dynamic simulated loader
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { role: "alert", text: `🚨 WARNING: Overdue deliverables detected. Success probability dropped to 41%! CPU Overload.` },
            { role: "coach", text: `🎙️ DAILY EXECUTIVE BRIEF:\n- Target Goal: ${data.executiveBrief.todayGoal}\n- Priority 1: ${data.executiveBrief.priority1}\n- Priority 2: ${data.executiveBrief.priority2}\n- Priority 3: ${data.executiveBrief.priority3}\n\nSuccess probability is extremely low at ${data.executiveBrief.successProbability}% with high Burnout Risk. Apply the recovery plan immediately to resolve.` }
          ]);

          setMetrics(prev => ({
            ...prev,
            successProbability: data.executiveBrief.successProbability,
            burnoutRisk: data.executiveBrief.burnoutRisk,
            criticalTasksCount: 3,
            calendarConflicts: 2,
            deepWorkAvailability: 1.5
          }));

          setPredictions([
            {
              type: "success_probability",
              title: "Success Probability",
              value: 41,
              trend: "down",
              reason: "Imminent deadlines due in hours, with overdue task 'Core database connector integration'.",
              impact: "Highly likely to miss hackathon submission timeline."
            },
            {
              type: "burnout_risk",
              title: "Burnout Risk",
              value: 92,
              trend: "up",
              reason: "Excessive context switching and 14 estimated hours required in single study sprint.",
              impact: "Compounding fatigue will degrade pitch delivery by 35%."
            },
            {
              type: "missed_deadline",
              title: "Missed Deadline Risk",
              value: 88,
              trend: "up",
              reason: "No available focus slots scheduled between rehearsals.",
              impact: "Database synchronization module remains incomplete."
            },
            {
              type: "calendar_overload",
              title: "Calendar Collision Risk",
              value: 75,
              trend: "up",
              reason: "Overlapping dry runs and judge sync meetings.",
              impact: "Completely blocks deep development focus."
            }
          ]);

          setBottlenecks([
            {
              type: "task",
              title: "Overdue Bottleneck",
              item: "Overdue: Core database connector integration",
              why: "Task was scheduled for yesterday and blocks calendar synchronizer UI.",
              impact: "Reduces visual graph rendering capability.",
              recommendation: "Cancel afternoon meeting and code immediately.",
              improvement: 28
            },
            {
              type: "calendar",
              title: "Rehearsal Intersection Overload",
              item: "Dry Run syncs (1:00 PM - 4:00 PM)",
              why: "Overlapping rehearsal blocks fragment deep development slot.",
              impact: "Blocks contiguous development time.",
              recommendation: "Consolidate into 1 brief rehearsal at 5 PM.",
              improvement: 15
            }
          ]);

          setActiveRecoveryPlan({
            id: 201,
            title: "🚀 Autonomous Hackathon Recovery Blueprint",
            status: "active",
            steps: [
              { id: 1, title: "Trigger Decompression Mode", desc: "Defer walkthrough storyboard slide polish to 8 PM, code overdue connector now.", done: false },
              { id: 2, title: "Consolidate Rehearsals", desc: "Automate cancellation of morning dry runs to secure 2.5 hours of focus.", done: false },
              { id: 3, title: "Auto-Trim Scope Features", desc: "Keep API structures minimal and elegant. Protect presentation visuals.", done: false }
            ],
            tasksAffectedCount: 3
          });

          // Play Speech synthesis
          speakText(data.vocalExplanation);
          setIsDemoRunning(false);
        }, 1200);

      }
    } catch (err) {
      console.error("Demo Mode Bootstrap failure:", err);
      setIsDemoRunning(false);
    }
  };

  const getBurnoutBadgeColor = (risk: 'Low' | 'Medium' | 'High') => {
    if (risk === "High") return "text-rose-400 border-rose-500/30 bg-rose-500/10";
    if (risk === "Medium") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  };

  const getSuccessBadgeColor = (prob: number) => {
    if (prob >= 80) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
    if (prob >= 55) return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    return "text-rose-400 border-rose-500/20 bg-rose-500/10";
  };

  return (
    <div className="space-y-8 animate-fade-in text-white">
      {/* Executive Brain Info Banner */}
      <div 
        id="ai-coach-header-container"
        className="w-full flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md"
        style={{
          boxSizing: "border-box"
        }}
      >
        <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl shrink-0">
          <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">TimeHero Executive Intelligence Engine</h2>
          <p className="text-xs text-white/50 mt-0.5">Autonomous Central Brain monitoring live tasks, schedules, and stress metrics to synthesize optimal recovery plans.</p>
        </div>
      </div>

      {/* 1. LIVE EXECUTIVE DASHBOARD BAR */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Productivity Score */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-xl group hover:border-purple-500/30 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full filter blur-xl group-hover:bg-purple-500/20 transition-all" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-400" />
            Productivity Score
          </span>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-3xl font-black">{metrics.productivityScore}%</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[9px] text-white/40 font-medium mt-1">Excellent task completion pace</p>
        </div>

        {/* Success Probability */}
        <div className={`border p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-xl group hover:border-purple-500/30 transition-all ${getSuccessBadgeColor(metrics.successProbability)}`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full filter blur-xl" />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            Success Probability
          </span>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-3xl font-black">{metrics.successProbability}%</span>
            {metrics.successProbability >= 70 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400 animate-pulse" />
            )}
          </div>
          <p className="text-[9px] opacity-60 font-medium mt-1">Timeline reliability projection</p>
        </div>

        {/* Burnout Risk */}
        <div className={`border p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-xl group hover:border-purple-500/30 transition-all ${getBurnoutBadgeColor(metrics.burnoutRisk)}`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full filter blur-xl" />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Burnout Risk
          </span>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-2xl font-black uppercase tracking-wider">{metrics.burnoutRisk}</span>
          </div>
          <p className="text-[9px] opacity-60 font-medium mt-1.5">Context-switch fatigue levels</p>
        </div>

        {/* Focus Hours Left */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-xl group hover:border-purple-500/30 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full filter blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            Focus Hours Left
          </span>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-3xl font-black">{metrics.focusHoursLeft}h</span>
          </div>
          <p className="text-[9px] text-white/40 font-medium mt-1">Cognitive headroom remaining</p>
        </div>

        {/* Today's Critical Tasks */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-xl group hover:border-purple-500/30 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full filter blur-xl group-hover:bg-rose-500/20 transition-all" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Today's Critical
          </span>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-3xl font-black text-rose-400">{metrics.criticalTasksCount}</span>
          </div>
          <p className="text-[9px] text-white/40 font-medium mt-1">Imminent deadline tasks due</p>
        </div>

        {/* Calendar Conflicts */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-xl group hover:border-purple-500/30 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full filter blur-xl group-hover:bg-amber-500/20 transition-all" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-amber-400" />
            Calendar Conflicts
          </span>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-3xl font-black text-amber-400">{metrics.calendarConflicts}</span>
          </div>
          <p className="text-[9px] text-white/40 font-medium mt-1">Interlocking meeting syncs</p>
        </div>
      </section>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Chat, Simulator, and Tools Container (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col h-[580px] bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md relative">
          
          {/* Tab selector bar */}
          <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setActiveTab('coaching')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'coaching' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/70'}`}
              >
                Coaching Chat
              </button>
              <button 
                onClick={() => setActiveTab('recovery')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${activeTab === 'recovery' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/70'}`}
              >
                Recovery Plan
                {activeRecoveryPlan && activeRecoveryPlan.status === "active" && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('bottlenecks')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'bottlenecks' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/70'}`}
              >
                Bottlenecks
              </button>
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Neural Node Active</span>
            </div>
          </div>

          {/* Tab Content 1: Conversational chat stream */}
          {activeTab === 'coaching' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div 
                className="overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
                style={{ height: "534.109px" }}
              >
                {messages.map((m, idx) => {
                  if (m.role === "alert") {
                    return (
                      <div key={idx} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-xs font-bold leading-relaxed flex gap-2.5 items-start animate-fade-in shadow-lg">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>{m.text}</div>
                      </div>
                    );
                  }
                  if (m.role === "system") {
                    return (
                      <div key={idx} className="text-center py-2 text-[10px] font-black tracking-widest text-purple-400 uppercase bg-purple-500/5 border border-purple-500/10 rounded-full animate-fade-in">
                        {m.text}
                      </div>
                    );
                  }

                  const isCoach = m.role === "coach";
                  return (
                    <div key={idx} className={`flex ${isCoach ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm font-bold leading-relaxed shadow-lg border animate-fade-in ${
                        isCoach 
                          ? "bg-slate-900/90 border-white/10 text-white/95" 
                          : "bg-purple-600/20 border-purple-500/30 text-purple-200"
                      }`}>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">
                          {isCoach ? "TimeHero Executive Brain" : "You"}
                        </span>
                        <div className="whitespace-pre-line">{m.text}</div>
                      </div>
                    </div>
                  );
                })}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex gap-1.5 items-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat input form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5 flex gap-3">
                <input
                  type="text"
                  placeholder="Ask for schedule recommendations, timeline answers, or stress recovery guides..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className="px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-150 flex items-center justify-center shrink-0 shadow-lg disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Tab Content 2: Smart Recovery Plan */}
          {activeTab === 'recovery' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {activeRecoveryPlan ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Autonomous Schedule Decompression</span>
                        <h3 className="text-base font-black mt-1">{activeRecoveryPlan.title}</h3>
                      </div>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${
                        activeRecoveryPlan.status === "completed" 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
                      }`}>
                        {activeRecoveryPlan.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-2">
                      When success metrics drop or cognitive load spikes, TimeHero crafts a safety plan. Applying this plan automatically reorganizes deadlines, silences alerts, and schedules deep focus windows.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white/40">Action Steps Sequence</h4>
                    {activeRecoveryPlan.steps.map((step) => (
                      <div key={step.id} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-purple-500/20 transition-all">
                        <div className="shrink-0">
                          {step.done ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-[10px] font-black text-purple-400">
                              {step.id}
                            </div>
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-white">{step.title}</h5>
                          <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {activeRecoveryPlan.status === "active" && (
                    <button
                      onClick={applyRecoveryPlan}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Apply Autonomous Recovery Plan Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Workspace Perfectly Balanced</h3>
                  <p className="text-xs text-white/40 max-w-sm">No recovery plans are currently required. Your success metrics are fully optimized.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 3: Bottleneck Detector */}
          {activeTab === 'bottlenecks' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Active Productivity Blockers</span>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {bottlenecks.map((b, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-purple-500/20 transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">{b.title}</span>
                          <h4 className="text-xs font-black text-white mt-1">{b.item}</h4>
                        </div>
                        <span className="px-2.5 py-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/25 shrink-0">
                          +{b.improvement}% Success Lift
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Why It Blocks</span>
                          <p className="text-[11px] text-white/60 mt-1">{b.why}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Fatigue Impact</span>
                          <p className="text-[11px] text-white/60 mt-1">{b.impact}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 block">AI Automated Recommendation</span>
                        <p className="text-[11px] text-white/80 mt-1 font-bold">{b.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right: What-If Simulator & AI Predictions (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 2. WHAT-IF SIMULATOR ENGINE CARD */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                What-If Simulator Engine
              </span>
              {activeSimulationScenario && (
                <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">
                  Simulation Active
                </span>
              )}
            </div>

            <p className="text-[11px] text-white/50 leading-relaxed mb-4">
              Instantly simulate workspace adjustments to predict success probability, burnout risk, and schedule conflicts before executing them on your calendar.
            </p>

            <div className="space-y-3">
              <button
                disabled={isSimulating}
                onClick={() => runSimulation("delay_critical_task")}
                className={`w-full p-3.5 bg-white/5 hover:bg-white/10 border text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${activeSimulationScenario === "delay_critical_task" ? "border-purple-500 bg-purple-500/5" : "border-white/10"}`}
              >
                <span>What if I delay highest-risk task?</span>
                <span className="text-[9px] text-purple-400 uppercase tracking-widest font-black">Project Timeline</span>
              </button>

              <button
                disabled={isSimulating}
                onClick={() => runSimulation("skip_today")}
                className={`w-full p-3.5 bg-white/5 hover:bg-white/10 border text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${activeSimulationScenario === "skip_today" ? "border-purple-500 bg-purple-500/5" : "border-white/10"}`}
              >
                <span>What if I skip today's work?</span>
                <span className="text-[9px] text-purple-400 uppercase tracking-widest font-black">Project Timeline</span>
              </button>

              <button
                disabled={isSimulating}
                onClick={() => runSimulation("study_extra_hour")}
                className={`w-full p-3.5 bg-white/5 hover:bg-white/10 border text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${activeSimulationScenario === "study_extra_hour" ? "border-purple-500 bg-purple-500/5" : "border-white/10"}`}
              >
                <span>What if I study 1 extra hour daily?</span>
                <span className="text-[9px] text-purple-400 uppercase tracking-widest font-black">Project Timeline</span>
              </button>

              <button
                disabled={isSimulating}
                onClick={() => runSimulation("work_weekend")}
                className={`w-full p-3.5 bg-white/5 hover:bg-white/10 border text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${activeSimulationScenario === "work_weekend" ? "border-purple-500 bg-purple-500/5" : "border-white/10"}`}
              >
                <span>What if I work this weekend?</span>
                <span className="text-[9px] text-purple-400 uppercase tracking-widest font-black">Project Timeline</span>
              </button>
            </div>

            {activeSimulationScenario && (
              <button
                onClick={() => {
                  setActiveSimulationScenario(null);
                  fetchIntelligence();
                  setMetrics(prev => ({
                    ...prev,
                    successProbability: 84,
                    burnoutRisk: "Medium"
                  }));
                }}
                className="w-full mt-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-yellow-500/20 transition-all"
              >
                Reset Simulation to Live View
              </button>
            )}
          </div>

          {/* 3. AI PREDICTIVE INTELLIGENCE */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-5 flex items-center justify-between">
              <span>Predictive Intelligence</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">Continuous</span>
            </h3>

            <div className="space-y-4">
              {predictions.map((p, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2 hover:border-purple-500/20 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{p.title}</span>
                    <span className={`text-xs font-black ${
                      p.value >= 75 ? "text-emerald-400" : p.value >= 50 ? "text-amber-400" : "text-rose-400"
                    }`}>
                      {p.value}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.trend === "up" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : p.trend === "down" ? (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    )}
                    <p className="text-[11px] text-white/80 leading-relaxed font-bold">{p.reason}</p>
                  </div>

                  <div className="text-[10px] text-white/40 border-t border-white/5 pt-1.5 mt-1">
                    <span className="font-black text-purple-400">Impact: </span>{p.impact}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
