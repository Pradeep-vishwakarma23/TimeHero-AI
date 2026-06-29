import React from "react";
import { 
  LayoutDashboard, 
  Hourglass, 
  CalendarCheck, 
  Sparkles, 
  PlusCircle, 
  ListTodo,
  CheckSquare,
  TrendingUp,
  Award,
  Flame,
  Bell,
  Calendar,
  Mic,
  Share2
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  stats: { avgRisk: number; productivityScore: number } | null;
  streak: number;
}

export default function Sidebar({ currentTab, setCurrentTab, stats, streak }: SidebarProps) {
  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { name: "Calendar", icon: Calendar, label: "Calendar" },
    { name: "Future You Simulator", icon: Hourglass, label: "Future You" },
    { name: "AI Planner", icon: CalendarCheck, label: "AI Planner" },
    { name: "AI Coach", icon: Sparkles, label: "AI Coach" },
    { name: "Add Task", icon: PlusCircle, label: "Add Task" },
    { name: "My Tasks", icon: CheckSquare, label: "My Tasks" },
    { name: "Task Pipeline", icon: ListTodo, label: "Pipeline" },
    { name: "Voice History", icon: Mic, label: "Voice History" },
    { name: "Intelligence Hub", icon: Bell, label: "Intelligence Hub" },
    { name: "Export Center", icon: Share2, label: "Export" },
  ];

  const successProbability = stats ? Math.max(30, stats.productivityScore) : 83;

  return (
    <aside 
      className="hidden md:flex flex-col justify-between bg-white/5 border-r border-white/10 p-6 backdrop-blur-xl animate-fade-in sidebar-scrollbar"
      style={{ 
        flex: "0 0 320px", 
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box"
      }}
    >
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <img 
            src="/branding/logo-mark.svg" 
            alt="TimeHero AI" 
            className="w-10 h-10 rounded-xl object-contain" 
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">TimeHero AI</h1>
            <p className="text-xs text-white/50 mt-1 font-medium">From Deadlines to Done</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setCurrentTab(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border text-left ${
                  isActive
                    ? "bg-white/10 border-white/10 text-purple-200 shadow-inner"
                    : "bg-transparent border-transparent hover:bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-purple-400" : "text-white/40"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Margins Footer Info (Pro / Active Plan inspired by Frosted Glass design) */}
      <div className="space-y-4">
        {/* Gamified Daily Streak Block */}
        <div className="bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between group hover:border-orange-500/30 transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">Daily Streak</h4>
              <p className="text-[10px] text-white/50 leading-tight mt-0.5">Keep shipping daily</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              {streak}d
            </span>
          </div>
        </div>

        {/* Dynamic AI Status Block */}
        <div className="bg-gradient-to-tr from-purple-900/40 to-indigo-900/40 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-purple-300 mb-2">
            <span>Live AI Signal</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-xl font-black text-white flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            {successProbability}% success
          </div>
          <p className="text-[10px] text-white/50 mt-1.5 leading-tight">
            Optimal focus window: <strong className="text-purple-300">2 PM - 5 PM</strong>.
          </p>
        </div>

        {/* Pro Plan Active Info block */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
          <Award className="w-5 h-5 text-purple-400 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">Pro Plan Active</h4>
            <p className="text-[10px] text-white/50 leading-tight mt-1">
              Predicting your next 48 hours with 94% accuracy.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
