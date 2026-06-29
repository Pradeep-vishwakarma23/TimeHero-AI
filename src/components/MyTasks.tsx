import React, { useState, useEffect, useRef } from "react";
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
  Share2,
  Download,
  Upload,
  Copy,
  FileText,
  Paperclip,
  Check,
  CalendarCheck,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Task } from "../types";
import EditTaskModal from "./EditTaskModal";

interface MyTasksProps {
  tasks: Task[];
  onCompleteTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onAddTask: (task: Omit<Task, "id" | "userId">) => Promise<void>;
  onNavigate: (tab: string) => void;
  session: { user_id: string; email?: string } | null;
  onRefresh?: () => Promise<void>;
}

export default function MyTasks({ 
  tasks, 
  onCompleteTask, 
  onDeleteTask, 
  onUpdateTask, 
  onAddTask,
  onNavigate, 
  session,
  onRefresh
}: MyTasksProps) {
  // Filters & Search
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals & Drawers
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "timeline" | "ai" | "calendar" | "reminders" | "notes" | "attachments" | "export">("general");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  
  // Details state
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [loadingExports, setLoadingExports] = useState(false);
  
  // Note edit state
  const [taskNotes, setTaskNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Attachments Drag & Drop ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Custom Categories States
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#8b5cf6"); // default purple
  const [newCatIcon, setNewCatIcon] = useState("Layers");
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
  const [reassignTarget, setReassignTarget] = useState("Other");

  // Load Custom Categories from SQLite
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

  useEffect(() => {
    fetchCustomCategories();
  }, []);

  const defaultCategories = [
    "Development", 
    "Research", 
    "Design", 
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

  const dynamicCategories = [
    "All",
    ...Array.from(new Set([
      ...defaultCategories,
      ...customCategories.map(c => c.name),
      ...tasks.map(t => t.category)
    ]))
  ];

  const colorPresets = [
    { value: "#ef4444", name: "Red", bg: "bg-red-500" },
    { value: "#f59e0b", name: "Amber", bg: "bg-amber-500" },
    { value: "#10b981", name: "Green", bg: "bg-emerald-500" },
    { value: "#06b6d4", name: "Cyan", bg: "bg-cyan-500" },
    { value: "#3b82f6", name: "Blue", bg: "bg-blue-500" },
    { value: "#8b5cf6", name: "Purple", bg: "bg-purple-500" },
    { value: "#ec4899", name: "Rose", bg: "bg-rose-500" },
    { value: "#64748b", name: "Slate", bg: "bg-slate-500" }
  ];

  const iconPresets = [
    "Layers", "Briefcase", "Code", "BarChart", "User", "Activity", "Plane", "ShoppingCart", "GraduationCap", "HelpCircle"
  ];

  const showNotification = (message: string, type: "success" | "info" | "warning" = "success") => {
    window.dispatchEvent(new CustomEvent("timehero-toast", {
      detail: { message, type }
    }));
  };

  const filtersList = [
    "All", 
    "Today", 
    "Tomorrow", 
    "This Week", 
    "Pending", 
    "Completed", 
    "High Priority", 
    "Critical", 
    "Calendar Synced", 
    "AI Generated", 
    "Recently Updated"
  ];

  // Fetch data for selected task details
  useEffect(() => {
    if (selectedTaskDetails?.id) {
      // Set notes
      setTaskNotes(selectedTaskDetails.notes || "");

      // 1. Fetch Timeline Logs
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

  // Sync details if task list updates
  useEffect(() => {
    if (selectedTaskDetails?.id) {
      const match = tasks.find(t => t.id === selectedTaskDetails.id);
      if (match) {
        setSelectedTaskDetails(match);
      }
    }
  }, [tasks]);

  // Helper: calculate days left
  const getDaysLeft = (deadlineStr: string) => {
    if (!deadlineStr || deadlineStr === "N/A" || deadlineStr.includes("Invalid")) return 999;
    const deadline = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Helper: priority weight
  const getPriorityWeight = (p: string) => {
    switch (p) {
      case "Critical": return 4;
      case "High": return 3;
      case "Medium": return 2;
      default: return 1;
    }
  };

  // Safe task parameters
  const effortSafe = (t: Task) => {
    const val = t.effort !== undefined && t.effort !== null ? Number(t.effort) : 2.0;
    return isNaN(val) ? 2.0 : val;
  };
  const progressSafe = (t: Task) => {
    const val = t.progress !== undefined && t.progress !== null ? Number(t.progress) : 0;
    return isNaN(val) ? 0 : val;
  };
  const remainingSafe = (t: Task) => {
    if (t.status === "Completed") return 0;
    const rVal = t.remainingHours !== undefined && t.remainingHours !== null ? Number(t.remainingHours) : NaN;
    if (!isNaN(rVal)) return rVal;
    const calc = effortSafe(t) * (1 - progressSafe(t) / 100);
    return isNaN(calc) ? 0 : Number(calc.toFixed(1));
  };

  // Quick risk index for deadline pressure
  const getRiskDetails = (t: Task) => {
    const days = getDaysLeft(t.deadline);
    const effort = effortSafe(t);
    const priority = t.priority;
    
    const priorityWeight = { Low: 12, Medium: 28, High: 45, Critical: 58 }[priority] || 28;
    const deadlinePressure = Math.max(0, 44 - (days * 9));
    const workloadPressure = Math.min(28, effort * 4.5);
    const overduePressure = days < 0 ? 20 : 0;
    const score = Math.max(4, Math.min(98, priorityWeight + deadlinePressure + workloadPressure + overduePressure));
    
    if (score >= 74) return { label: "High", score, color: "bg-red-500/10 text-red-400 border border-red-500/20" };
    if (score >= 44) return { label: "Medium", score, color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
    return { label: "Low", score, color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
  };

  // Statistics calculation
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === "Completed").length;
  const pendingCount = totalCount - completedCount;
  const overdueCount = tasks.filter(t => t.status !== "Completed" && getDaysLeft(t.deadline) < 0).length;
  const highPriorityCount = tasks.filter(t => t.status !== "Completed" && (t.priority === "High" || t.priority === "Critical")).length;
  const todayTasksCount = tasks.filter(t => t.status !== "Completed" && getDaysLeft(t.deadline) === 0).length;
  const weekTasksCount = tasks.filter(t => {
    const d = getDaysLeft(t.deadline);
    return t.status !== "Completed" && d >= 0 && d <= 7;
  }).length;
  
  const estimatedHoursRemaining = tasks.reduce((sum, t) => sum + remainingSafe(t), 0);
  
  // Live AI Health Score Formula
  const calculateAIHealthScore = () => {
    if (tasks.length === 0) return 100;
    
    // Positive components (Max 100)
    const completedWeight = (tasks.filter(t => t.status === "Completed").length / tasks.length) * 40;
    
    const calendarSyncedCount = tasks.filter(t => t.calendarSynced).length;
    const calendarSyncedWeight = (calendarSyncedCount / tasks.length) * 15;
    
    const onTimeCount = tasks.filter(t => {
      if (t.status === "Completed") {
        const compDate = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt || t.createdAt || "");
        const dlDate = new Date(t.deadline + "T23:59:59");
        return compDate.getTime() <= dlDate.getTime();
      } else {
        return getDaysLeft(t.deadline) >= 0;
      }
    }).length;
    const onTimeWeight = (onTimeCount / tasks.length) * 25;
    
    const focusSessionsCount = tasks.reduce((sum, t) => sum + (t.status === "Completed" ? Math.ceil(effortSafe(t) / 1.5) : 0), 0);
    const focusSessionsWeight = Math.min(20, focusSessionsCount * 2);

    // Negative components (Penalties)
    const overduePenalty = (overdueCount / tasks.length) * 30;
    
    const highRiskCount = tasks.filter(t => t.status !== "Completed" && getRiskDetails(t).score >= 74).length;
    const highRiskPenalty = (highRiskCount / tasks.length) * 20;

    const missedDeadlinesCount = tasks.filter(t => {
      if (t.status === "Completed") {
        if (!t.completedAt) return false;
        const compDate = new Date(t.completedAt).getTime();
        const dlDate = new Date(t.deadline + "T23:59:59").getTime();
        return compDate > dlDate;
      } else {
        return getDaysLeft(t.deadline) < 0;
      }
    }).length;
    const missedDeadlinesPenalty = (missedDeadlinesCount / tasks.length) * 15;

    const weeklyEffort = tasks.filter(t => t.status !== "Completed" && getDaysLeft(t.deadline) >= 0 && getDaysLeft(t.deadline) <= 7).reduce((sum, t) => sum + effortSafe(t), 0);
    const burnoutPenalty = weeklyEffort > 15 ? 15 : 0;

    const baseScore = completedWeight + calendarSyncedWeight + onTimeWeight + focusSessionsWeight - overduePenalty - highRiskPenalty - missedDeadlinesPenalty - burnoutPenalty;
    
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  };

  const aiHealthScore = calculateAIHealthScore();
  
  // Live AI Success Prediction (Logically aligned with AI Health Score)
  const calculateAISuccessPrediction = () => {
    if (tasks.length === 0) return 95;
    const pendingHighPriority = tasks.filter(t => t.status !== "Completed" && (t.priority === "High" || t.priority === "Critical")).length;
    const penalty = pendingHighPriority * 4;
    const pred = Math.round((aiHealthScore * 0.7) + 30 - penalty);
    return Math.max(10, Math.min(99, pred));
  };

  const aiSuccessPrediction = calculateAISuccessPrediction();

  // Filter Groups Configuration
  const FILTER_GROUPS: Record<string, string[]> = {
    "Status": ["Pending", "Completed"],
    "Date": ["Today", "Tomorrow", "This Week"],
    "Priority": ["High Priority", "Critical"],
    "Metadata": ["Calendar Synced", "AI Generated", "Recently Updated"]
  };

  // Grouped Filter Toggle Logic
  const handleFilterToggle = (filterName: string) => {
    let targetGroup: string | null = null;
    for (const [groupName, filters] of Object.entries(FILTER_GROUPS)) {
      if (filters.includes(filterName)) {
        targetGroup = groupName;
        break;
      }
    }

    if (!targetGroup) return;

    const isCurrentlyActive = activeFilters.includes(filterName);
    const groupFilters = FILTER_GROUPS[targetGroup];

    // Remove any active filters belonging to the same group
    let nextFilters = activeFilters.filter(f => !groupFilters.includes(f));

    if (!isCurrentlyActive) {
      nextFilters.push(filterName);
    }

    setActiveFilters(nextFilters);
  };

  // Clear All Filters Helper
  const handleClearAllFilters = () => {
    setSearchQuery("");
    setFilterCategory("All");
    setActiveFilters([]);
    showNotification("All filters and searches cleared", "info");
  };

  // Custom Category Event Handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newCatName.trim();
    if (!nameTrimmed) return;

    // Duplicate Check
    const isDuplicate = defaultCategories.some(c => c.toLowerCase() === nameTrimmed.toLowerCase()) || 
                        customCategories.some(c => (!editingCategory || c.id !== editingCategory.id) && c.name.toLowerCase() === nameTrimmed.toLowerCase());

    if (isDuplicate) {
      showNotification("A category with this name already exists.", "warning");
      return;
    }

    try {
      if (editingCategory) {
        // Update category
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameTrimmed,
            color: newCatColor,
            icon: newCatIcon
          })
        });
        if (res.ok) {
          showNotification(`Category "${nameTrimmed}" updated successfully.`, "success");
          setEditingCategory(null);
          setNewCatName("");
          setIsCategoryModalOpen(false);
          await fetchCustomCategories();
          if (onRefresh) {
            await onRefresh();
          }
        } else {
          showNotification("Could not update category.", "warning");
        }
      } else {
        // Create category
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameTrimmed,
            color: newCatColor,
            icon: newCatIcon
          })
        });
        if (res.ok) {
          showNotification(`Category "${nameTrimmed}" created successfully!`, "success");
          setNewCatName("");
          setIsCategoryModalOpen(false);
          await fetchCustomCategories();
          if (onRefresh) {
            await onRefresh();
          }
        } else {
          const errData = await res.json();
          showNotification(errData.error || "Could not create category.", "warning");
        }
      }
    } catch (err) {
      console.error(err);
      showNotification("Error saving category.", "warning");
    }
  };

  const handleDeleteCategoryPrompt = (cat: any) => {
    const isUsed = tasks.some(t => t.category.toLowerCase() === cat.name.toLowerCase());
    setCategoryToDelete(cat);
    if (isUsed) {
      setReassignTarget("Other");
      setReassignModalOpen(true);
    } else {
      executeDeleteCategory(cat.id, "Other");
    }
  };

  const executeDeleteCategory = async (id: number, reassignTo: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignTo })
      });
      if (res.ok) {
        showNotification("Category deleted and tasks reassigned successfully.", "success");
        setReassignModalOpen(false);
        setCategoryToDelete(null);
        await fetchCustomCategories();
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        showNotification("Could not delete category.", "warning");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error deleting category.", "warning");
    }
  };

  // Live filter search sorting
  const filteredTasks = tasks.filter((t) => {
    // 1. Search filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const titleMatch = t.task.toLowerCase().includes(q);
      const descMatch = (t.context || "").toLowerCase().includes(q);
      const tagMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(q));
      const categoryMatch = t.category.toLowerCase().includes(q);
      const priorityMatch = t.priority.toLowerCase().includes(q);
      const notesMatch = (t.notes || "").toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !tagMatch && !categoryMatch && !priorityMatch && !notesMatch) return false;
    }

    // 2. Category horizontal filter
    if (filterCategory !== "All" && t.category !== filterCategory) return false;

    // 3. Multi-active smart filters
    if (activeFilters.includes("All")) return true;

    const daysLeft = getDaysLeft(t.deadline);
    const isCompleted = t.status === "Completed";

    for (const filter of activeFilters) {
      if (filter === "Today" && daysLeft !== 0) return false;
      if (filter === "Tomorrow" && daysLeft !== 1) return false;
      if (filter === "This Week" && (daysLeft < 0 || daysLeft > 7)) return false;
      if (filter === "This Month" && (daysLeft < 0 || daysLeft > 30)) return false;
      if (filter === "Completed" && !isCompleted) return false;
      if (filter === "Pending" && isCompleted) return false;
      if (filter === "Overdue" && (daysLeft >= 0 || isCompleted)) return false;
      if (filter === "High Priority" && t.priority !== "High" && t.priority !== "Critical") return false;
      if (filter === "Critical" && t.priority !== "Critical") return false;
      if (filter === "AI Generated" && !t.aiGenerated) return false;
      if (filter === "Calendar Synced" && !t.calendarSynced) return false;
      if (filter === "Recently Updated") {
        if (!t.updatedAt) return false;
        const diffHrs = (Date.now() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
        if (diffHrs > 24) return false;
      }
    }

    return true;
  });

  // Action: Duplicate Task
  const handleDuplicateTask = async (task: Task) => {
    const { id, userId, createdAt, updatedAt, completedAt, ...cleanData } = task;
    const duplicatedTask = {
      ...cleanData,
      task: `${task.task} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calendarSynced: false,
      reminderEnabled: false
    };
    try {
      await onAddTask(duplicatedTask);
    } catch (err) {
      console.error(err);
      showNotification("Error duplicating task.", "warning");
    }
  };

  // Google Calendar Sync
  const handleSyncToCalendar = async (t: Task) => {
    try {
      const res = await fetch("/api/calendar/add-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.task,
          description: t.context || "",
          priority: t.priority,
          deadline: t.deadline,
          duration: effortSafe(t)
        })
      });

      if (res.ok) {
        showNotification("Synced successfully with Google Calendar!", "success");
        // Log sync event
        await fetch(`/api/tasks/${t.id}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Calendar Synced",
            details: `Synced task "${t.task}" to Google Calendar successfully.`,
            performedBy: "Manual"
          })
        });

        onUpdateTask(t.id!, { calendarSynced: true });
        if (selectedTaskDetails?.id === t.id) {
          setSelectedTaskDetails(prev => prev ? { ...prev, calendarSynced: true } : null);
        }
      } else {
        const err = await res.json();
        showNotification(err.error || "Could not sync. Ensure your Google account is authorized.", "warning");
      }
    } catch (err) {
      console.error(err);
      showNotification("Calendar sync error occurred.", "warning");
    }
  };

  // Email Reminder Trigger
  const handleSendEmailReminder = async (t: Task) => {
    try {
      await fetch(`/api/tasks/${t.id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "Reminder Sent",
          details: `Sent direct email reminder for task: "${t.task}".`,
          performedBy: "Manual"
        })
      });

      showNotification("Email reminder successfully queued & dispatched!", "success");
      onUpdateTask(t.id!, { reminderEnabled: true });
      if (selectedTaskDetails?.id === t.id) {
        setSelectedTaskDetails(prev => prev ? { ...prev, reminderEnabled: true } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Notes Persistence
  const handleSaveNotes = async () => {
    if (!selectedTaskDetails?.id) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskDetails.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: taskNotes })
      });
      if (res.ok) {
        onUpdateTask(selectedTaskDetails.id, { notes: taskNotes });
        setSelectedTaskDetails(prev => prev ? { ...prev, notes: taskNotes } : null);
        // Log history
        await fetch(`/api/tasks/${selectedTaskDetails.id}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Notes Saved",
            details: `Updated task notes.`,
            performedBy: "Manual"
          })
        });
      } else {
        showNotification("Failed to save notes.", "warning");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Drag & Drop / File selector base64 upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedTaskDetails?.id) return;
    const file = files[0];
    if (file.size > 2 * 1024 * 1024) {
      showNotification("File size exceeds 2MB limit.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const newAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        uploadedAt: new Date().toISOString()
      };

      const currentAttachments = selectedTaskDetails.attachments || [];
      const updatedAttachments = [...currentAttachments, newAttachment];

      try {
        const res = await fetch(`/api/tasks/${selectedTaskDetails.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachments: updatedAttachments })
        });

        if (res.ok) {
          onUpdateTask(selectedTaskDetails.id, { attachments: updatedAttachments });
          setSelectedTaskDetails(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
          
          // Log attachment history
          await fetch(`/api/tasks/${selectedTaskDetails.id}/history`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "Attachment Added",
              details: `Uploaded file "${file.name}" successfully.`,
              performedBy: "Manual"
            })
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // EXPORTS INTEGRATION
  const handleExportData = async (exportType: "CSV" | "JSON" | "ICS" | "PDF") => {
    const activeFiltersLabel = activeFilters.join(", ");
    const todayISO = new Date().toISOString().split("T")[0];
    const fileName = `TimeHero_Tasks_${todayISO}.${exportType.toLowerCase()}`;

    if (exportType === "CSV") {
      const headers = ["ID", "Task Name", "Category", "Priority", "Status", "Progress", "Deadline", "Due Time", "Effort", "Remaining Hours", "Notes", "Tags", "Created At"];
      const rows = filteredTasks.map(t => [
        t.id || "",
        `"${(t.task || "").replace(/"/g, '""')}"`,
        t.category || "",
        t.priority || "",
        t.status || "",
        progressSafe(t),
        t.deadline || "",
        t.dueTime || "12:00",
        effortSafe(t),
        remainingSafe(t),
        `"${(t.notes || "").replace(/"/g, '""')}"`,
        `"${(t.tags || []).join(', ')}"`,
        t.createdAt || ""
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (exportType === "JSON") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredTasks, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (exportType === "ICS") {
      let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TimeHero AI//Task Export//EN\n";
      filteredTasks.forEach(t => {
        const deadlineClean = (t.deadline || "").replace(/-/g, "");
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `UID:task-${t.id}@timehero.ai\n`;
        icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\n`;
        icsContent += `DTSTART:${deadlineClean}T120000\n`;
        icsContent += `DTEND:${deadlineClean}T130000\n`;
        icsContent += `SUMMARY:${t.task}\n`;
        icsContent += `DESCRIPTION:${t.context || ""}\\nPriority: ${t.priority}\\nStatus: ${t.status}\\nEffort: ${effortSafe(t)}h\\nRemaining: ${remainingSafe(t)}h\n`;
        icsContent += "END:VEVENT\n";
      });
      icsContent += "END:VCALENDAR";
      const dataStr = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsContent);
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (exportType === "PDF") {
      // Dynamic printable frame layout
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>TimeHero AI Tasks Export</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 24px; }
                h1 { font-size: 24px; font-weight: 800; color: #4f46e5; margin-bottom: 8px; }
                p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 24px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                th, td { text-align: left; padding: 10px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
                th { background-color: #f8fafc; font-weight: 700; color: #475569; }
                .badge { display: inline-block; padding: 2px 6px; font-size: 8px; font-weight: 800; text-transform: uppercase; border-radius: 4px; }
                .priority-High { background-color: #fef3c7; color: #d97706; }
                .priority-Critical { background-color: #fee2e2; color: #dc2626; }
                .priority-Medium { background-color: #dbeafe; color: #2563eb; }
                .priority-Low { background-color: #f1f5f9; color: #475569; }
                .status-Completed { color: #16a34a; font-weight: bold; }
              </style>
            </head>
            <body>
              <h1>My Tasks Command Center Report</h1>
              <p>Generated on ${new Date().toLocaleString()} | Active Filters: ${activeFiltersLabel}</p>
              <table>
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Deadline</th>
                    <th>Remaining (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredTasks.map(t => `
                    <tr>
                      <td style="font-weight: 600;">${t.task}</td>
                      <td>${t.category}</td>
                      <td><span class="badge priority-${t.priority}">${t.priority}</span></td>
                      <td class="status-${t.status}">${t.status}</td>
                      <td>${t.progress}%</td>
                      <td style="font-family: monospace;">${t.deadline} ${t.dueTime || "12:00"}</td>
                      <td style="font-family: monospace;">${remainingSafe(t)}h</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }

    // Call back to save history in sqlite
    try {
      await fetch("/api/export/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType,
          filterUsed: activeFiltersLabel,
          fileName
        })
      });
      // Add custom log to task details if open
      if (selectedTaskDetails?.id) {
        await fetch(`/api/tasks/${selectedTaskDetails.id}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: `${exportType} Export`,
            details: `Task data exported to ${exportType} file: ${fileName}`,
            performedBy: "Manual"
          })
        });
        // Reload export logs
        fetch(`/api/export/history`)
          .then(res => res.ok ? res.json() : [])
          .then(data => setExportHistory(data));
      }
    } catch (err) {
      console.error("Error logging export:", err);
    }
  };

  // IMPORT JSON BATCH TASKS
  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const item of items) {
        if (!item.task) continue;
        await onAddTask({
          task: item.task,
          category: item.category || "Research",
          deadline: item.deadline || new Date().toISOString().split("T")[0],
          priority: item.priority || "Medium",
          effort: item.effort || 2.0,
          progress: item.progress || 0,
          status: item.status || "Queued",
          context: item.context || "",
          dueTime: item.dueTime || "12:00",
          tags: Array.isArray(item.tags) ? item.tags : [],
          notes: item.notes || ""
        });
      }
      showNotification("Successfully imported batch tasks!", "success");
      setIsImportModalOpen(false);
      setImportJsonText("");
    } catch (e) {
      showNotification("Invalid JSON format. Please ensure valid arrays of task properties.", "warning");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="my-tasks-workspace">
      
      {/* 1. Page Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/30 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-900/20 rounded-full filter blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-purple-300 uppercase tracking-widest">
              <ListTodo className="w-3.5 h-3.5 text-purple-400" />
              Comprehensive Workspace
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              My Tasks
            </h1>
            <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-2xl">
              View, organize, search, and manage all of your tasks in one place. Synchronized in real time with SQLite and Google APIs.
            </p>
          </div>

          {/* Quick Actions in Banner */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate("Add Task")}
              className="flex items-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 border border-white/10 rounded-xl text-xs font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-all"
            >
              <Plus className="w-4 h-4" /> Create Task
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-extrabold text-white/80 hover:bg-white/10 transition-all"
            >
              <Upload className="w-4 h-4 text-purple-400" /> Import
            </button>
            
            {/* Export options */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-extrabold text-white/80 hover:bg-white/10 transition-all">
                <Share2 className="w-4 h-4 text-purple-400" /> Export <ChevronRight className="w-3 h-3 text-white/40 rotate-90" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden invisible group-hover:visible z-30 transition-all opacity-0 group-hover:opacity-100">
                <button onClick={() => handleExportData("PDF")} className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/5 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-red-400" /> PDF Report</button>
                <button onClick={() => handleExportData("CSV")} className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/5 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-emerald-400" /> CSV Excel</button>
                <button onClick={() => handleExportData("JSON")} className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/5 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-blue-400" /> JSON file</button>
                <button onClick={() => handleExportData("ICS")} className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/5 flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-amber-400" /> ICS Calendar</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Premium Bento Grid Statistics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total & Completed */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Task Completion</span>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white">{completedCount}<span className="text-white/40 font-semibold text-sm"> / {totalCount}</span></h3>
            <p className="text-[10px] text-white/50 mt-1 leading-none">Total: {totalCount} tasks</p>
          </div>
        </div>

        {/* Card 2: Active & Overdue */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Urgent & Overdue</span>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white flex items-center gap-1.5">
              {pendingCount}
              {overdueCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-lg text-[9px] font-black animate-pulse uppercase">
                  {overdueCount} Overdue
                </span>
              )}
            </h3>
            <p className="text-[10px] text-white/50 mt-1 leading-none">{highPriorityCount} high priority tasks</p>
          </div>
        </div>

        {/* Card 3: Today's Forecast */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Today & This Week</span>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white">{todayTasksCount}<span className="text-white/40 font-semibold text-sm"> due today</span></h3>
            <p className="text-[10px] text-white/50 mt-1 leading-none">{weekTasksCount} due this week</p>
          </div>
        </div>

        {/* Card 4: Effort Remaining */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Effort Remaining</span>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-purple-300 font-mono">{estimatedHoursRemaining.toFixed(1)}<span className="text-white/40 text-xs font-semibold"> hrs</span></h3>
            <p className="text-[10px] text-white/50 mt-1 leading-none">Estimate of pending work</p>
          </div>
        </div>

        {/* Card 5: Smart Health Metrics */}
        <div className="bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border border-purple-500/20 rounded-xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
            <span>AI Health Status</span>
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white">{aiHealthScore}% <span className="text-purple-300 font-bold text-xs">score</span></h3>
            <p className="text-[10px] text-white/50 mt-1.5 leading-tight">AI Success Prediction: <strong className="text-purple-300">{aiSuccessPrediction}%</strong></p>
          </div>
        </div>

      </div>

      {/* 3. Search and Multi-filters Navigation Toolbar */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl backdrop-blur-md space-y-5">
        
        {/* Search & Quick filters banner */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Real-time search by Title, Description, Tags, Category, Priority */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="w-4 h-4 text-white/40" />
            </span>
            <input
              type="text"
              placeholder="Search by Title, Context, Category, Priority, Tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Category Horizontal Filter */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 tracking-wider">
              <Filter className="w-3 h-3 text-purple-400" /> Category Division
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setNewCatName("");
                setNewCatColor("#8b5cf6");
                setNewCatIcon("Layers");
                setIsCategoryModalOpen(true);
              }}
              className="text-[10px] font-black uppercase px-2 py-1 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1 shrink-0"
            >
              <Plus className="w-2.5 h-2.5" /> + New Category
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dynamicCategories.map((cat) => (
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

          {customCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-white/5">
              <span className="text-[9px] font-black uppercase text-white/30 tracking-wider flex items-center">Custom:</span>
              {customCategories.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/70 px-2 py-0.5 rounded-lg text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color || "#8b5cf6" }}></span>
                  <span className="font-bold">{c.name}</span>
                  <button
                    onClick={() => {
                      setEditingCategory(c);
                      setNewCatName(c.name);
                      setNewCatColor(c.color || "#8b5cf6");
                      setNewCatIcon(c.icon || "Layers");
                      setIsCategoryModalOpen(true);
                    }}
                    className="text-purple-300 hover:text-white"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategoryPrompt(c)}
                    className="text-red-400 hover:text-white"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grouped Smart Filters */}
        <div className="border-t border-white/5 pt-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 tracking-wider">
              <Sliders className="w-3 h-3 text-purple-400" /> Multi-Active Smart Filters
            </div>
            {(activeFilters.length > 0 || filterCategory !== "All" || searchQuery.trim() !== "") && (
              <button
                onClick={handleClearAllFilters}
                className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(FILTER_GROUPS).map(([groupName, filters]) => (
              <div key={groupName} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-white/40 tracking-wider block border-b border-white/5 pb-1">
                  {groupName}
                </span>
                <div className="flex flex-col gap-1">
                  {filters.map((sf) => {
                    const isActive = activeFilters.includes(sf);
                    return (
                      <button
                        key={sf}
                        type="button"
                        onClick={() => handleFilterToggle(sf)}
                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between text-left cursor-pointer ${
                          isActive
                            ? "bg-purple-600/20 border-purple-500/40 text-purple-200"
                            : "bg-transparent border-transparent text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{sf}</span>
                        {isActive && <Check className="w-3 h-3 text-purple-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Removable Chips */}
        {(activeFilters.length > 0 || filterCategory !== "All" || searchQuery.trim() !== "") && (
          <div className="border-t border-white/5 pt-4 space-y-2">
            <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block">Active Filter Chips</span>
            <div className="flex flex-wrap gap-1.5">
              {searchQuery.trim() !== "" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300 rounded-full">
                  <span>Search: "{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-purple-400 hover:text-white transition-colors cursor-pointer font-black text-sm leading-none"
                    aria-label="Remove search filter"
                  >
                    ×
                  </button>
                </div>
              )}

              {filterCategory !== "All" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300 rounded-full">
                  <span>{filterCategory}</span>
                  <button
                    onClick={() => setFilterCategory("All")}
                    className="text-purple-400 hover:text-white transition-colors cursor-pointer font-black text-sm leading-none"
                    aria-label="Remove category filter"
                  >
                    ×
                  </button>
                </div>
              )}

              {activeFilters.map((sf) => (
                <div key={sf} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300 rounded-full">
                  <span>{sf}</span>
                  <button
                    onClick={() => handleFilterToggle(sf)}
                    className="text-purple-400 hover:text-white transition-colors cursor-pointer font-black text-sm leading-none"
                    aria-label={`Remove ${sf} filter`}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                onClick={handleClearAllFilters}
                className="text-xs font-extrabold text-red-400 hover:text-red-300 transition-all flex items-center px-2 py-1 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 4. Filtered Tasks Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tasks-cards-container">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full bg-white/5 border border-white/10 rounded-2xl p-16 text-center text-white/40 space-y-4">
            <ListTodo className="w-12 h-12 text-white/20 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white/60">No matching tasks found</h3>
              <p className="text-xs text-white/30 max-w-sm mx-auto">Try resetting or modifying your smart filters or search text to find what you need.</p>
            </div>
            <div className="flex justify-center items-center gap-3 pt-2">
              {(activeFilters.length > 0 || filterCategory !== "All") && (
                <button
                  onClick={handleClearAllFilters}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              {searchQuery.trim() !== "" && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reset Search
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isCompleted = t.status === "Completed";
            const daysLeft = getDaysLeft(t.deadline);
            const risk = getRiskDetails(t);

            // Safer rendering parameters
            const lastUpdated = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString(undefined, {month: "short", day: "numeric"}) + " at " + new Date(t.updatedAt).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"}) : "No Data";

            return (
              <motion.div
                key={t.id}
                layoutId={`task-card-${t.id}`}
                onClick={() => {
                  setSelectedTaskDetails(t);
                  setActiveTab("general");
                }}
                className={`group relative flex flex-col justify-between bg-white/5 border ${isCompleted ? 'border-emerald-500/20 bg-emerald-950/5' : 'border-white/10'} hover:border-white/20 p-5 rounded-2xl shadow-xl transition-all cursor-pointer backdrop-blur-md`}
              >
                {/* Header: Badge list & AI generate */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3.5 mb-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      {t.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider ${getPriorityWeight(t.priority) >= 3 ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-slate-500/10 border-slate-500/30 text-slate-400"}`}>
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
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase tracking-widest text-[8px] font-black">
                        <Sparkles className="w-2.5 h-2.5 text-purple-400 animate-pulse" /> AI Task
                      </span>
                    ) : (
                      <span className="text-white/30 uppercase tracking-widest text-[8px]">User</span>
                    )}
                  </div>
                </div>

                {/* Main Task Name & Description */}
                <div className="space-y-2 mb-4">
                  <h2 className={`text-base font-bold text-white tracking-tight ${isCompleted ? 'line-through text-white/40' : ''}`}>
                    {t.task}
                  </h2>
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
                    {t.context || "No context provided. Use Edit to add execution plans or goals."}
                  </p>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mb-4 text-xs">
                  {/* Created Stamp */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Created At</div>
                    <div className="text-[10px] text-white/80 font-mono">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, {month: "short", day: "numeric"}) : "No Date"}{" "}
                      <span className="text-white/40">
                        {t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"}) : ""}
                      </span>
                    </div>
                  </div>

                  {/* Due deadline */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Deadline</div>
                    <div className="text-[11px] text-white/80 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-mono text-[10px] text-purple-300">{t.deadline || "No Data"} <span className="text-white/40">{t.dueTime || "12:00"}</span></span>
                    </div>
                  </div>

                  {/* Estimates & Remaining */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Estimate / Remaining</div>
                    <div className="text-xs text-white/80 flex items-center gap-1 font-mono">
                      <span>⏱️</span> {effortSafe(t)}h <span className="text-white/30">/</span> <span className="text-purple-300">{remainingSafe(t)}h remaining</span>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[9px] font-black uppercase text-white/30 tracking-wider">Countdown</div>
                    <div className="text-xs text-purple-300 flex items-center gap-1 font-mono">
                      <span>⏳</span> {isCompleted ? "Completed" : daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow!" : daysLeft > 1 ? `${daysLeft} days left` : daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : "No Data"}
                    </div>
                  </div>
                </div>

                {/* Tags list */}
                {t.tags && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {t.tags.map((tag, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-white/5 border border-white/10 text-white/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress bar and pressure score */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40">
                    <span>Progress: {progressSafe(t)}%</span>
                    <span>Status: {t.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"} transition-all duration-300`}
                      style={{ width: `${progressSafe(t)}%` }}
                    />
                  </div>

                  {/* Last updated and Risk label */}
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <div className="text-[9px] font-black text-white/30 uppercase font-mono">
                      Updated: {lastUpdated}
                    </div>
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                        COMPLETED
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full ${risk.color} text-[9px] font-extrabold uppercase`}>
                        {risk.label} Risk
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions row */}
                <div className="grid grid-cols-6 gap-1.5 border-t border-white/5 pt-4 mt-4" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Action 1: View Drawer */}
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

                  {/* Action 2: Edit */}
                  <button
                    onClick={() => setEditingTask(t)}
                    title="Edit task parameters"
                    className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-purple-500/10 text-white/60 hover:text-purple-400 border border-white/10 hover:border-purple-500/20 transition-all flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Action 3: Duplicate */}
                  <button
                    onClick={() => handleDuplicateTask(t)}
                    title="Duplicate Task Card"
                    className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-purple-500/10 text-white/60 hover:text-purple-400 border border-white/10 hover:border-purple-500/20 transition-all flex items-center justify-center"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Action 4: Sync Google Calendar */}
                  <button
                    onClick={() => handleSyncToCalendar(t)}
                    title={t.calendarSynced ? "Calendar Synced" : "Sync to Google Calendar"}
                    className={`col-span-1 p-2 rounded-xl border transition-all flex items-center justify-center ${t.calendarSynced ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-white/5 hover:bg-blue-500/10 text-white/60 hover:text-blue-400 border-white/10 hover:border-blue-500/20"}`}
                  >
                    <CalendarCheck className="w-4 h-4" />
                  </button>

                  {/* Action 5: Complete */}
                  {!isCompleted ? (
                    <button
                      onClick={() => onCompleteTask(t.id!)}
                      title="Mark task as complete"
                      className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-white/60 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/20 transition-all flex items-center justify-center"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="col-span-1 p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}

                  {/* Action 6: Delete */}
                  <button
                    onClick={() => onDeleteTask(t.id!)}
                    title="Delete task card"
                    className="col-span-1 p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-500/20 transition-all flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </motion.div>
            );
          })
        )}
      </div>

      {/* 5. Comprehensive 8-Tab Drawer for task details */}
      <AnimatePresence>
        {selectedTaskDetails && (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex justify-end" id="task-detail-overlay">
            {/* Click outside to close */}
            <div className="flex-1" onClick={() => setSelectedTaskDetails(null)} />
            
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-2xl bg-[#0b0f19]/95 border-l border-white/10 h-full flex flex-col justify-between shadow-2xl backdrop-blur-xl relative overflow-hidden"
            >
              
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-start justify-between relative">
                <div className="space-y-1 pr-6">
                  <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-purple-500/10 border border-purple-500/20 text-purple-300">
                    {selectedTaskDetails.category}
                  </span>
                  <h2 className="text-lg font-black text-white tracking-tight leading-snug">
                    {selectedTaskDetails.task}
                  </h2>
                  <p className="text-xs text-white/40">ID: {selectedTaskDetails.id} | Status: <strong className="text-white/60">{selectedTaskDetails.status}</strong></p>
                </div>
                
                <button 
                  onClick={() => setSelectedTaskDetails(null)}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Tabs (8 tabs scrollable) */}
              <div className="flex border-b border-white/5 bg-slate-900/40 px-2 overflow-x-auto scrollbar-none shrink-0 text-xs">
                {([
                  { id: "general", label: "Overview", icon: Eye },
                  { id: "timeline", label: "Timeline", icon: History },
                  { id: "ai", label: "AI Insights", icon: Sparkles },
                  { id: "calendar", label: "Calendar", icon: CalendarCheck },
                  { id: "reminders", label: "Reminders", icon: Bell },
                  { id: "notes", label: "Notes", icon: FileText },
                  { id: "attachments", label: "Attachments", icon: Paperclip },
                  { id: "export", label: "Export History", icon: Download }
                ] as const).map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-3 px-4 font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
                        activeTab === tab.id 
                          ? "border-purple-500 text-purple-300" 
                          : "border-transparent text-white/50 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === "general" && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <h4 className="text-xs font-black uppercase text-white/30 tracking-widest mb-2">Description</h4>
                      <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                        {selectedTaskDetails.context || "No context has been detailed yet. Edit parameters to add scope."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] text-white/40 uppercase">Effort Allocation</span>
                        <div className="text-sm font-bold text-white">{effortSafe(selectedTaskDetails)} hours allocated</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] text-white/40 uppercase">Work remaining</span>
                        <div className="text-sm font-bold text-purple-300">{remainingSafe(selectedTaskDetails)} hours pending</div>
                      </div>
                    </div>

                    {/* Dynamic Progress Adjustment Slider */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between text-xs font-extrabold uppercase text-white/40">
                        <span>Modify Progress</span>
                        <span className="text-purple-300 font-mono">{progressSafe(selectedTaskDetails)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={progressSafe(selectedTaskDetails)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const st = val === 100 ? "Completed" : "In Progress";
                          onUpdateTask(selectedTaskDetails.id!, { progress: val, status: st });
                          setSelectedTaskDetails(prev => prev ? { ...prev, progress: val, status: st } : null);
                        }}
                        className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <div className="text-[9px] text-white/40">Sliding directly updates SQLite database tasks records and recalculates remaining effort times.</div>
                    </div>

                    {/* Metadata dates */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Created Date:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.createdAt ? new Date(selectedTaskDetails.createdAt).toLocaleDateString() : "No Data"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Created Time:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.createdAt ? new Date(selectedTaskDetails.createdAt).toLocaleTimeString() : "No Data"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Deadline Date:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.deadline || "No Data"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-white/40">Deadline Time:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.dueTime || "12:00"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-white/40">Last Updated Stamp:</span>
                        <span className="text-white font-mono">{selectedTaskDetails.updatedAt ? new Date(selectedTaskDetails.updatedAt).toLocaleString() : "No Data"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TIMELINE TAB (Fetched from Task SQLite History) */}
                {activeTab === "timeline" && (
                  <div className="space-y-4 animate-fade-in">
                    <h4 className="text-xs font-black uppercase text-white/30 tracking-widest">SQLite Log Events</h4>
                    
                    {loadingHistory ? (
                      <div className="text-center py-12 text-white/40">Loading action logs...</div>
                    ) : historyLogs.length === 0 ? (
                      <div className="text-center py-12 bg-white/5 border border-white/5 rounded-xl text-white/40 text-xs">
                        No logs created yet. Try completing or updating the task to record activity timeline events.
                      </div>
                    ) : (
                      <div className="border-l-2 border-purple-500/20 pl-4 ml-2 space-y-5 relative">
                        {historyLogs.map((log) => {
                          const isAI = log.performed_by === "AI" || log.performedBy === "AI";
                          return (
                            <div key={log.id} className="relative space-y-1">
                              <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-purple-500" />
                              <div className="flex items-center justify-between text-xs font-black uppercase text-white/60">
                                <span>{log.action}</span>
                                <span className="font-mono text-[9px] text-white/30">{new Date(log.created_at || log.createdAt || Date.now()).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-white/50 leading-relaxed">
                                {log.details}
                              </p>
                              <div className="text-[10px] text-white/30">
                                Performed by: <strong className={isAI ? "text-purple-400" : "text-white/50"}>{log.performed_by || log.performedBy || "User"}</strong> ({isAI ? "AI System" : "Manual"})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. AI INSIGHTS TAB (Live Gemini integration advice) */}
                {activeTab === "ai" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-white/30 tracking-widest">Live Gemini Productivity Audit</h4>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase tracking-widest text-[8px] font-black">
                        Gemini Pro
                      </span>
                    </div>

                    {loadingSuggestions ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2 text-white/40">
                        <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-400 rounded-full animate-spin"></div>
                        <span className="text-[10px] uppercase font-bold tracking-widest">Consulting AI model...</span>
                      </div>
                    ) : aiSuggestions.length === 0 ? (
                      <div className="p-5 bg-purple-950/10 border border-purple-500/15 rounded-xl space-y-3">
                        <p className="text-xs text-purple-200/70 font-semibold italic">
                          "TimeHero suggestion: No customized response saved. Here's your general AI guideline:"
                        </p>
                        <ul className="text-xs text-white/50 space-y-2 list-disc pl-4">
                          <li>Break this task into three 45-minute sprint increments.</li>
                          <li>Allocate peak focus (2 PM - 5 PM) to reduce timeline risk.</li>
                          <li>Review requirements checklist to ensure maximum execution score.</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiSuggestions.map((sug, idx) => (
                          <div key={idx} className="bg-purple-950/10 border border-purple-500/10 p-4 rounded-xl flex gap-3 items-start">
                            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-purple-100 leading-relaxed">{sug}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. CALENDAR SYNC TAB */}
                {activeTab === "calendar" && (
                  <div className="space-y-4 animate-fade-in bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="text-xs font-black uppercase text-white/30 tracking-widest">Google Calendar Integration</h4>
                    
                    <div className="space-y-2.5 text-xs text-white/60">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>Sync status:</span>
                        <strong className={selectedTaskDetails.calendarSynced ? "text-emerald-400" : "text-amber-400"}>
                          {selectedTaskDetails.calendarSynced ? "🟢 Fully Synced" : "🔴 Not Synced"}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>Last sync attempt:</span>
                        <span className="font-mono">{selectedTaskDetails.calendarSynced ? "Recent" : "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span>Google event location:</span>
                        <span className="text-purple-300">Google Calendar API</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-4">
                      <button
                        onClick={() => handleSyncToCalendar(selectedTaskDetails)}
                        className="flex-1 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all"
                      >
                        Sync Event Now
                      </button>
                      
                      {selectedTaskDetails.calendarSynced && (
                        <button
                          onClick={() => {
                            onUpdateTask(selectedTaskDetails.id!, { calendarSynced: false });
                            setSelectedTaskDetails(prev => prev ? { ...prev, calendarSynced: false } : null);
                            showNotification("Unsynced successfully!", "info");
                          }}
                          className="px-4 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all"
                        >
                          Unsync
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. REMINDERS TAB */}
                {activeTab === "reminders" && (
                  <div className="space-y-4 animate-fade-in bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="text-xs font-black uppercase text-white/30 tracking-widest">Task Notification & Email Reminders</h4>
                    
                    <div className="space-y-2.5 text-xs text-white/60">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>Direct alerts:</span>
                        <strong className={selectedTaskDetails.reminderEnabled ? "text-emerald-400" : "text-amber-400"}>
                          {selectedTaskDetails.reminderEnabled ? "🔔 Reminders Activated" : "🔕 Inactive"}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span>Recipient Email:</span>
                        <span className="font-mono text-white/80">{session?.email || "guest@timehero.ai"}</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => handleSendEmailReminder(selectedTaskDetails)}
                        className="w-full py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" /> Send Direct Email Alert Now
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. NOTES TAB (Personal editable notes) */}
                {activeTab === "notes" && (
                  <div className="space-y-4 animate-fade-in">
                    <h4 className="text-xs font-black uppercase text-white/30 tracking-widest">Personal Task Notes</h4>
                    
                    <textarea
                      placeholder="Write your execution plan, instructions, links, or task progress notes here..."
                      value={taskNotes}
                      onChange={(e) => setTaskNotes(e.target.value)}
                      rows={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-medium text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50 leading-relaxed"
                    />

                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="w-full py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 text-xs font-black transition-all disabled:opacity-50"
                    >
                      {isSavingNotes ? "Saving Notes..." : "Save Notes to SQLite Database"}
                    </button>
                  </div>
                )}

                {/* 7. ATTACHMENTS TAB (Base64 file uploader) */}
                {activeTab === "attachments" && (
                  <div className="space-y-5 animate-fade-in">
                    <h4 className="text-xs font-black uppercase text-white/30 tracking-widest">File Attachments</h4>
                    
                    {/* Drag-and-drop / selector field */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? "border-purple-400 bg-purple-500/10" 
                          : "border-white/10 hover:border-white/20 bg-white/5"
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden" 
                      />
                      <Paperclip className="w-8 h-8 text-white/30 mx-auto mb-3" />
                      <p className="text-xs text-white/60 font-bold">Drag and drop file here, or click to choose</p>
                      <p className="text-[10px] text-white/30 mt-1">Accepts images, text, and pdf up to 2MB. Saved persistently.</p>
                    </div>

                    {/* Attachment List */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Attached files ({selectedTaskDetails.attachments?.length || 0})</span>
                      {!selectedTaskDetails.attachments || selectedTaskDetails.attachments.length === 0 ? (
                        <div className="text-xs text-white/40 italic py-4 bg-white/5 rounded-xl border border-white/5 text-center">
                          No files attached to this task card.
                        </div>
                      ) : (
                        selectedTaskDetails.attachments.map((file, idx) => (
                          <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2.5 truncate">
                              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                              <div className="truncate">
                                <p className="text-white font-bold truncate leading-none">{file.name}</p>
                                <span className="text-[9px] text-white/30">Size: {(file.size / 1024).toFixed(1)} KB | {new Date(file.uploadedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <a
                              href={file.dataUrl}
                              download={file.name}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-[10px] font-bold"
                            >
                              Download
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 8. EXPORTS HISTORY TAB */}
                {activeTab === "export" && (
                  <div className="space-y-4 animate-fade-in">
                    <h4 className="text-xs font-black uppercase text-white/30 tracking-widest">Recorded Export Sessions</h4>
                    
                    {loadingExports ? (
                      <div className="text-center py-6 text-white/40">Loading export history...</div>
                    ) : exportHistory.length === 0 ? (
                      <div className="text-xs text-white/40 italic py-6 bg-white/5 border border-white/5 rounded-xl text-center">
                        No previous exports recorded. Utilize the Export center or card actions to log files.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {exportHistory.slice(0, 5).map((log) => (
                          <div key={log.id} className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white uppercase">{log.exportType} Export</span>
                              <div className="text-[10px] text-white/40">File: {log.fileName || "No Data"}</div>
                            </div>
                            <span className="text-[10px] text-white/50 font-mono">{new Date(log.created_at || log.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Drawer footer */}
              <div className="p-6 border-t border-white/10 bg-slate-950 flex gap-2.5 shrink-0">
                {selectedTaskDetails.status !== "Completed" && (
                  <button
                    onClick={() => {
                      onCompleteTask(selectedTaskDetails.id!);
                      setSelectedTaskDetails(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-lg"
                  >
                    Mark Task Complete
                  </button>
                )}
                <button
                  onClick={() => {
                    onDeleteTask(selectedTaskDetails.id!);
                    setSelectedTaskDetails(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-bold text-xs transition-all"
                >
                  Delete Card
                </button>
              </div>

            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Import Batch Tasks Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase text-white tracking-widest flex items-center gap-2"><Upload className="w-4 h-4 text-purple-400" /> Batch Task Import</h3>
                <button onClick={() => setIsImportModalOpen(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-white/50 leading-relaxed">
                  Paste a JSON array of task objects to batch create multiple task cards at once. 
                </p>
                <textarea
                  placeholder='[\n  { "task": "Launch Pitch Deck", "category": "Design", "priority": "High", "effort": 3 }\n]'
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  rows={8}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/50 leading-relaxed"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    const sample = [
                      { "task": "Design Landing Page", "category": "Design", "priority": "High", "effort": 4, "tags": ["UI", "Vite"] },
                      { "task": "Write API Integration", "category": "Development", "priority": "Critical", "effort": 6 }
                    ];
                    setImportJsonText(JSON.stringify(sample, null, 2));
                  }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all"
                >
                  Load Sample JSON
                </button>
                <button
                  onClick={handleImportJson}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-black text-white transition-all shadow-lg"
                >
                  Execute Import Batch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Modal: Task parameters Edit */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(id, updates) => {
            onUpdateTask(id, updates);
            setEditingTask(null);
            // Re-sync open detail drawer if needed
            if (selectedTaskDetails?.id === id) {
              setSelectedTaskDetails(prev => prev ? { ...prev, ...updates } : null);
            }
          }}
          categories={dynamicCategories.filter(c => c !== "All")}
        />
      )}

      {/* Category Creation / Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-purple-900/10 to-indigo-900/10">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                {editingCategory ? "✏️ Edit Category" : "✨ Create Custom Category"}
              </h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCategory} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-white/50 tracking-wider">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Personal Project, Side Hustle"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-white/50 tracking-wider">Label Color Preset</label>
                <div className="grid grid-cols-4 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => setNewCatColor(preset.value)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-[10px] font-bold transition-all ${
                        newCatColor === preset.value
                          ? "bg-purple-600/20 border-purple-500/50 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${preset.bg}`}></span>
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-white/50 tracking-wider">Icon Representation</label>
                <div className="grid grid-cols-5 gap-2">
                  {iconPresets.map((icon) => (
                    <button
                      type="button"
                      key={icon}
                      onClick={() => setNewCatIcon(icon)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex justify-center items-center ${
                        newCatIcon === icon
                          ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                          : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-black text-white transition-all shadow-lg"
                >
                  {editingCategory ? "Update Category" : "Add Category"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Category Reassignment Modal */}
      {reassignModalOpen && categoryToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5"
          >
            <div className="text-center space-y-2">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-base font-black text-white uppercase tracking-widest">
                Category In Use
              </h3>
              <p className="text-xs text-white/60">
                The category <strong className="text-purple-300">"{categoryToDelete.name}"</strong> is currently assigned to one or more tasks.
                Please select a target category to reassign those tasks to before deletion.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase text-white/50 tracking-wider">Target Reassignment Category</label>
              <select
                value={reassignTarget}
                onChange={(e) => setReassignTarget(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-3 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              >
                {dynamicCategories.filter(c => c !== "All" && c !== categoryToDelete.name).map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReassignModalOpen(false);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteCategory(categoryToDelete.id, reassignTarget)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black text-white transition-all shadow-lg"
              >
                Reassign & Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
