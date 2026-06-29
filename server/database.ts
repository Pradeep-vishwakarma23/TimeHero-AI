import path from "path";
import fs from "fs/promises";
import { saveTaskHistory, logUserActivity } from "./auth_db.js";

const DB_PATH = path.resolve(process.cwd(), "timehero_db.json");

export interface Task {
  id?: number;
  userId: string;
  task: string;
  category: string;
  deadline: string; // ISO string YYYY-MM-DD
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  effort: number;
  tags: string[]; // array of strings
  progress: number;
  status: 'In Progress' | 'Needs Focus' | 'Queued' | 'Backlog' | 'Completed';
  context?: string;
  createdAt?: string;
  updatedAt?: string;
  dueTime?: string;
  aiGenerated?: boolean;
  completedAt?: string;
  remainingHours?: number;
  calendarSynced?: boolean;
  reminderEnabled?: boolean;
  notes?: string;
}

let tasksInMemory: Task[] = [];

// Helper to load tasks from file
async function loadTasks(): Promise<Task[]> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const nowISO = new Date().toISOString();
      const isValidDateString = (str: any): boolean => {
        if (!str || typeof str !== "string" || str === "N/A" || str.includes("Invalid")) return false;
        return !isNaN(Date.parse(str));
      };

      return parsed.map(t => {
        let createdAtVal = t.createdAt || t.created_at;
        if (!isValidDateString(createdAtVal)) {
          createdAtVal = nowISO;
        }
        let updatedAtVal = t.updatedAt || t.updated_at;
        if (!isValidDateString(updatedAtVal)) {
          updatedAtVal = createdAtVal;
        }
        let deadlineVal = t.deadline || t.due_date;
        if (!isValidDateString(deadlineVal)) {
          deadlineVal = nowISO.split("T")[0];
        }

        const dueTimeVal = t.dueTime || t.due_time || "12:00";
        const effortVal = t.effort !== undefined ? Number(t.effort) : (t.estimated_hours !== undefined ? Number(t.estimated_hours) : 2.0);
        const progressVal = t.progress !== undefined ? Number(t.progress) : 0;
        const remainingVal = t.remainingHours !== undefined ? Number(t.remainingHours) : (t.status === "Completed" ? 0 : Number((effortVal * (1 - progressVal / 100)).toFixed(1)));
        
        return {
          ...t,
          userId: t.userId || t.user_id || "guest",
          task: t.task || t.title || "Untitled Task",
          context: t.context || t.description || "",
          deadline: deadlineVal,
          dueTime: dueTimeVal,
          effort: effortVal,
          progress: progressVal,
          tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === "string" ? JSON.parse(t.tags) : []),
          createdAt: createdAtVal,
          updatedAt: updatedAtVal,
          aiGenerated: t.aiGenerated !== undefined ? !!t.aiGenerated : (t.ai_generated !== undefined ? !!t.ai_generated : false),
          completedAt: t.completedAt || t.completed_at || (t.status === "Completed" ? updatedAtVal : undefined),
          remainingHours: remainingVal,
          calendarSynced: t.calendarSynced !== undefined ? !!t.calendarSynced : (t.calendar_synced !== undefined ? !!t.calendar_synced : false),
          reminderEnabled: t.reminderEnabled !== undefined ? !!t.reminderEnabled : (t.reminder_enabled !== undefined ? !!t.reminder_enabled : false),
          notes: t.notes || "",
          attachments: Array.isArray(t.attachments) ? t.attachments : []
        };
      });
    }
    return [];
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // File doesn't exist, return empty
      return [];
    }
    console.error("Error reading database file, using empty array:", err);
    return [];
  }
}

// Helper to save tasks to file
export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(tasks, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to database file:", err);
  }
}

export async function initDb(): Promise<void> {
  try {
    const loaded = await loadTasks();
    if (loaded.length === 0) {
      console.log("Seeding initial mock tasks into JSON database...");
      tasksInMemory = getInitialTasks();
      await saveTasks(tasksInMemory);
      console.log("Seeding complete. Saved to:", DB_PATH);
    } else {
      tasksInMemory = loaded;
      console.log("Loaded existing tasks from JSON database. Count:", tasksInMemory.length);
    }
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
}

function getInitialTasks(): Task[] {
  const baseDate = new Date();
  const formatDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(baseDate.getDate() + daysOffset);
    return d.toISOString().split("T")[0];
  };

  const nowISO = new Date().toISOString();

  return [
    {
      id: 1,
      userId: "guest",
      task: "Finalize TimeHero AI MVP demo",
      category: "Development",
      deadline: formatDate(0),
      priority: "Critical",
      effort: 4.0,
      tags: ["Hackathon", "Demo"],
      progress: 74,
      status: "In Progress",
      context: "Need to make sure all responsive Plotly graphs and mock prediction layouts are stunning.",
      createdAt: nowISO,
      updatedAt: nowISO,
      dueTime: "17:00",
      aiGenerated: false
    },
    {
      id: 2,
      userId: "guest",
      task: "Record 90-second product walkthrough",
      category: "Design",
      deadline: formatDate(0),
      priority: "High",
      effort: 2.0,
      tags: ["Pitch", "Story"],
      progress: 35,
      status: "Needs Focus",
      context: "Keep it under 90 seconds, showing dashboard, simulator, planner, and AI coach.",
      createdAt: nowISO,
      updatedAt: nowISO,
      dueTime: "14:00",
      aiGenerated: false
    },
    {
      id: 3,
      userId: "guest",
      task: "Polish Vibe2Ship pitch deck",
      category: "Research",
      deadline: formatDate(1),
      priority: "High",
      effort: 3.5,
      tags: ["Judges", "Narrative"],
      progress: 58,
      status: "In Progress",
      context: "Align with the official judges guidelines and structure with a crisp narrative.",
      createdAt: nowISO,
      updatedAt: nowISO,
      dueTime: "11:00",
      aiGenerated: false
    },
    {
      id: 4,
      userId: "guest",
      task: "Test responsive dashboard layout",
      category: "Testing",
      deadline: formatDate(2),
      priority: "Medium",
      effort: 2.5,
      tags: ["Quality", "Mobile"],
      progress: 20,
      status: "Queued",
      context: "Check layout behavior on narrow screen widths.",
      createdAt: nowISO,
      updatedAt: nowISO,
      dueTime: "16:30",
      aiGenerated: false
    },
    {
      id: 5,
      userId: "guest",
      task: "Prepare deployment checklist",
      category: "Deployment",
      deadline: formatDate(3),
      priority: "Medium",
      effort: 1.5,
      tags: ["Launch"],
      progress: 10,
      status: "Queued",
      context: "Ensure the node build has no issues and variables are declared properly.",
      createdAt: nowISO,
      updatedAt: nowISO,
      dueTime: "09:00",
      aiGenerated: false
    },
    {
      id: 6,
      userId: "guest",
      task: "Collect judge feedback questions",
      category: "Research",
      deadline: formatDate(5),
      priority: "Low",
      effort: 1.0,
      tags: ["Mentor", "Insights"],
      progress: 0,
      status: "Backlog",
      context: "Gather feedback on the pitch deck draft from mentors.",
      createdAt: nowISO,
      updatedAt: nowISO,
      dueTime: "15:00",
      aiGenerated: false
    },
  ];
}

export async function createTask(userId: string, task: Omit<Task, "id" | "userId"> & { title?: string; description?: string; dueDate?: string; estimatedHours?: number }, performedBy: string = "Manual"): Promise<number> {
  const normalized: any = { ...task };
  if (normalized.title !== undefined && normalized.task === undefined) {
    normalized.task = normalized.title;
  }
  if (normalized.description !== undefined && normalized.context === undefined) {
    normalized.context = normalized.description;
  }
  if (normalized.dueDate !== undefined && normalized.deadline === undefined) {
    normalized.deadline = normalized.dueDate;
  }
  if (normalized.estimatedHours !== undefined && normalized.effort === undefined) {
    normalized.effort = Number(normalized.estimatedHours);
  }

  const loaded = await loadTasks();
  const maxId = loaded.reduce((max, t) => (t.id && t.id > max ? t.id : max), 0);
  const newId = maxId + 1;
  const nowStr = new Date().toISOString();
  
  const isAi = normalized.aiGenerated || (performedBy === "AI") || false;
  const effortValue = normalized.effort !== undefined ? Number(normalized.effort) : 2.0;
  const progressValue = normalized.progress !== undefined ? Number(normalized.progress) : 0;
  const statusVal = normalized.status || "Queued";
  
  const newTask: Task = {
    ...normalized,
    id: newId,
    userId,
    tags: Array.isArray(normalized.tags) ? normalized.tags : [],
    createdAt: normalized.createdAt || nowStr,
    updatedAt: normalized.updatedAt || nowStr,
    dueTime: normalized.dueTime || "12:00",
    aiGenerated: isAi,
    completedAt: statusVal === "Completed" ? nowStr : undefined,
    remainingHours: statusVal === "Completed" ? 0 : Number((effortValue * (1 - progressValue / 100)).toFixed(1)),
    calendarSynced: normalized.calendarSynced || false,
    reminderEnabled: normalized.reminderEnabled || false,
    notes: normalized.notes || ""
  };
  loaded.push(newTask);
  await saveTasks(loaded);
  tasksInMemory = loaded;

  try {
    await saveTaskHistory(newId, userId, "Task Created", `Task "${task.task}" was created.`, isAi ? "AI" : "Manual");
    await logUserActivity(userId, "Task Created");
  } catch (err) {
    console.error("Error saving task history on create:", err);
  }

  return newId;
}

export async function getTasks(userId?: string): Promise<Task[]> {
  const loaded = await loadTasks();
  tasksInMemory = loaded;
  if (userId) {
    return loaded.filter(t => t.userId === userId);
  }
  return loaded;
}

export async function updateTask(userId: string, id: number, updates: Partial<Task>, performedBy: string = "Manual"): Promise<void> {
  const loaded = await loadTasks();
  const index = loaded.findIndex(t => t.id === id && t.userId === userId);
  if (index !== -1) {
    const current = loaded[index];
    const nowStr = new Date().toISOString();
    
    const priorityChanged = updates.priority !== undefined && updates.priority !== current.priority;
    const deadlineChanged = (updates.deadline !== undefined && updates.deadline !== current.deadline) ||
                            (updates.dueTime !== undefined && updates.dueTime !== current.dueTime);
    const statusChanged = updates.status !== undefined && updates.status !== current.status;
    const progressChanged = updates.progress !== undefined && updates.progress !== current.progress;
    const categoryChanged = updates.category !== undefined && updates.category !== current.category;
    const reminderChanged = updates.reminderEnabled !== undefined && updates.reminderEnabled !== current.reminderEnabled;
    const calendarSyncedChanged = updates.calendarSynced !== undefined && updates.calendarSynced !== current.calendarSynced;

    const isAi = updates.aiGenerated !== undefined ? updates.aiGenerated : (current.aiGenerated || (performedBy === "AI") || false);

    const updatedTask: Task = {
      ...current,
      ...updates,
      userId: current.userId, // do not allow changing userId
      id: current.id, // do not allow changing id
      tags: updates.tags !== undefined ? (Array.isArray(updates.tags) ? updates.tags : []) : current.tags,
      updatedAt: nowStr
    };

    // Calculate completedAt and remainingHours automatically
    if (updatedTask.status === "Completed") {
      if (!updatedTask.completedAt) {
        updatedTask.completedAt = nowStr;
      }
      updatedTask.remainingHours = 0;
      updatedTask.progress = 100;
    } else {
      updatedTask.completedAt = undefined;
      if (updates.remainingHours !== undefined) {
        updatedTask.remainingHours = Number(updates.remainingHours);
      } else {
        const effortValue = updatedTask.effort;
        const progressValue = updatedTask.progress;
        updatedTask.remainingHours = Number((effortValue * (1 - progressValue / 100)).toFixed(1));
      }
    }

    loaded[index] = updatedTask;
    await saveTasks(loaded);
    tasksInMemory = loaded;

    try {
      // 1. General Update History
      await saveTaskHistory(id, userId, "Task Updated", `Task details updated.`, isAi ? "AI" : "Manual");

      // 2. Specific field change histories
      if (priorityChanged) {
        await saveTaskHistory(id, userId, "Priority Changed", `Changed priority from "${current.priority}" to "${updates.priority}".`, isAi ? "AI" : "Manual");
      }
      if (deadlineChanged) {
        const oldDl = `${current.deadline} ${current.dueTime || "12:00"}`;
        const newDl = `${updates.deadline || current.deadline} ${updates.dueTime || current.dueTime || "12:00"}`;
        await saveTaskHistory(id, userId, "Deadline Changed", `Changed deadline from ${oldDl} to ${newDl}.`, isAi ? "AI" : "Manual");
      }
      if (statusChanged) {
        await saveTaskHistory(id, userId, "Status Changed", `Changed status from "${current.status}" to "${updates.status}".`, isAi ? "AI" : "Manual");
        if (updates.status === "Completed") {
          try {
            await logUserActivity(userId, "Task Completed");
          } catch (err) {
            console.error("Error logging task completed activity on update:", err);
          }
        }
      }
      if (progressChanged) {
        await saveTaskHistory(id, userId, "Progress Changed", `Changed progress from ${current.progress}% to ${updates.progress}%.`, isAi ? "AI" : "Manual");
      }
      if (categoryChanged) {
        await saveTaskHistory(id, userId, "Category Changed", `Changed category from "${current.category}" to "${updates.category}".`, isAi ? "AI" : "Manual");
      }
      if (reminderChanged) {
        await saveTaskHistory(id, userId, "Reminder Modified", updates.reminderEnabled ? "Enabled email reminders." : "Disabled email reminders.", isAi ? "AI" : "Manual");
      }
      if (calendarSyncedChanged) {
        await saveTaskHistory(id, userId, "Calendar Synced", updates.calendarSynced ? "Task synchronized with Google Calendar." : "Task unsynchronized from Google Calendar.", isAi ? "AI" : "Manual");
      }
    } catch (err) {
      console.error("Error saving task history on update:", err);
    }
  }
}

export async function deleteTask(userId: string, id: number, performedBy: string = "Manual"): Promise<void> {
  const loaded = await loadTasks();
  const targetTask = loaded.find(t => t.id === id && t.userId === userId);
  const filtered = loaded.filter(t => !(t.id === id && t.userId === userId));
  await saveTasks(filtered);
  tasksInMemory = filtered;

  if (targetTask) {
    try {
      await saveTaskHistory(id, userId, "Deleted", `Task "${targetTask.task}" was deleted.`, performedBy);
    } catch (err) {
      console.error("Error saving task history on delete:", err);
    }
  }
}

export async function completeTask(userId: string, id: number, performedBy: string = "Manual"): Promise<void> {
  const loaded = await loadTasks();
  const index = loaded.findIndex(t => t.id === id && t.userId === userId);
  if (index !== -1) {
    const current = loaded[index];
    const prevStatus = current.status;
    const nowStr = new Date().toISOString();
    loaded[index].status = 'Completed';
    loaded[index].progress = 100;
    loaded[index].completedAt = nowStr;
    loaded[index].remainingHours = 0;
    loaded[index].updatedAt = nowStr;
    await saveTasks(loaded);
    tasksInMemory = loaded;

    try {
      await saveTaskHistory(id, userId, "Completed", `Task completed (previously "${prevStatus}").`, performedBy);
      await logUserActivity(userId, "Task Completed");
    } catch (err) {
      console.error("Error saving task history on complete:", err);
    }
  }
}

export async function getDashboardStatistics(userId: string): Promise<any> {
  const formatted = await getTasks(userId);
  const todayStr = new Date().toISOString().split("T")[0];
  const dueToday = formatted.filter((t) => t.deadline === todayStr && t.status !== "Completed").length;

  // Risk score & health calculations
  let totalRisk = 0;
  let eligibleCount = 0;

  formatted.forEach((t) => {
    if (t.status === "Completed") return;

    const priorityWeight = { Low: 12, Medium: 28, High: 45, Critical: 58 }[t.priority] || 28;
    
    // Days left from deadline
    const deadlineDate = new Date(t.deadline);
    const todayDate = new Date(todayStr);
    const daysLeft = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const deadlinePressure = Math.max(0, 44 - (daysLeft * 9));
    const workloadPressure = Math.min(28, t.effort * 4.5);
    const overduePressure = daysLeft < 0 ? 20 : 0;
    const riskScore = Math.max(4, Math.min(98, priorityWeight + deadlinePressure + workloadPressure + overduePressure));

    totalRisk += riskScore;
    eligibleCount++;
  });

  const avgRisk = eligibleCount > 0 ? Math.round(totalRisk / eligibleCount) : 15;
  const deadlineHealth = Math.max(1, 100 - avgRisk);
  const highRiskCount = formatted.filter((t) => {
    if (t.status === "Completed") return false;
    const priorityWeight = { Low: 12, Medium: 28, High: 45, Critical: 58 }[t.priority] || 28;
    const deadlineDate = new Date(t.deadline);
    const todayDate = new Date(todayStr);
    const daysLeft = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    const deadlinePressure = Math.max(0, 44 - (daysLeft * 9));
    const workloadPressure = Math.min(28, t.effort * 4.5);
    const overduePressure = daysLeft < 0 ? 20 : 0;
    const riskScore = Math.max(4, Math.min(98, priorityWeight + deadlinePressure + workloadPressure + overduePressure));
    return riskScore >= 74;
  }).length;

  const productivityScore = Math.min(98, Math.max(62, 90 - highRiskCount * 4));
  const focusHours = 4.8;

  return {
    productivityScore,
    deadlineHealth,
    focusHours,
    avgRisk,
    dueToday,
    totalTasks: formatted.length,
    completedTasks: formatted.filter((t) => t.status === "Completed").length,
  };
}

// ==========================================
// TIMEHERO EXECUTIVE INTELLIGENCE SCHEMAS & STORAGE
// ==========================================

const INTELLIGENCE_DB_PATH = path.resolve(process.cwd(), "timehero_intelligence_db.json");

export interface AIPrediction {
  id: number;
  userId?: string;
  type: "burnout_risk" | "success_probability" | "missed_deadline" | "calendar_overload" | "energy_depletion";
  title: string;
  value: number; // Percentage
  trend: "up" | "down" | "stable";
  reason: string;
  impact: string;
  createdAt: string;
}

export interface CoachingSession {
  id: number;
  userId: string;
  transcript: string;
  reply: string;
  createdAt: string;
}

export interface RecoveryPlan {
  id: number;
  userId?: string;
  title: string;
  status: "active" | "completed" | "archived";
  steps: { id: number; title: string; desc: string; done: boolean }[];
  tasksAffectedCount: number;
  createdAt: string;
}

export interface ProductivitySnapshot {
  id: number;
  userId?: string;
  date: string;
  productivityScore: number;
  burnoutRisk: "Low" | "Medium" | "High";
  focusHours: number;
  successProbability: number;
  createdAt: string;
}

export interface InsightItem {
  id: number;
  userId?: string;
  category: string;
  text: string;
  impactPercent: number;
  createdAt: string;
}

export interface RecommendationItem {
  id: number;
  userId?: string;
  title: string;
  text: string;
  actionType: string;
  createdAt: string;
}

export interface IntelligenceDb {
  predictions: AIPrediction[];
  coachingSessions: CoachingSession[];
  recoveryPlans: RecoveryPlan[];
  productivitySnapshots: ProductivitySnapshot[];
  insights: InsightItem[];
  recommendations: RecommendationItem[];
}

const defaultIntelligenceDb: IntelligenceDb = {
  predictions: [
    {
      id: 1,
      type: "success_probability",
      title: "Success Probability",
      value: 78,
      trend: "stable",
      reason: "High concentration of deliverables due this week with high effort estimates.",
      impact: "78% likelihood of successful completion without missed milestones.",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      type: "burnout_risk",
      title: "Burnout Risk",
      value: 62,
      trend: "up",
      reason: "Consecutive focus blocks scheduled close to evening hours with little relaxation buffer.",
      impact: "May lead to a 24% dip in cognitive speed by Friday.",
      createdAt: new Date().toISOString()
    }
  ],
  coachingSessions: [],
  recoveryPlans: [],
  productivitySnapshots: [],
  insights: [
    {
      id: 1,
      category: "Focus Pattern",
      text: "Your cognitive flow is strongest between 9 AM and 11 AM.",
      impactPercent: 32,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      category: "Overload Shield",
      text: "Late-night work blocks increase deadline risk by 40% due to compounding fatigue.",
      impactPercent: 40,
      createdAt: new Date().toISOString()
    }
  ],
  recommendations: []
};

export async function loadIntelligenceDb(): Promise<IntelligenceDb> {
  try {
    const data = await fs.readFile(INTELLIGENCE_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // Create with default values if not exists
      await saveIntelligenceDb(defaultIntelligenceDb);
      return defaultIntelligenceDb;
    }
    console.error("Error reading intelligence db, using defaults:", err);
    return defaultIntelligenceDb;
  }
}

export async function saveIntelligenceDb(db: IntelligenceDb): Promise<void> {
  try {
    await fs.writeFile(INTELLIGENCE_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving intelligence db:", err);
  }
}

export async function getAIIntelligence(): Promise<IntelligenceDb> {
  return await loadIntelligenceDb();
}

export async function saveAIIntelligence(db: IntelligenceDb): Promise<void> {
  await saveIntelligenceDb(db);
}

export async function getUserAIIntelligence(userId: string): Promise<IntelligenceDb> {
  const db = await loadIntelligenceDb();
  
  const userPredictions = db.predictions.filter(p => (p as any).userId === userId);
  const userInsights = db.insights.filter(i => (i as any).userId === userId);
  
  if (userPredictions.length === 0 && userInsights.length === 0) {
    const defaultPredictions: AIPrediction[] = [
      {
        id: Date.now() + 1,
        userId,
        type: "success_probability",
        title: "Success Probability",
        value: 78,
        trend: "stable",
        reason: "Welcome to TimeHero! Grounding your workspace context.",
        impact: "78% likelihood of successful completion once tasks are populated.",
        createdAt: new Date().toISOString()
      },
      {
        id: Date.now() + 2,
        userId,
        type: "burnout_risk",
        title: "Burnout Risk",
        value: 30,
        trend: "stable",
        reason: "No high-pressure focus blocks scheduled yet.",
        impact: "Low initial burnout risk. Ready for scheduling.",
        createdAt: new Date().toISOString()
      }
    ];
    
    const defaultInsights: InsightItem[] = [
      {
        id: Date.now() + 3,
        userId,
        category: "Focus Pattern",
        text: "Your cognitive flow starts fresh. Populate your calendar to identify peak focus hours.",
        impactPercent: 10,
        createdAt: new Date().toISOString()
      }
    ];
    
    db.predictions.push(...defaultPredictions);
    db.insights.push(...defaultInsights);
    await saveIntelligenceDb(db);
    
    return {
      predictions: defaultPredictions,
      coachingSessions: db.coachingSessions.filter(c => c.userId === userId),
      recoveryPlans: db.recoveryPlans.filter(r => (r as any).userId === userId),
      productivitySnapshots: db.productivitySnapshots.filter(ps => (ps as any).userId === userId),
      insights: defaultInsights,
      recommendations: db.recommendations.filter(r => (r as any).userId === userId),
    };
  }
  
  return {
    predictions: userPredictions,
    coachingSessions: db.coachingSessions.filter(c => c.userId === userId),
    recoveryPlans: db.recoveryPlans.filter(r => (r as any).userId === userId),
    productivitySnapshots: db.productivitySnapshots.filter(ps => (ps as any).userId === userId),
    insights: userInsights,
    recommendations: db.recommendations.filter(r => (r as any).userId === userId),
  };
}

export async function saveUserAIIntelligence(userId: string, updates: Partial<IntelligenceDb>): Promise<void> {
  const db = await loadIntelligenceDb();
  
  if (updates.predictions) {
    db.predictions = db.predictions.filter(p => (p as any).userId !== userId);
    db.predictions.push(...updates.predictions.map(p => ({ ...p, userId })));
  }
  if (updates.coachingSessions) {
    db.coachingSessions = db.coachingSessions.filter(c => c.userId !== userId);
    db.coachingSessions.push(...updates.coachingSessions.map(c => ({ ...c, userId })));
  }
  if (updates.recoveryPlans) {
    db.recoveryPlans = db.recoveryPlans.filter(r => (r as any).userId !== userId);
    db.recoveryPlans.push(...updates.recoveryPlans.map(r => ({ ...r, userId })));
  }
  if (updates.productivitySnapshots) {
    db.productivitySnapshots = db.productivitySnapshots.filter(ps => (ps as any).userId !== userId);
    db.productivitySnapshots.push(...updates.productivitySnapshots.map(ps => ({ ...ps, userId })));
  }
  if (updates.insights) {
    db.insights = db.insights.filter(i => (i as any).userId !== userId);
    db.insights.push(...updates.insights.map(i => ({ ...i, userId })));
  }
  if (updates.recommendations) {
    db.recommendations = db.recommendations.filter(r => (r as any).userId !== userId);
    db.recommendations.push(...updates.recommendations.map(r => ({ ...r, userId })));
  }
  
  await saveIntelligenceDb(db);
}

