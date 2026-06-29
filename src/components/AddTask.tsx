import React, { useState } from "react";
import { 
  PlusCircle, 
  Sparkles, 
  Calendar, 
  Sliders, 
  Tags, 
  HelpCircle,
  AlertTriangle,
  FileText,
  CalendarDays,
  Clock,
  TrendingUp,
  Flame,
  CheckCircle2
} from "lucide-react";
import { Task } from "../types";

interface AddTaskProps {
  onTaskAdded: () => void;
}

export default function AddTask({ onTaskAdded }: AddTaskProps) {
  const [taskName, setTaskName] = useState("");
  const [context, setContext] = useState("");
  
  // Format today's date + 2 days for initial default
  const getFutureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const [deadline, setDeadline] = useState(getFutureDate(2));
  const [dueTime, setDueTime] = useState("12:00");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("High");
  const [effort, setEffort] = useState<number>(2.5);
  const [category, setCategory] = useState("Development");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Hackathon"]);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const availableTags = ["Hackathon", "Pitch", "Demo", "Quality", "Research", "Mobile", "Launch", "Mentor"];

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    setLoading(true);
    setSuccess(null);

    const newTask: Omit<Task, "id"> = {
      task: taskName.trim(),
      category,
      deadline,
      priority,
      effort,
      tags: selectedTags,
      progress: 0,
      status: "Queued",
      context: context.trim(),
      dueTime,
      aiGenerated
    };

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });

      if (res.ok) {
        setSuccess(`Task added successfully: "${newTask.task}"`);
        setTaskName("");
        setContext("");
        setSelectedTags(["Hackathon"]);
        onTaskAdded();
      } else {
        throw new Error("Failed to add task");
      }
    } catch (err) {
      console.error("Error adding task:", err);
    } finally {
      setLoading(false);
    }
  };

  // Live Calculations for interactive preview
  const getDaysLeft = () => {
    const deadDate = new Date(deadline);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = deadDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateRiskAndSuccess = () => {
    const daysLeft = getDaysLeft();
    const priorityWeight = { Low: 12, Medium: 28, High: 45, Critical: 58 }[priority] || 28;
    const deadlinePressure = Math.max(0, 44 - (daysLeft * 9));
    const workloadPressure = Math.min(28, effort * 4.5);
    const overduePressure = daysLeft < 0 ? 20 : 0;
    const score = Math.max(4, Math.min(98, priorityWeight + deadlinePressure + workloadPressure + overduePressure));

    let label = "Low";
    let color = "text-emerald-400";
    let bg = "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 74) {
      label = "High";
      color = "text-red-400";
      bg = "bg-red-500/10 border-red-500/20";
    } else if (score >= 44) {
      label = "Medium";
      color = "text-amber-400";
      bg = "bg-amber-500/10 border-amber-500/20";
    }

    const successProb = Math.max(28, 100 - score + 12);
    
    let recommendation = "Batch this with similar low-pressure task cards.";
    if (score >= 74) {
      recommendation = "Start today with a 25-minute kickoff focus block sprint.";
    } else if (score >= 44) {
      recommendation = "Reserve one dedicated focus sprint block before the deadline.";
    }

    return { label, score, color, bg, successProb, recommendation, daysLeft };
  };

  const preview = calculateRiskAndSuccess();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/30 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-900/20 rounded-full filter blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-purple-300 uppercase tracking-widest">
            <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
            AddTask
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
            Capture the task. Let TimeHero AI shape the plan.
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-3xl">
            A premium intake interface with integrated deadline risk scoring, effort assessment, tags, and immediate action-plan recommendations.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Deadline Picker
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Priority Selector
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Effort Estimate
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Category Tags
            </span>
          </div>
        </div>
      </section>

      {/* Main split form split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Input Intake Form (7 Columns) */}
        <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Task Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" /> Task name
              </label>
              <input
                type="text"
                required
                placeholder="Example: Polish the hackathon demo presentation walkthrough"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3.5 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-white/30"
              />
            </div>

            {/* Done context / Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-400" /> Done state & context
              </label>
              <textarea
                placeholder="What does completed look like? Mention specific outcomes, roadblocks, or constraints."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3.5 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-white/30 leading-relaxed resize-none"
              />
            </div>

            {/* Priority & Deadline selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-400" /> Deadline Date
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3.5 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-400" /> Deadline Time
                </label>
                <input
                  type="time"
                  required
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3.5 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-400" /> Priority Select
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3.5 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                >
                  <option value="Low" className="bg-slate-900 text-white">Low Priority</option>
                  <option value="Medium" className="bg-slate-900 text-white">Medium Priority</option>
                  <option value="High" className="bg-slate-900 text-white">High Priority</option>
                  <option value="Critical" className="bg-slate-900 text-white">Critical Priority</option>
                </select>
              </div>
            </div>

            {/* Effort slider & Category select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                  <span>Estimated effort</span>
                  <span className="text-purple-400 font-extrabold">{effort} hours</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={effort}
                  onChange={(e) => setEffort(Number(e.target.value))}
                  className="w-full accent-purple-500 bg-white/10 rounded-lg cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-white/40 font-bold">
                  <span>Quick task (30m)</span>
                  <span>Deep work sprint (12h)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Category category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3.5 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                >
                  <option value="Research" className="bg-slate-900 text-white">Research & Formulation</option>
                  <option value="Design" className="bg-slate-900 text-white">Visual Layout & Design</option>
                  <option value="Development" className="bg-slate-900 text-white">Development & Engineering</option>
                  <option value="Testing" className="bg-slate-900 text-white">Quality Assurance & Testing</option>
                  <option value="Deployment" className="bg-slate-900 text-white">Deployment & Release</option>
                </select>
              </div>
            </div>

            {/* Tag pills multiselect */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Tags className="w-4 h-4 text-purple-400" /> Category tags
              </label>
              <div className="flex flex-wrap gap-2 pt-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`text-xs px-3.5 py-2.5 rounded-xl border font-bold transition-all ${
                        isSelected 
                          ? "bg-white/15 border-white/20 text-purple-200"
                          : "bg-transparent border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Generated Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" /> AI Generated Task
                </label>
                <p className="text-[10px] text-white/40">Check this if the task was initiated or prepared by AI.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={aiGenerated} 
                  onChange={(e) => setAiGenerated(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Success notification */}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex gap-2.5 text-emerald-400 text-xs font-bold items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !taskName.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-lg transition-all duration-150 flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
            >
              <PlusCircle className="w-5 h-5" />
              Add task to SQLite action plan
            </button>

          </form>
        </div>

        {/* Right: Smart Recommendations & Visual Preview (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Real-time calculated preview parameters */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/40 mb-5">Smart Recommendations</h3>
            
            <div className="grid grid-cols-2 gap-4">
              
              {/* Calculated risk score */}
              <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-purple-400" />
                  Deadline Risk
                </span>
                <div className={`text-2xl font-black mt-2 ${preview.color}`}>{preview.label}</div>
                <span className="text-[10px] text-white/40 font-semibold block mt-1">{preview.score}% stress rating</span>
              </div>

              {/* Days left calculation */}
              <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4 text-cyan-400" />
                  Days left
                </span>
                <div className="text-2xl font-black text-white mt-2">
                  {preview.daysLeft === 0 ? "Today" : preview.daysLeft < 0 ? `${Math.abs(preview.daysLeft)} overdue` : preview.daysLeft}
                </div>
                <span className="text-[10px] text-white/40 font-semibold block mt-1">Calendar buffer space</span>
              </div>

              {/* Effort preview */}
              <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Effort Hours
                </span>
                <div className="text-2xl font-black text-white mt-2">{effort}h</div>
                <span className="text-[10px] text-white/40 font-semibold block mt-1">Estimated deep focus</span>
              </div>

              {/* Success Probability */}
              <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Success Rate
                </span>
                <div className="text-2xl font-black text-white mt-2">{preview.successProb}%</div>
                <span className="text-[10px] text-white/40 font-semibold block mt-1">Adaptive simulation</span>
              </div>

            </div>
          </div>

          {/* AI recommendations widget block */}
          <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full filter blur-xl pointer-events-none" />
            
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3.5">
              <Sparkles className="w-4.5 h-4.5 text-purple-400" />
              Instant AI Recommendation
            </h3>
            
            <p className="text-xs text-purple-100 font-semibold leading-relaxed">
              For <strong className="text-white">"{taskName || "your unnamed task"}"</strong>: {preview.recommendation} 
              We suggest splitting this item into individual Research, Design, Development, Testing, and Deployment phases before starting work.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
