import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Check, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ExternalLink, 
  CheckCircle2, 
  Coffee, 
  Target, 
  TrendingUp, 
  Award, 
  Brain, 
  CalendarRange, 
  Layers,
  ChevronRight,
  Info
} from "lucide-react";
import { Task } from "../types";

interface Session {
  user_id: string;
  name: string;
  email: string;
}

interface CalendarViewProps {
  session: Session;
  tasks: Task[];
  onNavigate: (tab: string) => void;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    date?: string;
  };
  end: {
    dateTime: string;
    date?: string;
  };
  location?: string;
  hangoutLink?: string;
}

interface FreeTimeBlock {
  start: string;
  end: string;
  durationMin: number;
}

interface SmartSuggestion {
  time: string;
  why: string;
}

interface SmartSuggestions {
  deepWork: SmartSuggestion;
  study: SmartSuggestion;
  meetings: SmartSuggestion;
  break: SmartSuggestion;
}

export default function CalendarView({ session, tasks, onNavigate }: CalendarViewProps) {
  // Connection and synchronization state
  const [connected, setConnected] = useState(false);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  // Free Time and AI state
  const [freeBlocks, setFreeBlocks] = useState<FreeTimeBlock[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestions | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [dailyPlan, setDailyPlan] = useState<{ time: string; activity: string }[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  // Add Task to Calendar states
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);

  const activeTasks = tasks.filter(t => t.status !== "Completed");

  // Show inline toast that auto-dismisses
  const showLocalToast = (message: string, type: "success" | "info" | "warning") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchStatusAndEvents = async (forceSync = false) => {
    try {
      if (forceSync) setSyncing(true);
      else setLoading(true);

      // 1. Fetch connection status
      const statusRes = await fetch(`/api/calendar/status?userId=${session.user_id}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setConnected(statusData.connected);
        if (statusData.lastSyncTime) {
          setSyncTime(new Date(statusData.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }

      // 2. Fetch events
      const eventsRes = await fetch(`/api/calendar/events?userId=${session.user_id}${forceSync ? "&forceSync=true" : ""}`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
        calculateFreeTime(eventsData.events || []);
      }
    } catch (err) {
      console.error("Error fetching calendar data:", err);
      showLocalToast("Failed to fetch Google Calendar updates.", "warning");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatusAndEvents();
  }, [session.user_id]);

  // Google OAuth Popup flow
  const handleConnect = async () => {
    try {
      const res = await fetch(`/api/auth/google/url?userId=${session.user_id}&origin=${encodeURIComponent(window.location.origin)}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();

      const width = 520;
      const height = 660;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        data.url,
        "google-calendar-auth",
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
      );

      const handleAuthMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "OAUTH_AUTH_SUCCESS") {
          showLocalToast("Google Calendar integrated successfully!", "success");
          setConnected(true);
          fetchStatusAndEvents(true);
          window.removeEventListener("message", handleAuthMessage);
        }
      };

      window.addEventListener("message", handleAuthMessage);
    } catch (err: any) {
      console.error(err);
      showLocalToast("Unable to start calendar integration popup.", "warning");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar? This will clear all cached sync states.")) return;
    try {
      const res = await fetch("/api/calendar/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user_id })
      });
      if (res.ok) {
        setConnected(false);
        setEvents([]);
        setFreeBlocks([]);
        setSmartSuggestions(null);
        setRecommendations([]);
        setDailyPlan([]);
        showLocalToast("Google Calendar disconnected successfully.", "success");
      }
    } catch (err) {
      showLocalToast("Failed to disconnect calendar.", "warning");
    }
  };

  // Free Time Analysis Algorithm
  const calculateFreeTime = (allEvents: CalendarEvent[]) => {
    // We assume focus hours range from 08:00 to 20:00 (8 AM to 8 PM) today
    const todayStr = new Date().toISOString().split("T")[0];
    const dayStart = new Date(`${todayStr}T08:00:00`);
    const dayEnd = new Date(`${todayStr}T20:00:00`);

    // Filter today's events
    const todayEvents = allEvents.filter(ev => {
      const startStr = ev.start.dateTime || ev.start.date;
      return startStr && startStr.startsWith(todayStr);
    }).map(ev => {
      const start = new Date(ev.start.dateTime || `${todayStr}T09:00:00`);
      const end = new Date(ev.end.dateTime || `${todayStr}T10:00:00`);
      return { start, end };
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    const gaps: FreeTimeBlock[] = [];
    let currentCursor = dayStart;

    for (const ev of todayEvents) {
      if (ev.start > currentCursor) {
        const diffMs = ev.start.getTime() - currentCursor.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin >= 15) { // At least a 15 min focus slot
          gaps.push({
            start: currentCursor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            end: ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            durationMin: diffMin
          });
        }
      }
      if (ev.end > currentCursor) {
        currentCursor = ev.end;
      }
    }

    if (dayEnd > currentCursor) {
      const diffMs = dayEnd.getTime() - currentCursor.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin >= 15) {
        gaps.push({
          start: currentCursor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          end: dayEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          durationMin: diffMin
        });
      }
    }

    setFreeBlocks(gaps);
  };

  // Generate Smart Scheduling from Gemini
  const handleGenerateAiSuggestions = async () => {
    setLoadingAi(true);
    try {
      // Parallelize AI calls for ultra-premium UX
      const [suggestRes, recommendRes, planRes] = await Promise.all([
        fetch(`/api/calendar/suggest?userId=${session.user_id}`),
        fetch(`/api/calendar/recommendations?userId=${session.user_id}`),
        fetch(`/api/calendar/daily-plan?userId=${session.user_id}`)
      ]);

      if (suggestRes.ok) {
        setSmartSuggestions(await suggestRes.json());
      }
      if (recommendRes.ok) {
        setRecommendations(await recommendRes.json());
      }
      if (planRes.ok) {
        setDailyPlan(await planRes.json());
      }
      
      showLocalToast("⚡ Gemini AI smart schedule synthesized!", "success");
    } catch (err) {
      showLocalToast("Failed to consult AI scheduling assistant.", "warning");
    } finally {
      setLoadingAi(false);
    }
  };

  // Add active task to Google Calendar
  const handleAddTaskToCalendar = async (task: Task) => {
    setAddingTaskId(String(task.id));
    try {
      const res = await fetch("/api/calendar/add-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user_id,
          title: task.task,
          description: task.context || `TimeHero active priority task inside category: ${task.category}`,
          priority: task.priority,
          deadline: task.deadline,
          duration: task.effort
        })
      });

      if (res.ok) {
        showLocalToast(`📅 "${task.task}" added to Google Calendar!`, "success");
        fetchStatusAndEvents(true); // force-sync
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to add event");
      }
    } catch (err: any) {
      showLocalToast(err.message || "Unable to sync task to calendar.", "warning");
    } finally {
      setAddingTaskId(null);
    }
  };

  // Auto-run AI suggestions when first loaded and connected
  useEffect(() => {
    if (connected && events.length > 0 && !smartSuggestions) {
      handleGenerateAiSuggestions();
    }
  }, [connected, events.length]);

  // Compute stats for Calendar Insights
  const totalMeetings = events.length;
  const busyHours = events.reduce((acc, ev) => {
    const start = new Date(ev.start.dateTime || "");
    const end = new Date(ev.end.dateTime || "");
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return acc + (end.getTime() - start.getTime()) / 3600000;
    }
    return acc;
  }, 0);
  const freeHours = freeBlocks.reduce((acc, block) => acc + (block.durationMin / 60), 0);
  const longestFocusBlock = freeBlocks.length > 0 
    ? Math.max(...freeBlocks.map(b => b.durationMin)) 
    : 0;

  // Deadline Conflicts Analysis
  const getDeadlineConflicts = () => {
    const conflicts: { title: string; desc: string; date: string }[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Check if any critical tasks due today overlap with heavy meeting schedule
    const criticalDueToday = activeTasks.filter(t => t.deadline === todayStr && t.priority === "Critical");
    if (criticalDueToday.length > 0 && busyHours >= 4) {
      conflicts.push({
        title: "Heavy Calendar Congestion",
        desc: `You have ${criticalDueToday.length} Critical tasks due today, but your calendar is packed with ${busyHours.toFixed(1)} hours of meetings. High risk of missing deadline.`,
        date: todayStr
      });
    }

    // Explicit overlap checker: if task name matches an event description or occurs on the same busy day
    for (const t of activeTasks) {
      const match = events.find(ev => ev.summary.toLowerCase().includes(t.task.toLowerCase()) || (ev.description && ev.description.toLowerCase().includes(t.task.toLowerCase())));
      if (match) {
        conflicts.push({
          title: "Redundant Booking Conflict",
          desc: `The task "${t.task}" is already booked on your calendar as "${match.summary}". Check if this is a double booking.`,
          date: t.deadline
        });
      }
    }

    return conflicts;
  };

  const conflictsList = getDeadlineConflicts();

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-xl border bg-slate-950 border-purple-500/30 shadow-2xl backdrop-blur-xl animate-slide-up">
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 text-purple-400 shrink-0" />}
          {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-bold text-white/90 leading-tight">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/30 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-900/20 rounded-full filter blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-purple-300 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Google Calendar
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
              Your Day, Harmonized.
            </h1>
            <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-2xl">
              Connect Google Calendar to synchronize deadlines, detect upcoming schedule congestion, and let Gemini coordinate your optimal focus flow.
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            {connected ? (
              <button
                onClick={() => fetchStatusAndEvents(true)}
                disabled={syncing}
                className="px-4 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Calendar"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* CONNECT CALENDAR SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-white">Google Integration Status</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Google OAuth synchronization securely retrieves read-only schedules and creates task events directly in your calendar. 
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            {connected ? (
              <>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Connected to Google Calendar
                </div>
                {syncTime && (
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                    Last synced: {syncTime}
                  </span>
                )}
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 font-bold text-xs rounded-xl transition-all"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs font-bold text-yellow-500">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  Not Connected
                </div>
                <button
                  onClick={handleConnect}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Connect Google Calendar
                </button>
              </>
            )}
          </div>
        </div>

        {/* CALENDAR INSIGHTS */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-white/40">Calendar Insights</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[10px] font-bold text-white/50 uppercase">Meetings Today</span>
              <strong className="text-lg font-black text-white">{totalMeetings}</strong>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[10px] font-bold text-white/50 uppercase">Busy Hours</span>
              <strong className="text-lg font-black text-white">{busyHours.toFixed(1)}h</strong>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[10px] font-bold text-white/50 uppercase">Free Gaps</span>
              <strong className="text-lg font-black text-white">{freeHours.toFixed(1)}h</strong>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[10px] font-bold text-white/50 uppercase">Max Focus Block</span>
              <strong className="text-lg font-black text-white">
                {longestFocusBlock ? `${(longestFocusBlock/60).toFixed(1)}h` : "N/A"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* CONFLICTS ALERT CARD */}
      {connected && conflictsList.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-extrabold text-rose-400 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Detected Deadline & Scheduling Conflicts
          </h3>
          <div className="space-y-3">
            {conflictsList.map((c, i) => (
              <div key={i} className="bg-white/5 border border-rose-500/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">{c.title}</h4>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">{c.desc}</p>
                </div>
                <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/10">
                  Due: {c.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {connected ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: FIXED CALENDAR SCHEDULE & FREE TIME */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* TODAY'S FIXED SCHEDULE */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 mb-4 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-purple-400" />
                Today's Fixed Events
              </h3>

              {events.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  No upcoming meetings found today.
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {events.map((ev) => {
                    const startStr = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "All Day";
                    return (
                      <div key={ev.id} className="bg-white/5 border border-white/5 hover:border-purple-500/20 p-3.5 rounded-xl transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-extrabold text-white leading-normal">{ev.summary}</h4>
                          <span className="text-[10px] font-black text-purple-300 shrink-0 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10">
                            {startStr}
                          </span>
                        </div>
                        {ev.location && (
                          <div className="text-[10px] text-white/40 font-medium flex items-center gap-1.5 mt-2">
                            <MapPin className="w-3 h-3 text-white/30" />
                            {ev.location}
                          </div>
                        )}
                        {ev.description && (
                          <p className="text-[10px] text-white/50 mt-1.5 leading-relaxed italic line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                        {ev.hangoutLink && (
                          <a
                            href={ev.hangoutLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-purple-400 hover:text-purple-300 font-extrabold flex items-center gap-1 mt-2.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Join Video Call
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FREE TIME SLOTS */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-emerald-400" />
                Available Focus Blocks
              </h3>

              {freeBlocks.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  No significant focus gaps found today.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {freeBlocks.map((b, idx) => {
                    const hours = b.durationMin / 60;
                    const label = hours >= 2 ? "Deep Work Slot" : hours >= 1 ? "Study Window" : "Short Gap";
                    const color = hours >= 2 ? "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-300" : "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-300";
                    
                    return (
                      <div key={idx} className={`bg-gradient-to-r ${color} border p-3.5 rounded-xl flex items-center justify-between`}>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">
                            {label}
                          </span>
                          <span className="text-xs font-bold text-white/90">
                            {b.start} - {b.end}
                          </span>
                        </div>
                        <span className="text-xs font-black">
                          {hours >= 1 ? `${hours.toFixed(1)}h` : `${b.durationMin}m`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: AI SMART SCHEDULING, DAILY PLAN, RECOMMENDATIONS */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* AI PLANNER & RECOMMENDED TASK SYNC */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  Sync Active Tasks to Google Calendar
                </span>
                <span className="text-[10px] text-white/40 font-bold uppercase">
                  {activeTasks.length} active tasks
                </span>
              </h3>

              {activeTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  No active tasks found in TimeHero pipeline.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTasks.map((task) => {
                    let pBadge = "bg-rose-500/10 text-rose-400 border-rose-500/10";
                    if (task.priority === "High") pBadge = "bg-amber-500/10 text-amber-400 border-amber-500/10";
                    else if (task.priority === "Medium") pBadge = "bg-indigo-500/10 text-indigo-400 border-indigo-500/10";
                    else if (task.priority === "Low") pBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";

                    const isSyncing = addingTaskId === String(task.id);

                    return (
                      <div key={task.id} className="bg-white/5 border border-white/5 hover:border-white/10 p-4 rounded-xl flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${pBadge}`}>
                              {task.priority}
                            </span>
                            <span className="text-[10px] text-white/40 font-bold">
                              Due: {task.deadline}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-white line-clamp-1">{task.task}</h4>
                          <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed">
                            {task.context || "No context defined."}
                          </p>
                        </div>

                        <button
                          onClick={() => handleAddTaskToCalendar(task)}
                          disabled={isSyncing}
                          className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 hover:border-purple-500/40 text-purple-200 font-extrabold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          {isSyncing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Adding event...
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5" />
                              Add to Google Calendar
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI SMART SCHEDULING CARD */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full filter blur-2xl" />
              
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-purple-400" />
                    Gemini Smart Scheduling Assistant
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    AI analyzes your calendar meetings, pipeline workloads, and focus state to coordinate optimal execution timeframes.
                  </p>
                </div>

                <button
                  onClick={handleGenerateAiSuggestions}
                  disabled={loadingAi}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-purple-500/10 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {loadingAi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Consulting Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Suggest Best Time
                    </>
                  )}
                </button>
              </div>

              {smartSuggestions ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Suggestion 1: Deep Work */}
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Deep Work focus</span>
                      <span className="text-xs font-bold text-white bg-purple-500/10 px-2 py-0.5 rounded">
                        {smartSuggestions.deepWork.time}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{smartSuggestions.deepWork.why}</p>
                  </div>

                  {/* Suggestion 2: Study */}
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Study window</span>
                      <span className="text-xs font-bold text-white bg-amber-500/10 px-2 py-0.5 rounded">
                        {smartSuggestions.study.time}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{smartSuggestions.study.why}</p>
                  </div>

                  {/* Suggestion 3: Meetings */}
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Consolidated meetings</span>
                      <span className="text-xs font-bold text-white bg-indigo-500/10 px-2 py-0.5 rounded">
                        {smartSuggestions.meetings.time}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{smartSuggestions.meetings.why}</p>
                  </div>

                  {/* Suggestion 4: Break */}
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Strategic Break</span>
                      <span className="text-xs font-bold text-white bg-emerald-500/10 px-2 py-0.5 rounded">
                        {smartSuggestions.break.time}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{smartSuggestions.break.why}</p>
                  </div>

                </div>
              ) : (
                <div className="py-10 border border-dashed border-white/10 rounded-2xl text-center text-xs text-white/40">
                  Click "Suggest Best Time" to trigger deep schedule audit.
                </div>
              )}
            </div>

            {/* AI DAILY PLAN & RECOMMENDATIONS ROW */}
            {smartSuggestions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* AI DAILY PLAN */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Today's AI Daily Plan
                  </h3>
                  <div className="space-y-3.5 relative border-l border-white/10 ml-2.5 pl-4">
                    {dailyPlan.map((item, idx) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-[#090514] group-hover:scale-125 transition-transform" />
                        <span className="text-[10px] font-black text-purple-400">{item.time}</span>
                        <h4 className="text-xs font-bold text-white/90 mt-0.5">{item.activity}</h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI CALENDAR RECOMMENDATIONS */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" />
                    AI Calendar Recommendations
                  </h3>
                  <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-3 bg-white/5 hover:bg-white/10 p-3.5 rounded-xl border border-white/10 transition-all">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0 animate-pulse" />
                        <p className="text-xs text-white/70 leading-relaxed font-semibold">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="py-24 border border-dashed border-white/10 rounded-3xl text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            📅
          </div>
          <div className="space-y-2 px-6">
            <h3 className="text-lg font-extrabold text-white">Google Calendar Integration</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Unlock the full scheduling power of TimeHero AI. Synchronize meetings, inspect overlap bottlenecks, and receive real-time schedule strategies from Gemini.
            </p>
          </div>
          <button
            onClick={handleConnect}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20"
          >
            Connect My Google Calendar
          </button>
        </div>
      )}
    </div>
  );
}
