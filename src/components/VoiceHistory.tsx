import React, { useEffect, useState } from "react";
import { Mic, CheckCircle, AlertTriangle, Clock, Play, Calendar, Trash2 } from "lucide-react";

interface VoiceHistoryItem {
  id: number;
  userId: string;
  transcript: string;
  aiInterpretation: string;
  executionResult: string;
  success: boolean;
  createdAt: string;
}

interface VoiceHistoryProps {
  session: { user_id: string; email: string };
  onNavigate: (tab: string) => void;
  fetchTasksAndStats: () => Promise<void>;
}

export default function VoiceHistory({ session, onNavigate, fetchTasksAndStats }: VoiceHistoryProps) {
  const [history, setHistory] = useState<VoiceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/voice/history/${session.user_id}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch voice history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [session.user_id]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="voice-history-view" className="animate-fade-in space-y-8">
      {/* Header Info Banner */}
      <div 
        id="voice-history-header-card"
        className="w-full flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md"
        style={{
          boxSizing: "border-box"
        }}
      >
        <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl shrink-0">
          <Mic className="w-6 h-6 text-purple-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">Voice Assistant Logs</h2>
          <p className="text-xs text-white/50 mt-0.5">Review every voice command, AI extraction, and system transaction processed by TimeHero Voice.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-extrabold tracking-widest uppercase">Fetching interaction history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center max-w-lg mx-auto">
          <Mic className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No voice records found</h3>
          <p className="text-sm text-slate-400 mt-2">
            You haven't issued any voice commands yet. Tap the floating microphone button in the bottom-right of the dashboard to schedule your first task!
          </p>
          <button
            onClick={() => onNavigate("Dashboard")}
            className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-bold text-white uppercase tracking-wider transition-all duration-150"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {history.map((item) => {
            let parsedDetails: any = null;
            try {
              if (item.aiInterpretation) {
                parsedDetails = JSON.parse(item.aiInterpretation);
              }
            } catch (e) {
              // ignore
            }

            const isTask = parsedDetails && !parsedDetails.isCommand && parsedDetails.extractedTask;
            const taskInfo = isTask ? parsedDetails.extractedTask : null;

            return (
              <div
                key={item.id}
                className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-purple-500/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.success 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {item.success ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(item.createdAt)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isTask 
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                            : item.success && parsedDetails?.commandType !== "none"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {isTask 
                            ? "Voice Scheduling" 
                            : parsedDetails?.commandType !== "none" 
                            ? `Command: ${parsedDetails?.commandType}` 
                            : "Interaction"}
                        </span>
                      </div>
                      
                      {/* Transcript */}
                      <p className="text-base font-bold text-white mt-2 italic leading-relaxed">
                        "{item.transcript}"
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">Status</span>
                    <span className={`text-xs font-extrabold uppercase tracking-wider block mt-1 ${
                      item.success ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {item.success ? "Success" : "Failed"}
                    </span>
                  </div>
                </div>

                {/* AI Extracted details */}
                {parsedDetails && (
                  <div className="mt-5 pt-5 border-t border-white/5 grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        ⚡ AI Interpretation Details
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed bg-white/5 border border-white/5 rounded-xl p-3">
                        {parsedDetails.speechResponse || "No vocal feedback generated."}
                      </p>
                      
                      {parsedDetails.suggestion && (
                        <div className="mt-3 p-3 rounded-xl bg-purple-950/10 border border-purple-500/15">
                          <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-widest block">
                            💡 Follow-up Smart Suggestion
                          </span>
                          <p className="text-xs text-slate-300 mt-1">{parsedDetails.suggestion}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        🛠️ Workflow Execution Log
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                          <span className="text-slate-500">Execution Result:</span>
                          <span className="font-bold text-white">{item.executionResult || "Done"}</span>
                        </div>
                        {taskInfo && (
                          <>
                            <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                              <span className="text-slate-500">Scheduled Task Name:</span>
                              <span className="font-bold text-purple-300">{taskInfo.task}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                              <span className="text-slate-500">Computed Deadline:</span>
                              <span className="font-bold text-white flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                {taskInfo.deadline}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                              <span className="text-slate-500">Urgency Level:</span>
                              <span className={`font-extrabold ${
                                taskInfo.priority === "Critical" 
                                  ? "text-rose-400" 
                                  : taskInfo.priority === "High" 
                                  ? "text-orange-400" 
                                  : taskInfo.priority === "Medium" 
                                  ? "text-indigo-400" 
                                  : "text-slate-400"
                              }`}>
                                {taskInfo.priority}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-1.5">
                              <span className="text-slate-500">Estimated Duration:</span>
                              <span className="font-bold text-white">{taskInfo.effort} hours</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
