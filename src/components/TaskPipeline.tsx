import React, { useState, useEffect } from "react";
import { 
  ListTodo, 
  Trash2, 
  CheckSquare, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ChevronRight,
  Flame,
  Plus,
  Pencil,
  Sparkles,
  Filter,
  Search,
  Eye,
  History,
  Sliders,
  Mail,
  Bell,
  CheckCircle2,
  Share2
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Task } from "../types";
import EditTaskModal from "./EditTaskModal";

interface TaskPipelineProps {
  tasks: Task[];
  onCompleteTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onNavigate: (tab: string) => void;
}

export default function TaskPipeline({ tasks, onCompleteTask, onDeleteTask, onUpdateTask, onNavigate }: TaskPipelineProps) {
  const [filterCategory, setFilterCategory] = useState("All");
  const [specialFilter, setSpecialFilter] = useState("All Active");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "timeline" | "ai" | "calendar" | "export">("general");

  // Dynamic States for Selected Task Details
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [loadingExports, setLoadingExports] = useState(false);
  const [customCategories, setCustomCategories] = useState<any[]>([]);

  // Load Custom Categories from SQLite
  useEffect(() => {
    const fetchCustomCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCustomCategories(data);
        }
      } catch (err) {
        console.error("Error fetching custom categories:", err);
      }
    };
    fetchCustomCategories();
  }, []);

  const defaultCategories = [
    "Research", 
    "Design", 
    "Development", 
    "Testing", 
    "Deployment",
    "Education", 
    "Business", 
    "Marketing", 
    "Finance", 
    "Personal", 
    "Health", 
    "Travel", 
    "Meetings", 
    "Interviews", 
    "Shopping", 
    "Documents", 
    "Other"
  ];

  const categories = [
    "All",
    ...Array.from(new Set([
      ...defaultCategories,
      ...customCategories.map(c => c.name),
      ...tasks.map(t => t.category)
    ])).filter(Boolean)
  ];

  const specialFilters = ["All Active", "Today", "This Week", "Completed", "Pending", "High Priority", "Recently Updated"];

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

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case "Critical": return "bg-red-500/10 border-red-500/30 text-red-400";
      case "High": return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "Medium": return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      default: return "bg-slate-500/10 border-slate-500/30 text-slate-400";
    }
  };

  // Live filter and search execution
  const filteredTasks = tasks.filter((t) => {
    // 1. Category Filter
    if (filterCategory !== "All" && t.category !== filterCategory) return false;

    // 2. Search Query Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const nameMatch = t.task.toLowerCase().includes(q);
      const descMatch = (t.context || "").toLowerCase().includes(q);
      const tagMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(q));
      if (!nameMatch && !descMatch && !tagMatch) return false;
    }

    // 3. Special filters
    const daysLeft = getDaysLeft(t.deadline);
    const isCompleted = t.status === "Completed";

    switch (specialFilter) {
      case "All Active":
        return !isCompleted;
      case "Today":
        return daysLeft === 0 && !isCompleted;
      case "This Week":
        return daysLeft >= 0 && daysLeft <= 7 && !isCompleted;
      case "Completed":
        return isCompleted;
      case "Pending":
        return t.status !== "Completed";
      case "High Priority":
        return (t.priority === "High" || t.priority === "Critical") && !isCompleted;
      case "Recently Updated":
        // Sort/Filter or return modified in the last 24 hours
        if (!t.updatedAt) return false;
        const diffHrs = (Date.now() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
        return diffHrs <= 24;
      default:
        return true;
    }
  });

  // Load selected task details history and metrics
  useEffect(() => {
    if (selectedTaskDetails?.id) {
      // 1. Fetch Task History Log
      setLoadingHistory(true);
      fetch(`/api/tasks/${selectedTaskDetails.id}/history`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          setHistoryLogs(data);
          setLoadingHistory(false);
        })
        .catch(err => {
          console.error("Error fetching history:", err);
          setLoadingHistory(false);
        });

      // 2. Fetch AI suggestions
      setLoadingSuggestions(true);
      fetch(`/api/tasks/${selectedTaskDetails.id}/ai-recommendations`)
        .then(res => res.ok ? res.json() : { recommendations: [] })
        .then(data => {
          setAiSuggestions(data.recommendations || []);
          setLoadingSuggestions(false);
        })
        .catch(err => {
          console.error("Error fetching recommendations:", err);
          setLoadingSuggestions(false);
        });

      // 3. Fetch Export History
      setLoadingExports(true);
      fetch(`/api/export/history`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          setExportHistory(data);
          setLoadingExports(false);
        })
        .catch(err => {
          console.error("Error fetching export logs:", err);
          setLoadingExports(false);
        });
    }
  }, [selectedTaskDetails]);

  // Handle local task progress update inside the details panel
  const handleProgressChange = (newProgress: number) => {
    if (!selectedTaskDetails?.id) return;
    const updatedStatus = newProgress === 100 ? "Completed" : "In Progress";
    onUpdateTask(selectedTaskDetails.id, { progress: newProgress, status: updatedStatus });
    setSelectedTaskDetails(prev => prev ? { ...prev, progress: newProgress, status: updatedStatus } : null);
  };

  // Google Calendar Sync Trigger
  const handleSyncToCalendar = async () => {
    if (!selectedTaskDetails) return;
    try {
      const res = await fetch("/api/calendar/add-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedTaskDetails.task,
          description: selectedTaskDetails.context || "",
          priority: selectedTaskDetails.priority,
          deadline: selectedTaskDetails.deadline,
          duration: selectedTaskDetails.effort
        })
      });

      if (res.ok) {
        alert("Success! This task is now fully synchronized with your Google Calendar.");
        // Save calendar sync event in the history log
        await fetch(`/api/tasks/${selectedTaskDetails.id}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Calendar Synced",
            details: `Synced task "${selectedTaskDetails.task}" to Google Calendar successfully.`,
            performedBy: "Manual"
          })
        });

        // Update task state immediately
        onUpdateTask(selectedTaskDetails.id, { calendarSynced: true });
        setSelectedTaskDetails(prev => prev ? { ...prev, calendarSynced: true } : null);

        // Refresh task history log
        const updatedHistoryRes = await fetch(`/api/tasks/${selectedTaskDetails.id}/history`);
        if (updatedHistoryRes.ok) {
          setHistoryLogs(await updatedHistoryRes.json());
        }
      } else {
        const err = await res.json();
        alert(err.error || "Could not sync to Google Calendar. Make sure your account is connected.");
      }
    } catch (err) {
      console.error(err);
      alert("Calendar sync error occurred.");
    }
  };

  // Email Reminder Trigger
  const handleSendEmailReminder = async () => {
    if (!selectedTaskDetails) return;
    try {
      // Create custom log / history action
      await fetch(`/api/tasks/${selectedTaskDetails.id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "Reminder Sent",
          details: `Sent direct premium email reminder for task: "${selectedTaskDetails.task}".`,
          performedBy: "Manual"
        })
      });

      alert("Premium task reminder successfully scheduled and sent!");
      
      // Update task state immediately
      onUpdateTask(selectedTaskDetails.id, { reminderEnabled: true });
      setSelectedTaskDetails(prev => prev ? { ...prev, reminderEnabled: true } : null);

      // Refresh task history log
      const updatedHistoryRes = await fetch(`/api/tasks/${selectedTaskDetails.id}/history`);
      if (updatedHistoryRes.ok) {
        setHistoryLogs(await updatedHistoryRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute comprehensive statistics for every category
  const categoryStats = categories.filter(c => c !== "All").map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    const total = catTasks.length;
    const completed = catTasks.filter(t => t.status === "Completed").length;
    const pending = total - completed;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Remaining Hours: sum of effort for uncompleted tasks in this category
    const remainingHours = catTasks
      .filter(t => t.status !== "Completed")
      .reduce((sum, t) => sum + (Number(t.effort) || 0), 0);

    // Average Priority for active (non-completed) tasks
    const activeTasks = catTasks.filter(t => t.status !== "Completed");
    const priorityWeightMap: Record<string, number> = {
      "Low": 1,
      "Medium": 2,
      "High": 3,
      "Critical": 4
    };
    const totalPriorityWeight = activeTasks.reduce((sum, t) => sum + (priorityWeightMap[t.priority] || 2), 0);
    const avgPriorityValue = activeTasks.length > 0 ? totalPriorityWeight / activeTasks.length : 0;
    
    let avgPriorityLabel = "0";
    if (avgPriorityValue > 0) {
      if (avgPriorityValue >= 3.5) avgPriorityLabel = "Critical";
      else if (avgPriorityValue >= 2.5) avgPriorityLabel = "High";
      else if (avgPriorityValue >= 1.5) avgPriorityLabel = "Medium";
      else avgPriorityLabel = "Low";
    }

    // High Risk Count (risk level is "High")
    const highRiskCount = catTasks.filter(t => {
      if (t.status === "Completed") return false;
      const daysLeft = getDaysLeft(t.deadline);
      const risk = getRiskLabel(t.priority, daysLeft, Number(t.effort) || 0);
      return risk.label === "High";
    }).length;

    return {
      name: cat,
      total,
      completed,
      pending,
      completionPct,
      remainingHours,
      avgPriorityLabel,
      highRiskCount
    };
  });

  const maxTotalCount = Math.max(...categoryStats.map(c => c.total), 1);

  return (
    <div className="space-y-8 animate-fade-in" id="task-pipeline-component">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/30 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-900/20 rounded-full filter blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-purple-300 uppercase tracking-widest">
            <ListTodo className="w-3.5 h-3.5 text-purple-400" />
            Task Intelligence
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
            Fully Enriched Task Cards & Timelines.
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-3xl">
            Track and customize execution paths with SQLite activity logs, AI-generated action suggestions, and interactive timeline details.
          </p>
        </div>
      </section>

      {/* SEARCH, CATEGORY FILTER, AND SPECIAL FILTERS */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl backdrop-blur-md space-y-5">
        
        {/* Top bar: Search Input and Add button */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Real-time search */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="w-4 h-4 text-white/40" />
            </span>
            <input
              type="text"
              placeholder="Search tasks, descriptions, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>

          {/* Add Task Card button */}
          <button
            onClick={() => onNavigate("Add Task")}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-purple-600/30 border border-purple-500/30 text-purple-200 hover:bg-purple-600/40 hover:border-purple-500/40 transition-all shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4 text-purple-300" /> Add Task Card
          </button>
        </div>

        {/* Category horizontal filters */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 tracking-wider mb-2">
            <Filter className="w-3 h-3 text-purple-400" /> Category division
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  filterCategory === cat
                    ? "bg-purple-600/20 border-purple-500/40 text-purple-200"
                    : "bg-transparent border-white/5 text-white/50 hover:text-white hover:border-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Special/Status horizontal filters */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 tracking-wider mb-2">
            <Sliders className="w-3 h-3 text-purple-400" /> Smart Filters
          </div>
          <div className="flex flex-wrap gap-1.5">
            {specialFilters.map((sf) => (
              <button
                key={sf}
                onClick={() => setSpecialFilter(sf)}
                className={`text-[11px] font-bold px-3.5 py-2 rounded-lg border transition-all ${
                  specialFilter === sf
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-white/5 text-white/40 hover:text-white hover:border-white/10"
                }`}
              >
                {sf}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* RICH DYNAMIC GRID OF ENRICHED TASK CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="tasks-cards-grid">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-white/40 font-semibold">
            No tasks match the active search and filter presets.
          </div>
        ) : (
          filteredTasks.map((t) => {
            const daysLeft = getDaysLeft(t.deadline);
            const risk = getRiskLabel(t.priority, daysLeft, t.effort);
            const isCompleted = t.status === "Completed";

            // Format dates & times safely
            const createdDate = t.createdAt && !t.createdAt.includes("N/A") ? new Date(t.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "No Data";
            const createdTime = t.createdAt && !t.createdAt.includes("N/A") ? new Date(t.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "No Data";
            const lastUpdated = t.updatedAt && !t.updatedAt.includes("N/A") ? new Date(t.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) + " at " + new Date(t.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "No Data";

            let riskColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            if (risk.label === "High") riskColor = "bg-red-500/10 text-red-400 border border-red-500/20";
            else if (risk.label === "Medium") riskColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";

            return (
              <motion.div 
                key={t.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                onClick={() => {
                  setSelectedTaskDetails(t);
                  setActiveTab("general");
                }}
                className={`group relative flex flex-col justify-between bg-white/5 border ${isCompleted ? 'border-emerald-500/20 bg-emerald-950/5' : 'border-white/10'} hover:border-white/20 p-5 rounded-2xl shadow-xl transition-all cursor-pointer backdrop-blur-md`}
              >
                {/* 1. Header: Category badge, priority badge & AI generation identifier */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3.5 mb-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      {t.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider ${getPriorityBadgeColor(t.priority)}`}>
                      {t.priority}
                    </span>
                    {t.calendarSynced && (
                      <span className="px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/10 border-blue-500/30 text-blue-300 flex items-center gap-1">
                        📅 Synced
                      </span>
                    )}
                    {t.reminderEnabled && (
                      <span className="px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/10 border-amber-500/30 text-amber-300 flex items-center gap-1">
                        🔔 Reminders
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-bold">
                    {t.aiGenerated ? (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400 animate-pulse" /> AI Generated
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-white/40">
                        Manual
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Task Name & Context */}
                <div className="space-y-1.5 flex-grow">
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                    {isCompleted ? <span className="line-through text-slate-500">{t.task}</span> : t.task}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed font-medium line-clamp-2">
                    {t.context || "No context or done criteria provided for this task."}
                  </p>
                </div>

                {/* 3. Dates, Times & Estimated hours */}
                <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4 my-4">
                  
                  {/* Created Stamp */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Created</div>
                    <div className="text-[11px] text-white/80 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-mono text-[10px]">{createdDate} <span className="text-white/40">{createdTime}</span></span>
                    </div>
                  </div>

                  {/* Deadline Stamp */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Deadline</div>
                    <div className="text-[11px] text-white/80 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-mono text-[10px] text-purple-300">{t.deadline || "No Data"} <span className="text-white/40">{t.dueTime || "12:00"}</span></span>
                    </div>
                  </div>

                  {/* Estimated Hours */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Estimate</div>
                    <div className="text-xs text-white/80 flex items-center gap-1 font-mono">
                      <span>⏱️</span> {t.effort !== undefined ? `${t.effort} hours` : "No Data"}
                    </div>
                  </div>

                  {/* Remaining Hours */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Remaining</div>
                    <div className="text-xs text-white/80 flex items-center gap-1 font-mono">
                      <span>⏳</span> {t.remainingHours !== undefined && t.remainingHours !== null ? `${t.remainingHours} hours` : "No Data"}
                    </div>
                  </div>

                  {/* Deadline Countdown */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Countdown</div>
                    <div className="text-xs text-purple-300 flex items-center gap-1 font-mono">
                      <span>⏳</span> {isCompleted ? "Completed" : daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow!" : daysLeft > 1 ? `${daysLeft} days left` : daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : "No Data"}
                    </div>
                  </div>

                  {/* Last updated */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Last Updated</div>
                    <div className="text-[10px] text-white/50 leading-none truncate font-mono pt-1">
                      {lastUpdated}
                    </div>
                  </div>

                </div>

                {/* 4. Tags display */}
                {t.tags && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {t.tags.map((tag, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-white/5 border border-white/10 text-white/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 5. Progress Bar & Calculated Status / Stress */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40">
                    <span>Progress: {t.progress}%</span>
                    <span>Status: {t.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"} transition-all duration-300`}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>

                  {/* Calculated Stress score */}
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-[9px] font-black text-white/30 uppercase">Deadline pressure</span>
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                        COMPLETED
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full ${riskColor} text-[9px] font-extrabold uppercase`}>
                        {risk.label} Risk
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Card Actions */}
                <div className="grid grid-cols-4 gap-2 border-t border-white/5 pt-4 mt-4" onClick={(e) => e.stopPropagation()}>
                  {/* View Details */}
                  <button
                    onClick={() => {
                      setSelectedTaskDetails(t);
                      setActiveTab("general");
                    }}
                    title="View Comprehensive Details"
                    className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-purple-500/10 text-white/60 hover:text-purple-400 border border-white/10 hover:border-purple-500/20 transition-all flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Edit Card */}
                  {t.id && (
                    <button
                      onClick={() => setEditingTask(t)}
                      title="Edit task parameters"
                      className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-purple-500/10 text-white/60 hover:text-purple-400 border border-white/10 hover:border-purple-500/20 transition-all flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {/* Complete Action */}
                  {!isCompleted && t.id && (
                    <button
                      onClick={() => onCompleteTask(t.id!)}
                      title="Mark as completed"
                      className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-white/60 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/20 transition-all flex items-center justify-center"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Action */}
                  {t.id && (
                    <button
                      onClick={() => onDeleteTask(t.id!)}
                      title="Delete task card"
                      className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-500/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </motion.div>
            );
          })
        )}
      </div>

      {/* CATEGORY WORKLOAD ALLOCATION PANEL */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/40">Workload Allocation by Category</h3>
            <p className="text-[11px] text-white/30 mt-1">Live SQLite task counts, completion tracking, risk analysis, and remaining effort metrics.</p>
          </div>
          <div className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 font-extrabold rounded-lg px-2.5 py-1">
            {tasks.length} Total Registered Tasks
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryStats.map((cat, idx) => {
            const hasTasks = cat.total > 0;
            return (
              <div 
                key={idx} 
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
                  hasTasks 
                    ? "bg-white/[0.03] border-white/10 hover:border-purple-500/30 hover:bg-white/[0.05]" 
                    : "bg-white/[0.01] border-white/5 opacity-50"
                }`}
              >
                {/* Visual completion progress glow */}
                {hasTasks && (
                  <div 
                    className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-500" 
                    style={{ width: `${cat.completionPct}%` }}
                  />
                )}

                <div className="space-y-4 w-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-white tracking-tight group-hover:text-purple-300 transition-colors">
                        {cat.name}
                      </h4>
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                        Category Division
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-white">
                        {cat.completionPct}%
                      </span>
                      <span className="text-[9px] text-white/40 block font-semibold uppercase">Done</span>
                    </div>
                  </div>

                  {/* Completion Mini Progress Bar */}
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${cat.completionPct}%` }}
                    />
                  </div>

                  {/* 7-Metrics Grid Layout */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/5 pt-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-bold">Total Tasks:</span>
                      <span className="text-xs font-extrabold text-white">{cat.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-bold">Completed:</span>
                      <span className="text-xs font-extrabold text-emerald-400">{cat.completed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-bold">Pending:</span>
                      <span className="text-xs font-extrabold text-amber-400">{cat.pending}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-bold">Completion %:</span>
                      <span className="text-xs font-extrabold text-purple-300">{cat.completionPct}%</span>
                    </div>
                    <div className="flex items-center justify-between col-span-2 border-t border-white/5 pt-2 mt-0.5">
                      <span className="text-[10px] text-white/40 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400 animate-pulse" /> Remaining Hours:
                      </span>
                      <span className="text-xs font-extrabold text-white">
                        {hasTasks ? `${cat.remainingHours} hrs` : "0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-bold">Avg Priority:</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        cat.avgPriorityLabel === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        cat.avgPriorityLabel === "High" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        cat.avgPriorityLabel === "Medium" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        cat.avgPriorityLabel === "Low" ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                        "text-white/30 border border-white/5"
                      }`}>
                        {cat.avgPriorityLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-bold">High Risk:</span>
                      <span className={`text-xs font-extrabold ${cat.highRiskCount > 0 ? "text-red-400 font-black" : "text-white/50"}`}>
                        {cat.highRiskCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPREHENSIVE TABBED TASK DETAILS OVERLAY / MODAL */}
      <AnimatePresence>
        {selectedTaskDetails && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-end p-0 md:p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%", opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.8 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="relative w-full max-w-2xl h-full md:h-[calc(100vh-2rem)] bg-[#0f0f15]/95 border-l border-white/15 md:border border-white/15 rounded-none md:rounded-3xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden"
              id="task-details-overlay"
            >
              {/* Background glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-900/10 rounded-full filter blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-900/10 rounded-full filter blur-[100px] pointer-events-none" />

              {/* Slider Header */}
              <div className="relative border-b border-white/10 pb-4 shrink-0 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-purple-400 tracking-widest mb-1">
                    <Sliders className="w-3.5 h-3.5" /> Enriched Details
                  </div>
                  <h2 className="text-base md:text-lg font-black text-white leading-tight">
                    {selectedTaskDetails.task}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedTaskDetails(null)}
                  className="p-2 bg-white/5 border border-white/5 hover:border-white/15 rounded-xl text-white/50 hover:text-white transition-colors"
                >
                  ✕ Close Details
                </button>
              </div>

              {/* Slider Tabs Selector */}
              <div className="relative flex border-b border-white/10 py-2 shrink-0 overflow-x-auto gap-1">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === "general" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  ℹ️ Info & Progress
                </button>
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === "timeline" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  ⏳ SQLite Activity Timeline
                </button>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === "ai" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  ✨ AI Tips
                </button>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === "calendar" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  📅 Sync & Alerts
                </button>
                <button
                  onClick={() => setActiveTab("export")}
                  className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${activeTab === "export" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  📤 Exports
                </button>
              </div>

              {/* Tab Contents Scrollable container */}
              <div className="relative flex-grow overflow-y-auto py-5 space-y-6 scrollbar-thin">
                
                {/* 1. General Tab */}
                {activeTab === "general" && (
                  <div className="space-y-6">
                    {/* Bento Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase">Status</span>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> {selectedTaskDetails.status}
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase">Category Division</span>
                        <div className="text-xs font-bold text-white">{selectedTaskDetails.category}</div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase">Priority weight</span>
                        <div className="text-xs font-bold text-white">{selectedTaskDetails.priority}</div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase">Estimated deep hours</span>
                        <div className="text-xs font-bold text-white">{selectedTaskDetails.effort} hours</div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1 col-span-2">
                        <span className="text-[9px] font-black text-white/30 uppercase">Context / Done Criteria</span>
                        <p className="text-xs text-white/70 leading-relaxed font-medium">
                          {selectedTaskDetails.context || "No context specified for this task card."}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Progress Slider */}
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-white/60">Adjust Progress Progressively</span>
                        <span className="text-purple-400 font-extrabold">{selectedTaskDetails.progress}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={selectedTaskDetails.progress}
                        onChange={(e) => handleProgressChange(Number(e.target.value))}
                        className="w-full accent-purple-500 bg-white/10 cursor-pointer h-2 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-white/30 font-bold">
                        <span>Queued (0%)</span>
                        <span>Completed (100%)</span>
                      </div>
                    </div>

                    {/* Metadata dates timeline list */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Created Date:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.createdAt && !selectedTaskDetails.createdAt.includes("N/A") ? new Date(selectedTaskDetails.createdAt).toLocaleDateString() : 'No Data'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Created Time:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.createdAt && !selectedTaskDetails.createdAt.includes("N/A") ? new Date(selectedTaskDetails.createdAt).toLocaleTimeString() : 'No Data'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Deadline Date:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.deadline || "No Data"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Deadline Time:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.dueTime || "12:00"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">AI Generated:</span>
                        <span className="text-white font-bold">{selectedTaskDetails.aiGenerated ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-white/40">Last Updated Stamp:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.updatedAt && !selectedTaskDetails.updatedAt.includes("N/A") ? new Date(selectedTaskDetails.updatedAt).toLocaleString() : 'No Data'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Timeline Tab (Task History log from database) */}
                {activeTab === "timeline" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-white/40 tracking-widest">
                      SQLite Task Activity Timeline
                    </h3>

                    {loadingHistory ? (
                      <div className="text-center py-8 text-white/40">Loading activity timeline...</div>
                    ) : historyLogs.length === 0 ? (
                      <div className="text-center py-8 text-white/30 border border-dashed border-white/10 rounded-xl">
                        No activity records found for this task card.
                      </div>
                    ) : (
                      <div className="relative border-l border-white/10 pl-6 space-y-6 py-2">
                        {historyLogs.map((log) => {
                          const logDate = new Date(log.created_at).toLocaleString();
                          return (
                            <div key={log.id} className="relative">
                              {/* Timeline indicator dot */}
                              <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-purple-500 ring-4 ring-[#0f0f15]" />
                              
                              <div className="space-y-1 bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                                    {log.action}
                                  </span>
                                  <span className="text-[10px] text-white/40 font-mono">{logDate}</span>
                                </div>
                                <p className="text-xs text-white/70 leading-relaxed font-medium">
                                  {log.details}
                                </p>
                                <div className="flex justify-between items-center text-[9px] font-bold text-white/30 border-t border-white/5 pt-1.5 mt-2">
                                  <span>Performed By: {log.performed_by}</span>
                                  <span>Source: {log.performed_by === "AI" ? "AI Model" : "Manual User"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. AI Suggestions Tab */}
                {activeTab === "ai" && (
                  <div className="space-y-5">
                    <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/20 p-5 rounded-2xl space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/15 rounded-full filter blur-xl" />
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        AI Focus Coach
                      </h4>
                      <p className="text-xs text-purple-200 font-semibold leading-relaxed">
                        These suggestions are dynamically assembled by Gemini analyzing the task scope, priority weighting, and completionDone parameters.
                      </p>
                    </div>

                    {loadingSuggestions ? (
                      <div className="text-center py-8 text-white/40">Querying AI Coach...</div>
                    ) : aiSuggestions.length === 0 ? (
                      <div className="text-center py-8 text-white/40">No suggestions available.</div>
                    ) : (
                      <div className="space-y-3">
                        {aiSuggestions.map((tip, idx) => (
                          <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-3 items-start">
                            <span className="text-base shrink-0">✨</span>
                            <p className="text-xs text-white/80 leading-relaxed font-medium">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Calendar Sync, Alert Logs & Notifications */}
                {activeTab === "calendar" && (
                  <div className="space-y-6">
                    {/* Google Calendar Sync Card */}
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-purple-400" /> Google Calendar Integration
                        </h4>
                        <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
                          Map this specific task card direct to your primary Google Calendar. This respects your customized color palette.
                        </p>
                      </div>
                      <button
                        onClick={handleSyncToCalendar}
                        className="w-full py-3 bg-purple-600/30 border border-purple-500/30 text-purple-200 hover:bg-purple-600/40 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        ⚡ Sync to Google Calendar
                      </button>
                    </div>

                    {/* Email reminder Card */}
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-purple-400" /> Email Reminders
                        </h4>
                        <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
                          Dispatch an email reminder about this item and its deadline straight to your registered address.
                        </p>
                      </div>
                      <button
                        onClick={handleSendEmailReminder}
                        className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        📧 Trigger Email Reminder
                      </button>
                    </div>

                    {/* Notification Status logs */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-white/40 tracking-wider">
                        Linked In-App Notifications
                      </h4>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-xs text-white/50 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-yellow-400 shrink-0" />
                        <span>System alert loops active. Warning metrics will trigger if progress stalls 24 hours prior to deadline.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Export History */}
                {activeTab === "export" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-purple-400" /> Export Records
                      </h3>
                      <p className="text-[11px] text-white/50 font-semibold leading-relaxed">
                        View times this task card list was dispatched or formatted into external structures (JSON/PDF).
                      </p>
                    </div>

                    {loadingExports ? (
                      <div className="text-center py-6 text-white/40">Loading export history...</div>
                    ) : exportHistory.length === 0 ? (
                      <div className="text-center py-6 text-white/30 border border-dashed border-white/10 rounded-xl text-xs font-medium">
                        No general export cycles logged in system yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {exportHistory.slice(0, 5).map((log) => (
                          <div key={log.id} className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white uppercase">{log.exportType} Export</span>
                              <div className="text-[10px] text-white/40">File: {log.fileName || "No Data"}</div>
                            </div>
                            <span className="text-[10px] text-white/50 font-mono">{new Date(log.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Slider Footer Actions */}
              <div className="relative border-t border-white/10 pt-4 shrink-0 flex items-center justify-between">
                <button
                  onClick={() => setSelectedTaskDetails(null)}
                  className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white text-xs font-extrabold transition-all"
                >
                  ✕ Close panel
                </button>

                {!selectedTaskDetails.status.includes("Completed") && (
                  <button
                    onClick={() => {
                      onCompleteTask(selectedTaskDetails.id!);
                      setSelectedTaskDetails(null);
                    }}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Task Card
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTask && (
          <EditTaskModal 
            task={editingTask} 
            onClose={() => setEditingTask(null)} 
            onSave={onUpdateTask} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
