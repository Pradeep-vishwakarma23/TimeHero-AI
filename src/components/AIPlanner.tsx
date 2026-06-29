import React, { useState, useEffect } from "react";
import { 
  CalendarCheck, 
  Sparkles, 
  Play, 
  AlertTriangle, 
  User, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Target
} from "lucide-react";
import { Task, TaskPlanPhase } from "../types";

interface AIPlannerProps {
  tasks: Task[];
  onAddTask?: () => void;
}

export default function AIPlanner({ tasks, onAddTask }: AIPlannerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [customTaskName, setCustomTaskName] = useState("");
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<TaskPlanPhase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Default tasks selection list
  const activeTasks = tasks.filter((t) => t.status !== "Completed");

  // Load a default breakdown based on first task on load
  useEffect(() => {
    if (activeTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(String(activeTasks[0].id));
    }
  }, [tasks]);

  const handleGenerateBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let taskName = "";
    let context = "";
    let deadline = "";
    let priority = "High";
    let effort = 3.0;

    if (selectedTaskId === "custom") {
      if (!customTaskName.trim()) {
        setError("Please enter a custom task name");
        setLoading(false);
        return;
      }
      taskName = customTaskName.trim();
      context = "Custom user inputted task to plan and structure.";
    } else {
      const found = tasks.find((t) => String(t.id) === selectedTaskId);
      if (!found) {
        setError("Selected task not found");
        setLoading(false);
        return;
      }
      taskName = found.task;
      context = found.context || "";
      deadline = found.deadline;
      priority = found.priority;
      effort = found.effort;
    }

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskName, context, deadline, priority, effort }),
      });

      if (res.ok) {
        const data = await res.json();
        setPhases(data);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate plan");
      }
    } catch (err: any) {
      console.error("Error generating AI plan:", err);
      setError(err.message || "Unable to connect to Gemini API. Loaded default planning timeline instead.");
      setPhases(getFallbackPhases(taskName, effort));
    } finally {
      setLoading(false);
    }
  };

  const handleImportToTasks = async () => {
    if (phases.length === 0) return;
    setImporting(true);
    let successCount = 0;
    try {
      const parentTask = tasks.find((t) => String(t.id) === selectedTaskId);
      const baseTaskName = parentTask?.task || customTaskName || "Decomposed Task";
      const basePriority = parentTask?.priority || "Medium";
      const baseCategory = parentTask?.category || "Research";

      for (const p of phases) {
        const title = `[${p.phase}] ${baseTaskName}`;
        const description = `Phase: ${p.phase}\nOwner: ${p.owner}\nDuration: ${p.duration}\nMilestones:\n${p.milestones.map((m) => `- ${m}`).join("\n")}`;
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (p.dateOffset || 0));
        const dueDateStr = dueDate.toISOString().split("T")[0];

        const numericEffort = parseFloat(p.duration) || 1.0;

        const taskPayload = {
          title,
          task: title,
          description,
          context: description,
          priority: basePriority,
          category: baseCategory,
          dueDate: dueDateStr,
          deadline: dueDateStr,
          dueTime: "12:00",
          estimatedHours: numericEffort,
          effort: numericEffort,
          tags: ["AI Planner", p.phase],
          calendarEvent: false,
          progress: 0,
          status: "Queued",
          aiGenerated: true
        };

        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskPayload)
        });

        if (res.ok) {
          successCount++;
        }
      }

      if (successCount > 0) {
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: `🎉 Successfully scheduled ${successCount} sub-tasks into your pipeline!`, type: "success" }
        }));
        if (onAddTask) {
          onAddTask();
        }
      }
    } catch (err) {
      console.error("Error importing tasks:", err);
      window.dispatchEvent(new CustomEvent("timehero-toast", {
        detail: { message: `Error scheduling sub-tasks.`, type: "warning" }
      }));
    } finally {
      setImporting(false);
    }
  };

  const getFallbackPhases = (name: string, effort: number): TaskPlanPhase[] => {
    return [
      {
        phase: "Research",
        owner: "AI Planner",
        dateOffset: 0,
        duration: "45 min",
        progress: 100,
        milestones: [
          `Gather documentation for "${name}"`,
          "Draft step-by-step feature requirements outline",
          "Identify critical technical barriers"
        ]
      },
      {
        phase: "Design",
        owner: "Product Designer",
        dateOffset: 1,
        duration: "2 hours",
        progress: 72,
        milestones: [
          "Create functional interface layout grids",
          "Define typography pairings and visual spacing hierarchy",
          "Review interactions design with mockup flow"
        ]
      },
      {
        phase: "Development",
        owner: "Builder",
        dateOffset: 2,
        duration: `${Math.ceil(effort * 0.6)} hours`,
        progress: 46,
        milestones: [
          "Establish core models and schema bindings",
          "Implement core user interaction event handlers",
          "Connect persistent states and data retrieval APIs"
        ]
      },
      {
        phase: "Testing",
        owner: "Quality",
        dateOffset: 3,
        duration: "90 min",
        progress: 22,
        milestones: [
          "Verify dynamic layout on variable viewport sizes",
          "Execute form validation and boundary value testing",
          "Simulate network drops and high-latency replies"
        ]
      },
      {
        phase: "Deployment",
        owner: "Launch",
        dateOffset: 4,
        duration: "60 min",
        progress: 8,
        milestones: [
          "Confirm clean compile of TypeScript client assets",
          "Construct manual release documentation file",
          "Perform rehearsal of live walk-through and presentation script"
        ]
      }
    ];
  };

  // Compute overall average progress
  const overallProgress = phases.length > 0 
    ? Math.round(phases.reduce((acc, p) => acc + p.progress, 0) / phases.length)
    : 0;

  // Custom SVG Completion Timeline Chart
  const renderTimelineChart = () => {
    if (phases.length === 0) return null;
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/40 mb-6">Estimated Completion Timeline</h3>
        
        <div className="space-y-5">
          {phases.map((p, idx) => {
            // Distribute bar horizontally by dateOffset
            const startPct = `${(p.dateOffset / 5) * 80}%`;
            const widthPct = "20%";
            return (
              <div key={idx} className="grid grid-cols-12 items-center gap-4 text-xs font-bold text-white/70">
                <div className="col-span-3 text-white truncate">{p.phase}</div>
                <div className="col-span-9 h-6 w-full bg-white/5 rounded-lg relative overflow-hidden">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-purple-500/20 to-indigo-500/35 border border-purple-500/30 rounded-md shadow-inner flex items-center justify-end px-2"
                    style={{ left: startPct, width: widthPct }}
                  >
                    <span className="text-[9px] text-purple-300 font-extrabold">{p.duration}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-5 text-center text-[10px] text-white/40 font-extrabold mt-6 border-t border-white/10 pt-4">
          <div>Today</div>
          <div>Tomorrow</div>
          <div>Day 3</div>
          <div>Day 4</div>
          <div>Day 5</div>
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
            <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
            AI Planner
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
            From vague task to shippable roadmap.
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-3xl">
            TimeHero AI decomposes heavy workloads into streamlined phases, generating customized action steps and visual milestones instantly.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Timeline Cards
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Estimated Dates
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Progress Tracker
            </span>
            <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-white/80">
              Action Milestones
            </span>
          </div>
        </div>
      </section>

      {/* Task Selector Form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <form onSubmit={handleGenerateBreakdown} className="space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/40">Select Task to Decompose</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs text-white/70 font-bold">Choose an active task</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl py-3 px-4 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
              >
                {activeTasks.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.task} ({t.category})
                  </option>
                ))}
                <option value="custom" className="bg-slate-900 text-white">+ Create Custom Planning Task...</option>
              </select>
            </div>

            {selectedTaskId === "custom" && (
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs text-white/70 font-bold">Custom Task Name</label>
                <input
                  type="text"
                  placeholder="e.g. Set up production CI/CD server"
                  value={customTaskName}
                  onChange={(e) => setCustomTaskName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl py-3 px-4 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
              </div>
            )}

            <div className={`md:col-span-3 ${selectedTaskId === "custom" ? "" : "md:col-span-7"}`}>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-lg transition-all duration-150 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Generating roadmap...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    Generate Plan via Gemini
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4.5 flex gap-3 text-amber-400 text-xs items-start leading-relaxed shadow-lg">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <div className="w-full">
            <span className="font-bold block mb-1">Notice</span>
            {error}
          </div>
        </div>
      )}

      {/* Breakdown Details Grid */}
      {phases.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Overall Progress & Timeline list */}
          <div className="space-y-6">
            
            {/* Overall launch plan metrics */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-md">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/40">Launch Plan</h3>
                <div className="text-4xl font-black text-white mt-3">{overallProgress}%</div>
                <p className="text-xs text-white/50 mt-1">Average weighted execution milestone metrics</p>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden mt-6">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <button
                type="button"
                disabled={importing}
                onClick={handleImportToTasks}
                className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/55 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-md"
              >
                {importing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Scheduling tasks...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4 text-purple-200" />
                    Schedule Decomposed Tasks in Pipeline
                  </>
                )}
              </button>
            </div>

            {/* Individual Phase Cards with Milestones */}
            <div className="space-y-4">
              {phases.map((p, idx) => {
                let badgeColor = "bg-rose-500/10 border-rose-500/30 text-rose-400";
                if (p.progress >= 85) badgeColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                else if (p.progress >= 50) badgeColor = "bg-amber-500/10 border-amber-500/30 text-amber-400";

                return (
                  <div key={idx} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 shadow-xl transition-all duration-200 backdrop-blur-md">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <h4 className="text-base font-extrabold text-white leading-normal">{p.phase}</h4>
                        <span className="text-[10px] text-white/50 font-semibold mt-0.5 block flex items-center gap-1.5">
                          <User className="w-3 h-3 text-white/40" /> {p.owner} • <Clock className="w-3 h-3 text-white/40" /> {p.duration} focus
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {p.progress}%
                      </span>
                    </div>

                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>

                    {/* Milestones Bullet Checklist */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-purple-400" /> Actionable Milestones
                      </h5>
                      <ul className="space-y-2 text-xs font-semibold text-white/70 pl-1 mt-2">
                        {p.milestones.map((milestone, mIdx) => (
                          <li key={mIdx} className="flex gap-2 items-start leading-relaxed">
                            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <span>{milestone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right: Gantt completion graph and smart insights (5 Columns) */}
          <div className="space-y-6">
            {renderTimelineChart()}

            {/* Smart milestones tips block */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full filter blur-xl" />
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/40 mb-5">AI Strategy Recommendations</h3>
              
              <div className="space-y-4">
                {[
                  { title: "Research checkpoint", text: "Confirm the highest-emotion user pain points (e.g. missed commitments, stress buildup) to validate the visual layout." },
                  { title: "Design constraint", text: "Ensure the Future You Simulator is the most visual and interactive moment in the presentation." },
                  { title: "Development pipeline", text: "Store API states in persistent layers to ensure the demo behaves exactly like a production app." },
                  { title: "Deployment walk-through", text: "Construct a clean narrative story showing a customer going from total deadline panic to pure planning calm in under 90 seconds." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3.5 bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/10 transition-all duration-200">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 mt-1.5 shrink-0 shadow-md shadow-purple-400/50 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">{item.title}</h4>
                      <p className="text-xs text-white/60 mt-1.5 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
