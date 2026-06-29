import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Shield, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Sparkles,
  ChevronRight,
  BatteryCharging,
  Briefcase,
  Zap,
  CheckCircle,
  HelpCircle,
  Award
} from "lucide-react";
import { Task, DashboardStats, ProductivityInsight } from "../types";

interface DashboardProps {
  tasks: Task[];
  stats: DashboardStats | null;
  onNavigate: (tab: string) => void;
  onCompleteTask: (id: number) => void;
}

export default function Dashboard({ tasks, stats, onNavigate, onCompleteTask }: DashboardProps) {
  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchInsightsWithRetry(retriesLeft = 3, delayMs = 1500) {
      try {
        if (retriesLeft === 3 && active) {
          setLoadingInsights(true);
        }
        const res = await fetch("/api/insights");
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setInsights(data);
            setLoadingInsights(false);
          }
        } else {
          throw new Error(`Status ${res.status}`);
        }
      } catch (err: any) {
        if (!active) return;
        if (retriesLeft > 0) {
          console.warn(`Failed to fetch insights (${err.message || err}). Retrying in ${delayMs}ms...`);
          setTimeout(() => {
            if (active) {
              fetchInsightsWithRetry(retriesLeft - 1, delayMs * 1.5);
            }
          }, delayMs);
        } else {
          console.error("Error fetching productivity insights:", err);
          if (active) {
            setLoadingInsights(false);
          }
        }
      }
    }
    fetchInsightsWithRetry();
    return () => {
      active = false;
    };
  }, [tasks]);

  // Fallback insights if server fails or is empty
  const defaultInsights = [
    {
      title: "Daily Action Plan",
      text: "Polish the hackathon MVP demo first, record your walkthrough second, and reserve the pitch deck polish for your peak focus window."
    },
    {
      title: "Focus Predictor",
      text: "You are statistically most productive between 2 PM and 5 PM. Schedule your hardest development tasks during this window."
    },
    {
      title: "Burnout Detector",
      text: "Energy score is 68% while workload score is 82%. Take one 15-minute device-free walk before taking on more scope."
    },
    {
      title: "Smart Priority Check",
      text: "Two high-risk tasks share identical close deadlines. Splitting one into smaller 45-minute milestones lowers total timeline risk by 14%."
    }
  ];

  const activeInsights = insights.length > 0 ? insights : defaultInsights;

  // Helper to determine risk badges
  const getRiskBadgeColor = (priority: string, daysLeft: number) => {
    if (daysLeft < 0 || priority === "Critical") return "bg-red-500/10 border-red-500/30 text-red-400";
    if (priority === "High" || daysLeft <= 1) return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  };

  // Calculate days left helper
  const getDaysLeft = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getRiskLabel = (priority: string, daysLeft: number, effort: any) => {
    const safeEffort = typeof effort === "number" && !isNaN(effort) ? effort : (parseFloat(effort) || 0);
    const priorityWeight = { Low: 12, Medium: 28, High: 45, Critical: 58 }[priority] || 28;
    const deadlinePressure = Math.max(0, 44 - (daysLeft * 9));
    const workloadPressure = Math.min(28, safeEffort * 4.5);
    const overduePressure = daysLeft < 0 ? 20 : 0;
    const score = Math.max(4, Math.min(98, priorityWeight + deadlinePressure + workloadPressure + overduePressure));
    
    if (score >= 74) return { label: "High", score };
    if (score >= 44) return { label: "Medium", score };
    return { label: "Low", score };
  };

  // Top tasks sorting by calculated risk score descending
  const sortedTopTasks = [...tasks]
    .filter(t => t.status !== "Completed")
    .map(t => {
      const days = getDaysLeft(t.deadline);
      const risk = getRiskLabel(t.priority, days, t.effort);
      return { ...t, daysLeft: days, riskLabel: risk.label, riskScore: risk.score };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/30 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-indigo-900/20 rounded-full filter blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-purple-300 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Executive Dashboard
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
            Every deadline, risk, and <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">focus window</span> in one command center.
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-3xl">
            TimeHero AI turns last-minute chaos into a clear daily action plan, powered by real-time SQLite analytics and smart Gemini predictions.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Deadline Risk Engine
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Focus Predictor
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Burnout Detector
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Success Probability
            </span>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="kpi-grid">
        {/* Productivity Score */}
        <div 
          className="relative overflow-hidden rounded-[24px] p-6 shadow-xl backdrop-blur-[18px] transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(168,85,247,0.18)] flex flex-col justify-center text-center border group"
          style={{ 
            backgroundColor: 'rgba(20, 20, 28, 0.82)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            paddingTop: '28px',
            paddingBottom: '22px',
            paddingLeft: '24px',
            paddingRight: '24px'
          }}
        >
          {/* Badge */}
          <div className="flex justify-center" style={{ marginBottom: '24px' }}>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)] backdrop-blur-md">
              +8 this week
            </span>
          </div>

          {/* Section Title */}
          <div style={{ marginBottom: '22px' }}>
            <span className="text-[14px] font-bold uppercase tracking-widest text-white/40 leading-none block">
              Productivity
            </span>
          </div>

          {/* Large KPI Value */}
          <div style={{ marginBottom: '18px' }}>
            <span className="text-[56px] font-black text-white tracking-tight leading-none">
              {stats ? stats.productivityScore : 83}
              <span className="text-xl font-medium text-white/40">/100</span>
            </span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <p className="text-[18px] font-medium text-white/50 leading-tight">
              High-output momentum
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats ? stats.productivityScore : 83}%` }} 
            />
          </div>
        </div>

        {/* Deadline Health */}
        <div 
          className="relative overflow-hidden rounded-[24px] p-6 shadow-xl backdrop-blur-[18px] transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(59,130,246,0.18)] flex flex-col justify-center text-center border group"
          style={{ 
            backgroundColor: 'rgba(20, 20, 28, 0.82)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            paddingTop: '28px',
            paddingBottom: '22px',
            paddingLeft: '24px',
            paddingRight: '24px'
          }}
        >
          {/* Badge */}
          <div className="flex justify-center" style={{ marginBottom: '24px' }}>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)] backdrop-blur-md">
              Stable
            </span>
          </div>

          {/* Section Title */}
          <div style={{ marginBottom: '22px' }}>
            <span className="text-[14px] font-bold uppercase tracking-widest text-white/40 leading-none block">
              Deadline Health
            </span>
          </div>

          {/* Large KPI Value */}
          <div style={{ marginBottom: '18px' }}>
            <span className="text-[56px] font-black text-white tracking-tight leading-none">
              {stats ? stats.deadlineHealth : 74}
              <span className="text-xl font-medium text-white/40">%</span>
            </span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <p className="text-[18px] font-medium text-white/50 leading-tight">
              Buffer remaining
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats ? stats.deadlineHealth : 74}%` }} 
            />
          </div>
        </div>

        {/* Focus Hours */}
        <div 
          className="relative overflow-hidden rounded-[24px] p-6 shadow-xl backdrop-blur-[18px] transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(168,85,247,0.18)] flex flex-col justify-center text-center border group"
          style={{ 
            backgroundColor: 'rgba(20, 20, 28, 0.82)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            paddingTop: '28px',
            paddingBottom: '22px',
            paddingLeft: '24px',
            paddingRight: '24px'
          }}
        >
          {/* Badge */}
          <div className="flex justify-center" style={{ marginBottom: '24px' }}>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.15)] backdrop-blur-md">
              2 PM Peak
            </span>
          </div>

          {/* Section Title */}
          <div style={{ marginBottom: '22px' }}>
            <span className="text-[14px] font-bold uppercase tracking-widest text-white/40 leading-none block">
              Focus Hours
            </span>
          </div>

          {/* Large KPI Value */}
          <div style={{ marginBottom: '18px' }}>
            <span className="text-[56px] font-black text-white tracking-tight leading-none">
              {stats ? stats.focusHours : 4.8}
              <span className="text-xl font-medium text-white/40">h</span>
            </span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <p className="text-[18px] font-medium text-white/50 leading-tight">
              Deep work booked
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, ((stats ? stats.focusHours : 4.8) / 8) * 100)}%` }} 
            />
          </div>
        </div>

        {/* Risk Score */}
        <div 
          className="relative overflow-hidden rounded-[24px] p-6 shadow-xl backdrop-blur-[18px] transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(245,158,11,0.18)] flex flex-col justify-center text-center border group"
          style={{ 
            backgroundColor: 'rgba(20, 20, 28, 0.82)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            paddingTop: '28px',
            paddingBottom: '22px',
            paddingLeft: '24px',
            paddingRight: '24px'
          }}
        >
          {/* Badge */}
          <div className="flex justify-center" style={{ marginBottom: '24px' }}>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] backdrop-blur-md">
              Needs action
            </span>
          </div>

          {/* Section Title */}
          <div style={{ marginBottom: '22px' }}>
            <span className="text-[14px] font-bold uppercase tracking-widest text-white/40 leading-none block">
              Risk Score
            </span>
          </div>

          {/* Large KPI Value */}
          <div style={{ marginBottom: '18px' }}>
            <span className="text-[56px] font-black text-white tracking-tight leading-none">
              {stats ? stats.avgRisk : 26}
              <span className="text-xl font-medium text-white/40">%</span>
            </span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <p className="text-[18px] font-medium text-white/50 leading-tight">
              Average workload risk
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats ? stats.avgRisk : 26}%` }} 
            />
          </div>
        </div>

        {/* Tasks Due Today */}
        <div 
          className="relative overflow-hidden rounded-[24px] p-6 shadow-xl backdrop-blur-[18px] transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(239,68,68,0.18)] flex flex-col justify-center text-center border group"
          style={{ 
            backgroundColor: 'rgba(20, 20, 28, 0.82)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            paddingTop: '28px',
            paddingBottom: '22px',
            paddingLeft: '24px',
            paddingRight: '24px'
          }}
        >
          {/* Badge */}
          <div className="flex justify-center" style={{ marginBottom: '24px' }}>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)] backdrop-blur-md">
              Now
            </span>
          </div>

          {/* Section Title */}
          <div style={{ marginBottom: '22px' }}>
            <span className="text-[14px] font-bold uppercase tracking-widest text-white/40 leading-none block">
              Due Today
            </span>
          </div>

          {/* Large KPI Value */}
          <div style={{ marginBottom: '18px' }}>
            <span className="text-[56px] font-black text-white tracking-tight leading-none">
              {stats ? stats.dueToday : 2}
            </span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <p className="text-[18px] font-medium text-white/50 leading-tight">
              Critical items left
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
            <div 
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (stats ? stats.dueToday : 2) * 20)}%` }} 
            />
          </div>
        </div>
      </section>

      {/* Main Grid: Visualizations & Lists */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Custom Charts (Desktop 7 Columns) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Weekly Productivity Custom Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Weekly Productivity Graph</h3>
                <p className="text-xs text-white/50">Correlation of tasks completed vs. cognitive score</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-white/60">
                  <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40 block"></span>
                  Completed Tasks
                </div>
                <div className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-3 h-3 rounded-full bg-purple-500 block"></span>
                  Productivity Score
                </div>
              </div>
            </div>

            {/* Custom SVG Spline + Bar Combined Visualizer */}
            <div className="relative h-60 w-full flex flex-col justify-between mt-4">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 grid grid-rows-4 pointer-events-none z-0">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-b border-white/5 w-full h-full" />
                ))}
              </div>
              
              {/* Responsive SVG Chart */}
              <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 700 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* Bars (Completed Tasks) */}
                {[
                  { count: 4, y: 164, height: 56 },
                  { count: 5, y: 150, height: 70 },
                  { count: 5, y: 150, height: 70 },
                  { count: 7, y: 122, height: 98 },
                  { count: 8, y: 108, height: 112 },
                  { count: 3, y: 178, height: 42 },
                  { count: 6, y: 136, height: 84 },
                ].map((item, idx) => (
                  <rect
                    key={idx}
                    x={100 * idx + 50 - 15}
                    y={item.y}
                    width={30}
                    height={item.height}
                    rx={4}
                    fill="url(#barGlow)"
                    stroke="#3B82F6"
                    strokeWidth={1}
                    strokeOpacity={0.3}
                  />
                ))}

                {/* Fill under spline curve */}
                <path
                  d="M 50,220 L 50,104.8 C 100,104.8 100,95.2 150,95.2 C 200,95.2 200,90.4 250,90.4 C 300,90.4 300,82.4 350,82.4 C 400,82.4 400,79.2 450,79.2 C 500,79.2 500,98.4 550,98.4 C 600,98.4 600,87.2 650,87.2 L 650,220 Z"
                  fill="url(#purpleGlow)"
                />

                {/* Spline line curve */}
                <path
                  d="M 50,104.8 C 100,104.8 100,95.2 150,95.2 C 200,95.2 200,90.4 250,90.4 C 300,90.4 300,82.4 350,82.4 C 400,82.4 400,79.2 450,79.2 C 500,79.2 500,98.4 550,98.4 C 600,98.4 600,87.2 650,87.2"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Spline Anchor Dots */}
                {[104.8, 95.2, 90.4, 82.4, 79.2, 98.4, 87.2].map((yVal, idx) => (
                  <circle
                    key={idx}
                    cx={100 * idx + 50}
                    cy={yVal}
                    r={5}
                    fill="#A855F7"
                    stroke="#050505"
                    strokeWidth={2}
                    className="transition-all duration-300 hover:r-7 cursor-pointer"
                  />
                ))}
              </svg>

              {/* Responsive HTML transparent overlay for hovers, tooltips and labels */}
              <div className="absolute inset-x-0 top-0 bottom-10 z-20 flex">
                {[
                  { day: "Mon", count: 4, score: 72 },
                  { day: "Tue", count: 5, score: 78 },
                  { day: "Wed", count: 5, score: 81 },
                  { day: "Thu", count: 7, score: 86 },
                  { day: "Fri", count: 8, score: 88 },
                  { day: "Sat", count: 3, score: 76 },
                  { day: "Sun", count: 6, score: 83 },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 group relative h-full flex items-end justify-center">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-slate-950 border border-slate-800 text-[10px] text-white rounded p-1.5 pointer-events-none z-30 transition-all duration-300 flex flex-col gap-0.5 whitespace-nowrap shadow-xl">
                      <span className="font-bold">{item.day} Productivity</span>
                      <span>Tasks Completed: <strong className="text-blue-300">{item.count}</strong></span>
                      <span>Productivity Score: <strong className="text-purple-300">{item.score}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Day Labels at the bottom of each column */}
              <div className="absolute bottom-1 inset-x-0 z-20 flex">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="flex-1 text-center">
                    <span className="text-[11px] font-semibold text-slate-400">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deadline Risk Heatmap Matrix */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">Deadline Risk Heatmap</h3>
              <p className="text-xs text-white/50">Daily dynamic projection mapping scheduling collision & effort load</p>
            </div>

            {/* Matrix Bento Grid */}
            <div className="space-y-2 mt-4">
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-white/40 pb-1">
                <div>Deliverables</div>
                <div>Today</div>
                <div>Tomorrow</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
                <div>Mon</div>
              </div>

              {[
                { task: "MVP Demo", risks: [88, 72, 60, 46, 33, 25] },
                { task: "Pitch Deck", risks: [76, 68, 55, 42, 30, 18] },
                { task: "Walkthrough", risks: [64, 59, 52, 45, 34, 24] },
                { task: "Mobile QA", risks: [45, 50, 62, 72, 66, 54] },
                { task: "Deploy Plan", risks: [30, 36, 44, 55, 68, 80] },
              ].map((row, rIdx) => (
                <div key={row.task} className="grid grid-cols-7 gap-2 items-center">
                  <div className="text-xs font-bold text-white text-left truncate">{row.task}</div>
                  {row.risks.map((val, cIdx) => {
                    let color = "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
                    if (val >= 74) color = "bg-red-500/20 text-red-300 border border-red-500/30 shadow-inner";
                    else if (val >= 44) color = "bg-amber-500/15 text-amber-300 border border-amber-500/25";
                    return (
                      <div 
                        key={cIdx} 
                        className={`h-11 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 hover:scale-105 cursor-default relative group ${color}`}
                      >
                        {val}%
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-slate-950 text-[9px] text-white rounded px-1.5 py-0.5 pointer-events-none z-30 transition-all duration-300 whitespace-nowrap border border-white/10">
                          {val}% Scheduling Stress
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Dynamic Lists (Desktop 5 Columns) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Gemini AI Generated Insights Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-900/20 rounded-full filter blur-[60px]" />
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">AI-Generated Insights</h3>
            </div>

            {loadingInsights ? (
              <div className="space-y-4 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10 mt-1.5 shrink-0" />
                    <div className="space-y-1.5 w-full">
                      <div className="h-3.5 bg-white/10 rounded w-1/3" />
                      <div className="h-3 bg-white/5 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {activeInsights.map((insight, idx) => (
                  <div key={idx} className="flex gap-3.5 bg-white/5 hover:bg-white/10 p-3.5 rounded-xl border border-white/10 transition-all duration-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 mt-1.5 shrink-0 shadow-md shadow-indigo-400/35" />
                    <div>
                      <h4 className="text-sm font-extrabold text-white leading-snug">{insight.title}</h4>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{insight.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deadline Risk Engine (Sorted Live SQLite Data) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-white">Deadline Risk Engine</h3>
              </div>
              <button 
                onClick={() => onNavigate("Task Pipeline")}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {sortedTopTasks.length === 0 ? (
                <div className="text-center py-6 text-xs text-white/40">
                  No active tasks. Add a task to analyze deadline risk!
                </div>
              ) : (
                sortedTopTasks.map((t) => (
                  <div 
                    key={t.id} 
                    className="flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-white leading-normal group-hover:text-purple-300 transition-colors">
                          {t.task}
                        </h4>
                        <span className="text-[10px] text-white/50 font-semibold mt-1 block">
                          {t.category} • {t.daysLeft === 0 ? "Today" : t.daysLeft < 0 ? `${Math.abs(t.daysLeft)} days overdue` : `${t.daysLeft} days left`} • {t.progress}% complete
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getRiskBadgeColor(t.priority, t.daysLeft)}`}>
                        {t.riskLabel} Risk
                      </span>
                    </div>

                    {/* Compact Process bar + Quick complete */}
                    <div className="flex items-center gap-4">
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden shrink">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                      <button 
                        onClick={() => t.id && onCompleteTask(t.id)}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-white/10 text-white/70 hover:text-white whitespace-nowrap transition-all duration-150"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WOW Signals (Burnout Detector / Energy Predictor Cards) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-5">WOW Signals</h3>
            
            <div className="grid grid-cols-2 gap-4">
              
              {/* Energy Score */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
                  <BatteryCharging className="w-4 h-4 text-emerald-400" />
                  Energy Score
                </div>
                <div className="text-2xl font-black text-white">68%</div>
                <p className="text-[11px] text-white/50 mt-1 leading-normal">
                  Sustainable if you protect breaks
                </p>
              </div>

              {/* Workload Score */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  Workload Score
                </div>
                <div className="text-2xl font-black text-white">82%</div>
                <p className="text-[11px] text-white/50 mt-1 leading-normal">
                  Heavy, but manageable via sequencing
                </p>
              </div>

              {/* Success Probability */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Success Ratio
                </div>
                <div className="text-2xl font-black text-white">83%</div>
                <p className="text-[11px] text-white/50 mt-1 leading-normal">
                  Strong if primary task starts now
                </p>
              </div>

              {/* Best Work Hours */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Peak Hours
                </div>
                <div className="text-2xl font-black text-white">2 - 5 PM</div>
                <p className="text-[11px] text-white/50 mt-1 leading-normal">
                  Best focus window for complex tasks
                </p>
              </div>

            </div>
          </div>

          {/* Gamified Achievements & Badges Panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full filter blur-[60px]" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Achievements & Badges</h3>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">
                Live Gamified System
              </span>
            </div>

            <div className="space-y-3">
              {(() => {
                const completedCount = tasks.filter(t => t.status === "Completed").length;
                const highProd = stats && stats.productivityScore >= 80;
                const focusHours = stats && stats.focusHours >= 4.0;
                const safeRisk = stats && stats.avgRisk <= 35;

                const list = [
                  {
                    title: "Deadline Crusher",
                    desc: "Complete 1 active task",
                    icon: "🏆",
                    unlocked: completedCount >= 1,
                    unlockedStyle: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-200",
                    lockedStyle: "from-white/5 to-white/5 border-white/5 text-white/30"
                  },
                  {
                    title: "Momentum King",
                    desc: "Reach 80% productivity score",
                    icon: "⚡",
                    unlocked: !!highProd,
                    unlockedStyle: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-200",
                    lockedStyle: "from-white/5 to-white/5 border-white/5 text-white/30"
                  },
                  {
                    title: "Deep Focus Master",
                    desc: "Log 4.0 focus hours",
                    icon: "🎯",
                    unlocked: !!focusHours,
                    unlockedStyle: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-200",
                    lockedStyle: "from-white/5 to-white/5 border-white/5 text-white/30"
                  },
                  {
                    title: "Risk Navigator",
                    desc: "Lower average risk below 35%",
                    icon: "🛡️",
                    unlocked: !!safeRisk,
                    unlockedStyle: "from-blue-500/20 to-sky-500/10 border-blue-500/30 text-blue-200",
                    lockedStyle: "from-white/5 to-white/5 border-white/5 text-white/30"
                  }
                ];

                return list.map((b, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3.5 rounded-xl border bg-gradient-to-r transition-all duration-300 ${
                      b.unlocked ? b.unlockedStyle : b.lockedStyle
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl shrink-0">{b.unlocked ? b.icon : "🔒"}</span>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-none">{b.title}</h4>
                        <p className="text-[10px] text-white/50 leading-tight mt-1">{b.desc}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        b.unlocked ? "bg-white/10 border-white/15 text-white" : "bg-white/5 border-white/5 text-white/30"
                      }`}>
                        {b.unlocked ? "Earned" : "Locked"}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>

      </section>
    </div>
  );
}
