import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import FutureSimulator from "./components/FutureSimulator";
import AIPlanner from "./components/AIPlanner";
import AICoach from "./components/AICoach";
import AddTask from "./components/AddTask";
import MyTasks from "./components/MyTasks";
import TaskPipeline from "./components/TaskPipeline";
import AuthPage from "./components/AuthPage";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import TopActionBar from "./components/TopActionBar";
import IntelligenceHub from "./components/IntelligenceHub";
import CalendarView from "./components/CalendarView";
import VoiceAssistant from "./components/VoiceAssistant";
import VoiceHistory from "./components/VoiceHistory";
import ExportCenter from "./components/ExportCenter";
import DatabaseRecoveryCenter from "./components/DatabaseRecoveryCenter";
import { Task, DashboardStats } from "./types";
import { 
  LayoutDashboard, 
  Hourglass, 
  CalendarCheck, 
  Sparkles, 
  PlusCircle, 
  ListTodo,
  CheckCircle,
  XCircle,
  Info,
  Calendar
} from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "info" | "warning";
}

interface UserSession {
  user_id: string;
  name: string;
  email: string;
  isGuest: boolean;
  token?: string;
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    const user_id = localStorage.getItem("user_id");
    const name = localStorage.getItem("name");
    const email = localStorage.getItem("email");
    const isGuestStr = localStorage.getItem("isGuest");
    const token = localStorage.getItem("token");
    
    if (user_id && name && email) {
      return {
        user_id,
        name,
        email,
        isGuest: isGuestStr === "true",
        token: token || undefined,
      };
    }
    return null;
  });

  const [authState, setAuthState] = useState<"auth" | "forgot" | "reset">(() => {
    if (window.location.pathname === "/reset-password") {
      return "reset";
    }
    return "auth";
  });

  const [resetToken, setResetToken] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  });

  const [currentTab, setCurrentTab] = useState("Dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const checkDbStatus = async () => {
    try {
      const res = await fetch("/api/recovery/status");
      if (res.ok) {
        const data = await res.json();
        setIsRecoveryMode(!!data.isRecoveryMode);
      }
    } catch (err) {
      console.error("Failed to fetch database status:", err);
    }
  };

  useEffect(() => {
    checkDbStatus();
    const interval = setInterval(checkDbStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle logout trigger from global fetch interceptor
  useEffect(() => {
    const handleLogoutTrigger = () => {
      setSession(null);
      showToast("Session expired. Please log in again.", "warning");
    };
    window.addEventListener("timehero-logout", handleLogoutTrigger);
    return () => window.removeEventListener("timehero-logout", handleLogoutTrigger);
  }, []);

  const handleAuthSuccess = (sessionData: UserSession) => {
    localStorage.setItem("user_id", sessionData.user_id);
    localStorage.setItem("name", sessionData.name);
    localStorage.setItem("email", sessionData.email);
    localStorage.setItem("isGuest", String(sessionData.isGuest));
    if (sessionData.token) {
      localStorage.setItem("token", sessionData.token);
    }
    if (sessionData.isGuest) {
      localStorage.setItem("guest_session", "guest_session_" + Date.now());
    }
    setSession(sessionData);
    showToast(`Welcome, ${sessionData.name}!`, "success");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error logging out from server:", err);
    }
    localStorage.removeItem("user_id");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("isGuest");
    localStorage.removeItem("token");
    localStorage.removeItem("guest_session");
    setSession(null);
    setTasks([]);
    setStats(null);
    setCurrentTab("Dashboard");
    showToast("Logged out successfully.", "info");
  };
  
  // Daily Streak gamification state loaded from localStorage
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem("timehero_streak");
    return saved ? parseInt(saved, 10) : 5; // Default streak
  });

  // Global Toast list state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Register a window-level event listener to allow child components to trigger premium toasts effortlessly
  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail && e.detail.message) {
        showToast(e.detail.message, e.detail.type || "success");
      }
    };
    window.addEventListener("timehero-toast" as any, handleToastEvent);
    return () => window.removeEventListener("timehero-toast" as any, handleToastEvent);
  }, []);

  const fetchTasksAndStats = async () => {
    try {
      setLoading(true);
      const [tasksRes, statsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/statistics")
      ]);

      if (tasksRes.ok && statsRes.ok) {
        const tasksData = await tasksRes.json();
        const statsData = await statsRes.json();
        setTasks(tasksData);
        setStats(statsData);
      }
    } catch (err) {
      console.error("Error loading application states:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndStats();
  }, [session]);

  // Quick action complete handler with interactive streak multiplier celebration
  const handleCompleteTask = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: "POST"
      });
      if (res.ok) {
        // Increment streak gamification
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem("timehero_streak", String(newStreak));

        // Find completed task name
        const targetTask = tasks.find((t) => t.id === id);
        const taskName = targetTask ? targetTask.task : "Task";

        showToast(`🎉 Completed: "${taskName}"! Streak extended to ${newStreak} days!`, "success");
        
        await fetchTasksAndStats();
      }
    } catch (err) {
      console.error("Error completing task card:", err);
      showToast("Could not update task completion status.", "warning");
    }
  };

  // Quick action delete handler
  const handleDeleteTask = async (id: number) => {
    try {
      const targetTask = tasks.find((t) => t.id === id);
      const taskName = targetTask ? targetTask.task : "Task";

      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast(`🗑️ Safely archived task: "${taskName}"`, "info");
        await fetchTasksAndStats();
      }
    } catch (err) {
      console.error("Error deleting task card:", err);
      showToast("Could not archive task.", "warning");
    }
  };

  // Quick action update handler with optimistic UI update
  const handleUpdateTask = async (id: number, updates: Partial<Task>) => {
    const prevTasks = [...tasks];
    // Optimistic state transition
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? ({ ...t, ...updates } as Task) : t))
    );

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        showToast("✏️ Task updated successfully!", "success");
        await fetchTasksAndStats();
      } else {
        throw new Error("Failed to update task");
      }
    } catch (err) {
      console.error("Error updating task card:", err);
      showToast("Could not update task.", "warning");
      // Rollback on error
      setTasks(prevTasks);
    }
  };

  const handleTaskAdded = async () => {
    showToast("🚀 Task added successfully! Gemini is synthesizing your roadmap...", "success");
    await fetchTasksAndStats();
    // Navigate to Pipeline to view newly added task card
    setCurrentTab("Task Pipeline");
  };

  const handleAddTaskSilent = async (newTaskData: Omit<Task, "id" | "userId">) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTaskData)
      });
      if (res.ok) {
        showToast("🚀 Task created successfully!", "success");
        await fetchTasksAndStats();
      } else {
        throw new Error("Failed to create task");
      }
    } catch (err) {
      console.error(err);
      showToast("Could not create task.", "warning");
    }
  };

  // Content rendering routing switch
  const renderContent = () => {
    if (loading && tasks.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] gap-6 p-6 select-none">
          <div className="relative flex flex-col items-center justify-center">
            {/* Soft ambient branding glow */}
            <div className="absolute inset-0 bg-purple-500/15 blur-3xl rounded-full scale-125 animate-pulse" />
            
            <img 
              src="/branding/logo-mark.svg" 
              alt="TimeHero AI Logo" 
              className="w-24 h-24 object-contain relative z-10"
              style={{
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="flex flex-col items-center gap-2 text-center relative z-10">
            <h2 className="text-xl font-black text-white tracking-widest uppercase">TimeHero AI</h2>
            <p className="text-xs text-purple-300/60 font-semibold tracking-wide animate-pulse">
              Loading your intelligent workspace...
            </p>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case "Dashboard":
        return (
          <Dashboard 
            tasks={tasks} 
            stats={stats} 
            onNavigate={setCurrentTab} 
            onCompleteTask={handleCompleteTask} 
          />
        );
      case "My Tasks":
        return (
          <MyTasks 
            tasks={tasks} 
            onCompleteTask={handleCompleteTask} 
            onDeleteTask={handleDeleteTask} 
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTaskSilent}
            onNavigate={setCurrentTab} 
            session={session}
            onRefresh={fetchTasksAndStats}
          />
        );
      case "Future You Simulator":
        return <FutureSimulator tasks={tasks} stats={stats} session={session} />;
      case "Calendar":
        return <CalendarView session={session} tasks={tasks} onNavigate={setCurrentTab} />;
      case "AI Planner":
        return <AIPlanner tasks={tasks} onAddTask={fetchTasksAndStats} />;
      case "AI Coach":
        return (
          <AICoach 
            tasks={tasks} 
            stats={stats} 
            session={session} 
            onLogout={handleLogout} 
            onNavigate={setCurrentTab} 
          />
        );
      case "Add Task":
        return <AddTask onTaskAdded={handleTaskAdded} />;
      case "Task Pipeline":
        return (
          <TaskPipeline 
            tasks={tasks} 
            onCompleteTask={handleCompleteTask} 
            onDeleteTask={handleDeleteTask} 
            onUpdateTask={handleUpdateTask}
            onNavigate={setCurrentTab} 
          />
        );
      case "Intelligence Hub":
        return <IntelligenceHub session={session} />;
      case "Voice History":
        return <VoiceHistory session={session} onNavigate={setCurrentTab} fetchTasksAndStats={fetchTasksAndStats} />;
      case "Export Center":
        return <ExportCenter tasks={tasks} stats={stats} session={session} />;
      default:
        return (
          <Dashboard 
            tasks={tasks} 
            stats={stats} 
            onNavigate={setCurrentTab} 
            onCompleteTask={handleCompleteTask} 
          />
        );
    }
  };

  if (isRecoveryMode) {
    return (
      <DatabaseRecoveryCenter 
        onRecoveryResolved={() => {
          setIsRecoveryMode(false);
          fetchTasksAndStats();
        }} 
      />
    );
  }

  if (!session) {
    return (
      <div className="bg-[#050505] text-[#E5EEF9] min-h-screen">
        {authState === "reset" ? (
          <ResetPassword 
            token={resetToken} 
            onBackToLogin={() => { 
              setAuthState("auth"); 
              window.history.pushState(null, "", "/"); 
            }} 
          />
        ) : authState === "forgot" ? (
          <ForgotPassword 
            onBackToLogin={() => { 
              setAuthState("auth"); 
              window.history.pushState(null, "", "/"); 
            }} 
          />
        ) : (
          <AuthPage 
            onAuthSuccess={handleAuthSuccess} 
            onForgotPassword={() => { 
              setAuthState("forgot"); 
              window.history.pushState(null, "", "/forgot-password"); 
            }} 
          />
        )}
        {/* Premium Toast Notifications Stack Overlay */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 p-4 rounded-xl border bg-slate-950/90 border-white/10 shadow-2xl backdrop-blur-xl animate-slide-up pointer-events-auto hover:border-white/20 transition-all duration-200"
            >
              {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-purple-400 shrink-0" />}
              {toast.type === "warning" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              <span className="text-xs font-bold text-white/90 leading-tight">{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-[#050505] text-[#E5EEF9] relative selection:bg-purple-500/20 selection:text-purple-300"
      style={{ 
        display: "flex", 
        flexDirection: "row", 
        height: "100vh", 
        overflow: "hidden", 
        boxSizing: "border-box" 
      }}
    >
      {/* Background Ambient cosmic blurs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>
      
      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        stats={stats ? { avgRisk: stats.avgRisk, productivityScore: stats.productivityScore } : null} 
        streak={streak}
      />

      {/* Mobile/Tablet Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#050505]/90 border-t border-white/10 backdrop-blur-xl z-50 flex items-center justify-around px-2 pb-safe shadow-2xl">
        {[
          { name: "Dashboard", icon: LayoutDashboard, label: "Home" },
          { name: "Future You", icon: Hourglass, label: "Future", target: "Future You Simulator" },
          { name: "AI Planner", icon: CalendarCheck, label: "Planner" },
          { name: "AI Coach", icon: Sparkles, label: "Coach" },
          { name: "Add Task", icon: PlusCircle, label: "Add" },
          { name: "Task Pipeline", icon: ListTodo, label: "Pipeline" },
        ].map((item) => {
          const Icon = item.icon;
          const targetTab = item.target || item.name;
          const isActive = currentTab === targetTab;
          return (
            <button
              key={item.name}
              onClick={() => setCurrentTab(targetTab)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all duration-150 ${
                isActive ? "text-purple-400 scale-105" : "text-white/40 hover:text-white/60"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-purple-400" : "text-white/40"}`} />
              <span className="truncate max-w-[50px]">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Main viewport area */}
      <main 
        className="flex-1 px-6 py-8 md:px-10 md:py-10 relative z-10 w-full pb-24 md:pb-10"
        style={{ 
          flex: "1", 
          minWidth: "0", 
          height: "100vh", 
          overflowY: "auto", 
          overflowX: "hidden", 
          scrollBehavior: "smooth",
          boxSizing: "border-box" 
        }}
      >
        <div className="max-w-7xl mx-auto w-full relative" style={{ boxSizing: "border-box" }}>
          <TopActionBar 
            title={currentTab}
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentTab}
          />
          {renderContent()}
        </div>
      </main>

      {/* Floating Microphone & Voice Assistant Modal */}
      <VoiceAssistant 
        session={session} 
        onNavigate={setCurrentTab} 
        fetchTasksAndStats={fetchTasksAndStats} 
      />

      {/* Premium Toast Notifications Stack Overlay */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 p-4 rounded-xl border bg-slate-950/90 border-white/10 shadow-2xl backdrop-blur-xl animate-slide-up pointer-events-auto hover:border-white/20 transition-all duration-200"
          >
            {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-purple-400 shrink-0" />}
            {toast.type === "warning" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            <span className="text-xs font-bold text-white/90 leading-tight">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
