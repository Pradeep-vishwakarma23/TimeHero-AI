import React, { useState, useEffect } from "react";
import { 
  Hourglass, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight, 
  Zap, 
  Frown, 
  ShieldCheck, 
  Info,
  CalendarDays,
  Gauge
} from "lucide-react";
import { FuturePredictionResult, Task, DashboardStats } from "../types";

// Animated Number helper to animate values smoothly over 600ms
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = value;
    const duration = 600; // Duration 500-800ms
    
    let cancelled = false;
    
    function step(timestamp: number) {
      if (cancelled) return;
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Ease out quad
      const easedProgress = progress * (2 - progress);
      const current = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    }
    
    window.requestAnimationFrame(step);
    return () => {
      cancelled = true;
    };
  }, [value]);
  
  return <>{typeof value === "number" && !isNaN(value) && value % 1 !== 0 ? displayValue.toFixed(1) : Math.round(displayValue)}</>;
}

interface FutureSimulatorProps {
  tasks?: Task[];
  stats?: DashboardStats | null;
  session?: { user_id: string; name: string; email: string; isGuest: boolean } | null;
}

export default function FutureSimulator({ tasks = [], stats = null, session = null }: FutureSimulatorProps) {
  const [delayScenario, setDelayScenario] = useState<number>(2); // Default to 2 days delay
  const [prediction, setPrediction] = useState<FuturePredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [customRecoveryPlan, setCustomRecoveryPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Scenarios helper
  const scenarios = [
    { label: "Delay 1 day", days: 1 },
    { label: "Delay 2 days", days: 2 },
    { label: "Delay 3 days", days: 3 },
    { label: "Delay 1 week", days: 7 },
  ];

  const currentSuccessRate = stats ? Math.max(20, Math.min(98, 100 - stats.avgRisk)) : 88;

  // 1. Prediction API fetching
  useEffect(() => {
    async function fetchPrediction() {
      try {
        setLoading(true);
        const res = await fetch("/api/prediction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delayDays: delayScenario, currentSuccessRate }),
        });
        if (res.ok) {
          const data = await res.json();
          setPrediction(data);
        }
      } catch (err) {
        console.error("Error fetching delay prediction:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrediction();
  }, [delayScenario, tasks, currentSuccessRate]);

  // 2. Fetch latest saved recovery plan on mount
  useEffect(() => {
    async function loadSavedPlan() {
      const uId = session?.user_id || "guest";
      try {
        const res = await fetch(`/api/prediction/recovery-plan/${uId}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setCustomRecoveryPlan(data);
        }
      } catch (err) {
        console.error("Error loading saved recovery plan:", err);
      }
    }
    loadSavedPlan();
  }, [session]);

  // Fallbacks if server fails or is loading
  const getFallbackPrediction = (days: number): FuturePredictionResult => {
    const currentSuccess = currentSuccessRate;
    const penaltyMap: { [key: number]: number } = { 1: 9, 2: 19, 3: 31, 7: 54 };
    const penalty = penaltyMap[days] || (days * 11);
    const futureSuccess = Math.max(22, currentSuccess - penalty);
    const stressIncrease = Math.min(96, 16 + days * 11);
    const recoveryHours = parseFloat((1.5 + days * 2.2).toFixed(1));
    const riskValue = Math.min(96, 24 + days * 9 + Math.round((100 - futureSuccess) / 3));

    return {
      successProbability: futureSuccess,
      stressIncrease,
      recoveryHours,
      riskValue,
      predictionText: `If you delay by ${days} day(s), TimeHero AI predicts a sharp drop in your success probability. Future You will face significant task stacking, which will force you into exhausting late-night rush sessions.`,
      recoveryPlan: [
        { title: "First 25 minutes", text: "Lock yourself in focus mode and knock out the primary bottleneck block immediately." },
        { title: "Next 45 minutes", text: "Map the minimal shippable features and skip lower-priority visual iterations." },
        { title: "Final 20 minutes", text: "Compile the results and review your plan to maintain tomorrow's momentum." }
      ]
    };
  };

  const activePrediction = prediction || getFallbackPrediction(delayScenario);

  // 3. Generate Real AI Recovery Plan via Gemini and store in SQLite
  const handleGenerateRecoveryPlan = async () => {
    try {
      setLoadingPlan(true);
      const uId = session?.user_id || "guest";
      const res = await fetch("/api/prediction/recovery-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uId, delayDays: delayScenario }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRecoveryPlan(data);
        
        // Trigger a custom toast event so App.tsx can show it elegantly
        const toastEvent = new CustomEvent("timehero-toast", {
          detail: { message: "🔮 Recovery plan successfully generated and stored in SQLite!", type: "success" }
        });
        window.dispatchEvent(toastEvent);
      }
    } catch (err) {
      console.error("Error generating recovery plan:", err);
    } finally {
      setLoadingPlan(false);
    }
  };

  // 4. Dynamic Timeline derivation from actual tasks
  const rawPhases = [
    { phase: "Research", startOffset: 0, length: 1.5 },
    { phase: "Design", startOffset: 1, length: 1.5 },
    { phase: "Development", startOffset: 2, length: 2 },
    { phase: "Testing", startOffset: 3.5, length: 1 },
    { phase: "Deployment", startOffset: 4.5, length: 1 },
  ];

  const phases = rawPhases.map((row) => {
    const categoryTasks = tasks.filter(t => t.category.toLowerCase() === row.phase.toLowerCase());
    if (categoryTasks.length > 0) {
      const totalEffort = categoryTasks.reduce((sum, t) => sum + t.effort, 0);
      const calculatedLength = Math.max(1.0, Math.min(3.5, totalEffort * 0.4));
      
      const earliestDeadline = categoryTasks.reduce((earliest, t) => {
        const d = new Date(t.deadline).getTime();
        return d < earliest ? d : earliest;
      }, Infinity);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const daysUntilEarliest = Math.max(0, Math.ceil((earliestDeadline - today.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        ...row,
        length: parseFloat(calculatedLength.toFixed(1)),
        startOffset: Math.max(0, Math.min(5, daysUntilEarliest - 1))
      };
    }
    return row;
  });

  // 5. Impact Summary variables
  const uncompletedTasks = tasks.filter(t => t.status !== "Completed");
  const today = new Date();
  today.setHours(0,0,0,0);

  const missedMilestones = uncompletedTasks.filter(t => {
    const d = new Date(t.deadline);
    const daysLeft = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return (daysLeft - delayScenario) < 0;
  }).length;

  const deadlineConflicts = uncompletedTasks.filter(t => {
    const d = new Date(t.deadline);
    const daysLeft = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return (daysLeft - delayScenario) <= 0;
  }).length;

  const extraWorkHours = Math.round(delayScenario * 1.5 + (uncompletedTasks.filter(t => t.priority === "Critical").length * 2));
  const lostFocusHours = parseFloat((delayScenario * 1.2 + (uncompletedTasks.length * 0.4)).toFixed(1));

  // SVG Gauge Visualizer for Risk Meter
  const renderRiskMeter = (score: number) => {
    const radius = 60;
    const strokeWidth = 10;
    const circumference = Math.PI * radius; 
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let color = "#22C55E"; 
    let glow = "shadow-emerald-500/10";
    if (score >= 74) {
      color = "#EF4444"; 
      glow = "shadow-rose-500/30";
    } else if (score >= 44) {
      color = "#F59E0B"; 
      glow = "shadow-amber-500/20";
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden h-72 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full filter blur-xl pointer-events-none" />
        <h4 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-1.5 self-start">
          <Gauge className="w-4 h-4 text-purple-400" />
          Delay Risk Meter
        </h4>
        
        <div className="relative w-40 h-24 flex items-center justify-center mt-2">
          <svg className="w-full h-full" viewBox="0 0 160 100">
            {/* Background Arc */}
            <path
              d="M 20,80 A 60,60 0 0,1 140,80"
              fill="transparent"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Colored Level Arc */}
            <path
              d="M 20,80 A 60,60 0 0,1 140,80"
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          
          <div className="absolute bottom-2 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black text-white leading-none">
              <AnimatedNumber value={score} />%
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-2">
              {score >= 74 ? "CRITICAL RISK" : score >= 44 ? "WARNING" : "SAFE LEVEL"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/30 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-900/20 rounded-full filter blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-purple-300 uppercase tracking-widest">
            <Hourglass className="w-3.5 h-3.5 text-purple-400" />
            Hero Feature
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
            Future You Simulator
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-3xl">
            See the real cost of procrastination and delay before it hits your calendar, stress level, and success probability.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Before vs After
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Risk Meter
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Recovery Hours
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Timeline Shift
            </span>
          </div>
        </div>
      </section>

      {/* Selector Scenario bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/40">Choose a delay scenario</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scenarios.map((sc) => (
            <button
              key={sc.days}
              onClick={() => setDelayScenario(sc.days)}
              className={`py-3 px-4 rounded-lg font-bold border transition-all duration-150 text-sm cursor-pointer ${
                delayScenario === sc.days
                  ? "bg-white/10 border-white/20 text-purple-200 shadow-lg"
                  : "bg-transparent border-white/10 text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between h-full">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Original Success Rate</span>
            <div className="text-3xl font-black text-white mt-3">
              <AnimatedNumber value={currentSuccessRate} />%
            </div>
          </div>
          <p className="text-xs text-emerald-400 font-semibold mt-4 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            If you start today
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between h-full">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full filter blur-xl" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Shifted Success Rate</span>
            <div className={`text-3xl font-black mt-3 transition-colors duration-300 ${loading ? "text-slate-500 animate-pulse" : "text-rose-400"}`}>
              <AnimatedNumber value={activePrediction.successProbability} />%
            </div>
          </div>
          <p className="text-xs text-rose-400 font-semibold mt-4 flex items-center gap-1">
            <Frown className="w-4 h-4 text-rose-400" />
            After {delayScenario} day delay
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between h-full">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Stress Spike</span>
            <div className={`text-3xl font-black mt-3 transition-colors duration-300 ${loading ? "text-slate-500 animate-pulse" : "text-amber-400"}`}>
              +<AnimatedNumber value={activePrediction.stressIncrease} />%
            </div>
          </div>
          <p className="text-xs text-white/50 mt-4">Cognitive load compounds</p>
        </div>

        <div className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between h-full">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Recovery Effort Required</span>
            <div className={`text-3xl font-black mt-3 transition-colors duration-300 ${loading ? "text-slate-500 animate-pulse" : "text-purple-400"}`}>
              <AnimatedNumber value={activePrediction.recoveryHours} />h
            </div>
          </div>
          <p className="text-xs text-white/50 mt-4">Extra focus work needed</p>
        </div>
      </section>

      {/* Interactive Gantt / Timeline Comparative Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Timeline Comparison (7 Columns) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Shifted Timeline Gantt Visualization */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Timeline Visualization</h3>
                <p className="text-xs text-white/50">Impact of scheduling shifting on deliverable phases</p>
              </div>
              <div className="flex gap-4 text-xs font-bold">
                <span className="flex items-center gap-1 text-purple-300">
                  <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30 inline-block"></span>
                  Current Plan
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30 inline-block"></span>
                  Delayed Plan
                </span>
              </div>
            </div>

            {/* Gantt Bar rows */}
            <div className="space-y-4 py-2">
              {phases.map((row) => {
                const totalSpan = 8 + delayScenario;
                const startX = `${(row.startOffset / totalSpan) * 100}%`;
                const widthVal = `${(row.length / totalSpan) * 100}%`;
                
                const delayedStartX = `${((row.startOffset + delayScenario) / totalSpan) * 100}%`;
                const delayedWidthVal = `${(row.length / totalSpan) * 100}%`;

                return (
                  <div key={row.phase} className="grid grid-cols-12 items-center gap-4 text-xs font-bold">
                    <div className="col-span-3 text-white/70 truncate">{row.phase}</div>
                    <div className="col-span-9 space-y-2.5 relative">
                      {/* Current Plan Bar */}
                      <div className="h-5 w-full bg-white/5 rounded-lg relative overflow-hidden">
                        <div 
                          className="absolute h-full rounded bg-gradient-to-r from-purple-500/20 to-purple-500/40 border border-purple-500/30 transition-all duration-500 shadow-inner"
                          style={{ left: startX, width: widthVal }}
                        />
                      </div>
                      {/* Delayed Plan Bar */}
                      <div className="h-5 w-full bg-white/5 rounded-lg relative overflow-hidden">
                        <div 
                          className="absolute h-full rounded bg-gradient-to-r from-red-600/20 to-red-400/40 border border-red-500/30 transition-all duration-500 shadow-inner"
                          style={{ left: delayedStartX, width: delayedWidthVal }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparative analysis Card block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Start Today (Comparative Card Before) */}
            <div className="p-5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-300 shadow-xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Before</span>
              <h3 className="text-base font-extrabold text-white">Start today</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Your success stays at <strong className="text-emerald-400"><AnimatedNumber value={currentSuccessRate} />%</strong>, all tasks land before the final pitch walkthrough, and your weekend remains completely stress-free and manageable.
              </p>
            </div>

            {/* Delayed Scenario (Comparative Card After + Impact Summary) */}
            <div className="p-5 rounded-xl border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 transition-all duration-300 shadow-xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">After</span>
              <h3 className="text-base font-extrabold text-white">Delay by {delayScenario} day(s)</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Success drops to <strong className="text-rose-400"><AnimatedNumber value={activePrediction.successProbability} />%</strong>, total schedule stress raises <strong className="text-rose-400"><AnimatedNumber value={activePrediction.stressIncrease} />%</strong>, and <strong className="text-rose-400"><AnimatedNumber value={activePrediction.recoveryHours} /></strong> recovery hours are required to regain momentum.
              </p>

              {/* Dynamic Impact Summary */}
              <div className="mt-4 pt-4 border-t border-rose-500/10 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 mb-2">Impact Summary</div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Missed Milestones</span>
                  <span className="text-rose-400 font-bold"><AnimatedNumber value={missedMilestones} /></span>
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Deadline Conflicts</span>
                  <span className="text-rose-400 font-bold"><AnimatedNumber value={deadlineConflicts} /></span>
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Extra Work Hours</span>
                  <span className="text-rose-400 font-bold">+<AnimatedNumber value={extraWorkHours} />h</span>
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Stress Increase</span>
                  <span className="text-rose-400 font-bold">+<AnimatedNumber value={activePrediction.stressIncrease} />%</span>
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Lost Focus Hours</span>
                  <span className="text-rose-400 font-bold"><AnimatedNumber value={lostFocusHours} />h</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: AI Warning Panel & Adaptive Recovery Plan (5 Columns) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Gauge Risk Meter */}
          {renderRiskMeter(activePrediction.riskValue)}

          {/* Animated prediction warning card */}
          <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full filter blur-xl" />
            <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Future You Simulator Insights
            </h3>
            <p className={`text-xs leading-relaxed text-purple-100 transition-opacity duration-300 ${loading ? "opacity-40" : "opacity-100"}`}>
              {activePrediction.predictionText}
            </p>
          </div>

          {/* Adaptive Recovery Plan (Specific to selection) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-extrabold text-white mb-4">Adaptive Recovery Plan</h3>
            
            {customRecoveryPlan ? (
              <div className="space-y-4 animate-fade-in text-xs">
                {/* Highest Priority Items */}
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1">
                  <h4 className="font-extrabold text-red-400 uppercase tracking-wider mb-2">⚠️ Highest Priority Items</h4>
                  <ul className="space-y-1 text-white/80 list-disc list-inside">
                    {customRecoveryPlan.highestPriorityItems?.map((item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Reordered Tasks */}
                <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1">
                  <h4 className="font-extrabold text-purple-300 uppercase tracking-wider mb-2">⚡ Reordered Tasks (AI Plan)</h4>
                  <ul className="space-y-1 text-white/80 list-disc list-inside">
                    {customRecoveryPlan.reorderedTasks?.map((item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Deep Work Blocks */}
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1">
                  <h4 className="font-extrabold text-indigo-300 uppercase tracking-wider mb-2">🧠 Suggested Deep Work Blocks</h4>
                  <ul className="space-y-1 text-white/80 list-disc list-inside">
                    {customRecoveryPlan.deepWorkBlocks?.map((item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Recovery Schedule */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1">
                  <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider mb-2">📅 Recovery Schedule</h4>
                  <ul className="space-y-1 text-white/80 list-disc list-inside">
                    {customRecoveryPlan.recoverySchedule?.map((item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleGenerateRecoveryPlan}
                  disabled={loadingPlan}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-white/15 transition-all duration-150 cursor-pointer text-center"
                >
                  {loadingPlan ? "Re-generating..." : "Generate New Plan"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activePrediction.recoveryPlan.map((step, idx) => (
                  <div key={idx} className="flex gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 mt-1.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">{step.title}</h4>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleGenerateRecoveryPlan}
                  disabled={loadingPlan}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-[10px] font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadingPlan ? "Analyzing Workload..." : "Generate Recovery Plan"}
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
