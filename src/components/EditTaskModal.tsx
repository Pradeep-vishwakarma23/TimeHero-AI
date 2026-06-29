import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  X, 
  FileText, 
  Calendar, 
  Clock, 
  Tags, 
  Sliders, 
  Check, 
  Layers,
  Percent
} from "lucide-react";
import { Task } from "../types";

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (id: number, updates: Partial<Task>) => void;
  categories?: string[];
}

export default function EditTaskModal({ task, onClose, onSave, categories }: EditTaskModalProps) {
  const [taskName, setTaskName] = useState(task.task);
  const [context, setContext] = useState(task.context || "");
  const [deadline, setDeadline] = useState(task.deadline);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">(task.priority);
  const [effort, setEffort] = useState<number>(task.effort);
  const [category, setCategory] = useState(task.category);
  const [progress, setProgress] = useState<number>(task.progress);
  const [selectedTags, setSelectedTags] = useState<string[]>(task.tags || []);
  const [dueTime, setDueTime] = useState(task.dueTime || "12:00");
  const [aiGenerated, setAiGenerated] = useState(task.aiGenerated || false);

  const availableTags = ["Hackathon", "Pitch", "Demo", "Quality", "Research", "Mobile", "Launch", "Mentor"];

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !task.id) return;

    // Automatically synchronize status with progress
    let updatedStatus = task.status;
    if (progress === 100) {
      updatedStatus = "Completed";
    } else if (task.status === "Completed") {
      updatedStatus = "In Progress";
    }

    const updates: Partial<Task> = {
      task: taskName.trim(),
      context: context.trim(),
      deadline,
      priority,
      effort,
      category,
      progress,
      status: updatedStatus,
      tags: selectedTags,
      dueTime,
      aiGenerated,
    };

    onSave(task.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
        className="relative w-full max-w-2xl bg-[#0e0e12]/95 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6 overflow-hidden my-8"
      >
        {/* Ambient background glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full filter blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-[60px] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              Edit Task Parameters
            </h2>
            <p className="text-xs text-white/50 font-semibold">
              Update task metadata, priority weights, tags, and active progress metrics.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 text-white/60 hover:text-white transition-all"
            id="close-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="relative space-y-5">
          {/* Task Name */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" /> Task Name
            </label>
            <input
              type="text"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-white/30"
            />
          </div>

          {/* Context / Done criteria */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" /> Context & Completion Done Criteria
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="Clarify specific sub-objectives or milestones required to mark this task complete."
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-white/30 leading-relaxed resize-none"
            />
          </div>

          {/* Deadline Date & Priority Select */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> Deadline Date
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Deadline Time
              </label>
              <input
                type="time"
                required
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Priority Weight
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              >
                <option value="Low" className="bg-slate-900 text-white">Low Priority</option>
                <option value="Medium" className="bg-slate-900 text-white">Medium Priority</option>
                <option value="High" className="bg-slate-900 text-white">High Priority</option>
                <option value="Critical" className="bg-slate-900 text-white">Critical Priority</option>
              </select>
            </div>
          </div>

          {/* Effort slider & Category Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-extrabold text-white/60 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" /> Estimated Effort
                </span>
                <span className="text-purple-400 font-black">{effort} hours</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="12"
                step="0.5"
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                className="w-full accent-purple-500 bg-white/10 rounded-lg cursor-pointer h-1.5 mt-2.5"
              />
              <div className="flex justify-between text-[9px] text-white/30 font-bold">
                <span>Quick sprint (30m)</span>
                <span>Deep work session (12h)</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Category Division
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 font-semibold text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              >
                {categories ? (
                  categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#111827] text-white">
                      {cat}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Research" className="bg-[#111827] text-white">Research & Formulation</option>
                    <option value="Design" className="bg-[#111827] text-white">Visual Layout & Design</option>
                    <option value="Development" className="bg-[#111827] text-white">Development & Engineering</option>
                    <option value="Testing" className="bg-[#111827] text-white">Quality Assurance & Testing</option>
                    <option value="Deployment" className="bg-[#111827] text-white">Deployment & Release</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Progress slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-white/60 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-purple-400" /> Active Progress
              </span>
              <span className="text-purple-400 font-black">{progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-purple-500 bg-white/10 rounded-lg cursor-pointer h-1.5 mt-2.5"
            />
          </div>

          {/* Tag Selection Multi-select */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Tags className="w-3.5 h-3.5 text-purple-400" /> Category tags
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all ${
                      isSelected 
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                        : "bg-transparent border-white/10 text-white/50 hover:border-white/20 hover:text-white"
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
              <label className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-purple-400" /> AI Generated Task
              </label>
              <p className="text-[10px] text-white/40">Is this task planned or processed by an AI engine?</p>
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

          {/* Action buttons */}
          <div className="flex justify-end gap-3 border-t border-white/10 pt-5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 hover:text-white text-xs font-extrabold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Parameters
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
