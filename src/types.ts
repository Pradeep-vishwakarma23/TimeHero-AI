export interface Task {
  id?: number;
  userId?: string;
  task: string;
  category: string;
  deadline: string; // YYYY-MM-DD
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  effort: number;
  tags: string[];
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
  attachments?: { name: string; size: number; type: string; dataUrl: string; uploadedAt: string }[];
}

export interface TaskPlanPhase {
  phase: string;
  owner: string;
  dateOffset: number;
  duration: string;
  progress: number;
  milestones: string[];
}

export interface FuturePredictionResult {
  successProbability: number;
  stressIncrease: number;
  recoveryHours: number;
  riskValue: number;
  predictionText: string;
  recoveryPlan: { title: string; text: string }[];
}

export interface CoachReply {
  reply: string;
  suggestions: { title: string; text: string }[];
  energyScore: number;
  workloadScore: number;
  burnoutRisk: 'Low' | 'Medium' | 'High';
}

export interface ProductivityInsight {
  title: string;
  text: string;
}

export interface DashboardStats {
  productivityScore: number;
  deadlineHealth: number;
  focusHours: number;
  avgRisk: number;
  dueToday: number;
  totalTasks: number;
  completedTasks: number;
}
