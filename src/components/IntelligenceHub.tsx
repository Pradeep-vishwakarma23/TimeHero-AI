import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Mail, 
  Sliders, 
  Terminal, 
  Search, 
  Filter, 
  Check, 
  Clock, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  Trophy, 
  Eye, 
  Send, 
  Activity, 
  BarChart3, 
  MailCheck, 
  Play, 
  ArrowRight,
  Sparkle,
  CheckCircle
} from "lucide-react";

interface Notification {
  id: number;
  userId: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

interface EmailLog {
  id: number;
  userId: string;
  type: string;
  subject: string;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  status: string;
  recipientEmail?: string;
  senderEmail?: string;
  provider?: string;
  providerMessageId?: string | null;
  errorMessage?: string;
  requestPayload?: string;
  responsePayload?: string;
}

interface EmailMetrics {
  totalSent: number;
  delivered: number;
  failed: number;
  pending: number;
  successRate: number;
  lastEmailTime: string | null;
}

interface DebugEmail {
  id: number;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
}

interface NotificationPreferences {
  dailyBrief: boolean;
  deadlineAlerts: boolean;
  weeklyReport: boolean;
  aiCoach: boolean;
  futureYou: boolean;
  recoveryEmails: boolean;
  achievements: boolean;
  marketingEmails: boolean;
}

export default function IntelligenceHub({ session }: { session: any }) {
  const [activeSubTab, setActiveSubTab] = useState<"notifications" | "analytics" | "simulator" | "preferences">("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailMetrics, setEmailMetrics] = useState<EmailMetrics | null>(null);
  const [debugEmails, setDebugEmails] = useState<DebugEmail[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    dailyBrief: true,
    deadlineAlerts: true,
    weeklyReport: true,
    aiCoach: true,
    futureYou: true,
    recoveryEmails: true,
    achievements: true,
    marketingEmails: false,
  });

  // Filters
  const [notifFilter, setNotifFilter] = useState("All");
  const [notifSearch, setNotifSearch] = useState("");
  
  // Custom email for simulation
  const [simEmail, setSimEmail] = useState(session?.email || "pradeep211397@gmail.com");
  const [simName, setSimName] = useState(session?.name || "Pradeep");
  const [simLoading, setSimLoading] = useState<string | null>(null);

  // Sync simulation email/name when session changes
  useEffect(() => {
    if (session) {
      setSimEmail(session.email || "pradeep211397@gmail.com");
      setSimName(session.name || "Pradeep");
    }
  }, [session]);

  // Selected email for visual preview mockup
  const [selectedDebugEmail, setSelectedDebugEmail] = useState<DebugEmail | null>(null);

  const fetchAllData = async () => {
    try {
      const userId = session?.user_id || "guest";
      
      // Fetch Notifications
      const notifRes = await fetch(`/api/notifications?userId=${userId}`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }

      // Fetch Email Logs
      const logsRes = await fetch("/api/email/logs");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setEmailLogs(logsData);
      }

      // Fetch Email Metrics
      const metricsRes = await fetch("/api/email/metrics");
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setEmailMetrics(metricsData);
      }

      // Fetch Debug Emails (HTML bodies)
      const debugRes = await fetch("/api/email-debug");
      if (debugRes.ok) {
        const debugData = await debugRes.json();
        setDebugEmails(debugData);
        if (debugData.length > 0 && !selectedDebugEmail) {
          setSelectedDebugEmail(debugData[0]);
        }
      }

      // Fetch Preferences
      const prefsRes = await fetch(`/api/notification-preferences/${userId}`);
      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        if (prefsData) {
          setPreferences({
            dailyBrief: !!prefsData.daily_brief,
            deadlineAlerts: !!prefsData.deadline_alerts,
            weeklyReport: !!prefsData.weekly_report,
            aiCoach: !!prefsData.ai_coach,
            futureYou: !!prefsData.future_you,
            recoveryEmails: !!prefsData.recovery_emails,
            achievements: !!prefsData.achievements,
            marketingEmails: !!prefsData.marketing_emails,
          });
        }
      }
    } catch (err) {
      console.error("Error loading intelligence hub data:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [session]);

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);

    try {
      const res = await fetch(`/api/notification-preferences/${session?.user_id || "guest"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_brief: updated.dailyBrief ? 1 : 0,
          deadline_alerts: updated.deadlineAlerts ? 1 : 0,
          weekly_report: updated.weeklyReport ? 1 : 0,
          ai_coach: updated.aiCoach ? 1 : 0,
          future_you: updated.futureYou ? 1 : 0,
          recovery_emails: updated.recoveryEmails ? 1 : 0,
          achievements: updated.achievements ? 1 : 0,
          marketing_emails: updated.marketingEmails ? 1 : 0,
        })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: "Preferences synchronized!", type: "success" }
        }));
      }
    } catch (err) {
      console.error("Failed to update preferences:", err);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: "Notification marked read", type: "success" }
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotif = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: "Archived alert", type: "info" }
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateAction = async (actionType: "daily" | "weekly" | "inactivity-3" | "inactivity-7" | "inactivity-14") => {
    setSimLoading(actionType);
    let endpoint = "";
    let bodyPayload: any = { userId: session?.user_id || "guest", email: simEmail, name: simName };

    if (actionType === "daily") {
      endpoint = "/api/notifications/trigger-daily-brief";
    } else if (actionType === "weekly") {
      endpoint = "/api/notifications/trigger-weekly-report";
    } else {
      endpoint = "/api/notifications/simulate-inactivity";
      const daysMap = { "inactivity-3": 3, "inactivity-7": 7, "inactivity-14": 14 };
      bodyPayload.days = daysMap[actionType];
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (res.ok) {
        const result = await res.json();
        await fetchAllData();
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: `Simulated trigger executed successfully! Check email logs.`, type: "success" }
        }));
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      window.dispatchEvent(new CustomEvent("timehero-toast", {
        detail: { message: `Simulation failed. Please check backend logs.`, type: "warning" }
      }));
    } finally {
      setSimLoading(null);
    }
  };

  // Filtered Notifications
  const filteredNotifs = notifications.filter(notif => {
    const matchesCategory = notifFilter === "All" || notif.category === notifFilter;
    const matchesSearch = notif.title.toLowerCase().includes(notifSearch.toLowerCase()) || 
                          notif.message.toLowerCase().includes(notifSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate email metrics
  const totalEmailsSent = emailLogs.length;
  const openedEmails = emailLogs.filter(l => l.openedAt).length;
  const clickedEmails = emailLogs.filter(l => l.clickedAt).length;
  const openRate = totalEmailsSent > 0 ? Math.round((openedEmails / totalEmailsSent) * 100) : 0;
  const clickRate = totalEmailsSent > 0 ? Math.round((clickedEmails / totalEmailsSent) * 100) : 0;

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "Deadline":
        return { icon: Clock, bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" };
      case "AI Insight":
        return { icon: Sparkles, bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" };
      case "Planner":
        return { icon: Calendar, bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" };
      case "Recovery":
        return { icon: RefreshCw, bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" };
      case "Reminder":
        return { icon: Bell, bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" };
      case "Success":
        return { icon: CheckCircle, bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
      case "Achievement":
        return { icon: Trophy, bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" };
      default:
        return { icon: Bell, bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="intelligence-hub-viewport">
      {/* Page Title Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Intelligence Hub</h2>
            <p className="text-xs text-white/50 mt-1 font-medium">
              Monitor proactive alerts, manage email delivery, customize notification preferences, and simulate AI trigger engines.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation panel */}
        <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <button
            onClick={() => setActiveSubTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border text-left ${
              activeSubTab === "notifications"
                ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                : "bg-transparent border-transparent hover:bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Alert History ({notifications.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border text-left ${
              activeSubTab === "analytics"
                ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                : "bg-transparent border-transparent hover:bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>Emails & Tracking</span>
          </button>

          <button
            onClick={() => setActiveSubTab("simulator")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border text-left ${
              activeSubTab === "simulator"
                ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                : "bg-transparent border-transparent hover:bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            <Terminal className="w-4 h-4 shrink-0" />
            <span>AI Trigger Engine</span>
          </button>

          <button
            onClick={() => setActiveSubTab("preferences")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border text-left ${
              activeSubTab === "preferences"
                ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                : "bg-transparent border-transparent hover:bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Alert Preferences</span>
          </button>
        </div>

        {/* Content Display Panel */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: NOTIFICATION HISTORY */}
          {activeSubTab === "notifications" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Active Alert Logs</h3>
                  <p className="text-xs text-white/50 mt-1">In-app notifications triggered across TimeHero AI</p>
                </div>

                {/* Filters */}
                <div className="flex gap-2 shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 text-white/30 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search alerts..."
                      value={notifSearch}
                      onChange={(e) => setNotifSearch(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/40 w-44"
                    />
                  </div>
                  <select
                    value={notifFilter}
                    onChange={(e) => setNotifFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/40"
                  >
                    <option value="All" className="bg-[#050505]">All Categories</option>
                    <option value="Deadline" className="bg-[#050505]">Deadline</option>
                    <option value="AI Insight" className="bg-[#050505]">AI Insight</option>
                    <option value="Planner" className="bg-[#050505]">Planner</option>
                    <option value="Recovery" className="bg-[#050505]">Recovery</option>
                    <option value="Reminder" className="bg-[#050505]">Reminder</option>
                    <option value="Success" className="bg-[#050505]">Success</option>
                    <option value="Achievement" className="bg-[#050505]">Achievement</option>
                  </select>
                </div>
              </div>

              {/* Log List */}
              <div className="divide-y divide-white/5 space-y-3 pt-2">
                {filteredNotifs.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">No matching alert records found</p>
                  </div>
                ) : (
                  filteredNotifs.map((notif, index) => {
                    const style = getCategoryStyles(notif.category);
                    const IconComp = style.icon;
                    return (
                      <div 
                        key={`hub-notif-${notif.id || index}-${index}`}
                        className={`pt-4 flex items-start gap-4 transition-all duration-150 ${
                          notif.isRead ? "opacity-60" : ""
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl ${style.bg} ${style.text} flex items-center justify-center border ${style.border} shrink-0`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-xs font-black text-white">{notif.title}</h4>
                            <span className="text-[10px] text-white/40">{new Date(notif.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-white/60 leading-relaxed mt-1">{notif.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                              notif.priority === "Critical" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              notif.priority === "High" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                              "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            }`}>
                              {notif.priority}
                            </span>
                            <span className="text-[9px] text-white/30 uppercase tracking-widest font-extrabold">{notif.category}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 self-start mt-1">
                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotif(notif.id)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EMAILS & TRACKING */}
          {activeSubTab === "analytics" && (
            <div className="space-y-6">
              {/* Analytics Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-black block">Total Sent</span>
                  <span className="text-2xl font-black text-white mt-1 block">{emailMetrics?.totalSent ?? emailLogs.length}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black block">Delivered</span>
                  <span className="text-2xl font-black text-indigo-400 mt-1 block">
                    {emailMetrics?.delivered ?? emailLogs.filter(l => ["SENT", "DELIVERED", "Opened", "Clicked"].includes(l.status)).length}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-rose-400 uppercase tracking-widest font-black block">Failed</span>
                  <span className="text-2xl font-black text-rose-400 mt-1 block">
                    {emailMetrics?.failed ?? emailLogs.filter(l => ["FAILED", "Failed"].includes(l.status)).length}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-amber-400 uppercase tracking-widest font-black block">Pending</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">
                    {emailMetrics?.pending ?? emailLogs.filter(l => ["QUEUED", "SENDING", "Queued", "Sending"].includes(l.status)).length}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black block">Success Rate</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    {emailMetrics?.successRate ?? (emailLogs.length > 0 ? Math.round((emailLogs.filter(l => ["SENT", "DELIVERED", "Opened", "Clicked"].includes(l.status)).length / emailLogs.length) * 100) : 100)}%
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center overflow-hidden">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-black block">Last Email</span>
                  <span className="text-[10px] font-black text-white/80 mt-2 block truncate">
                    {(() => {
                      const time = emailMetrics?.lastEmailTime ?? (emailLogs.length > 0 ? emailLogs[0].sentAt : null);
                      return time ? new Date(time).toLocaleTimeString() : "Never";
                    })()}
                  </span>
                </div>
              </div>

              {/* Email Delivery logs */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white">Email logs & Live Tracking Metrics</h3>
                <p className="text-xs text-white/50 mt-1 mb-4">
                  All transaction emails are stored in SQLite with comprehensive delivery tracing. Click links or images in mock emails to simulate live open and click tracking.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-white/70 min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 font-black uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-2">Recipient</th>
                        <th className="py-3 px-2">Subject</th>
                        <th className="py-3 px-2">Provider</th>
                        <th className="py-3 px-2">Status</th>
                        <th className="py-3 px-2">Sent Time</th>
                        <th className="py-3 px-2">Message ID</th>
                        <th className="py-3 px-2 text-right">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {emailLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-white/40">No emails sent yet. Run a simulation trigger!</td>
                        </tr>
                      ) : (
                        emailLogs.map((log, index) => (
                          <tr key={`log-${log.id || index}-${index}`} className="hover:bg-white/5 transition-all text-xs">
                            <td className="py-3 px-2 font-medium text-white/95">{log.recipientEmail || "System"}</td>
                            <td className="py-3 px-2 truncate max-w-xs text-white/80">{log.subject}</td>
                            <td className="py-3 px-2 text-white/60 font-mono text-[10px]">{log.provider || "Dev Sandbox"}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                log.status === "Clicked" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                log.status === "Opened" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                log.status === "SENT" || log.status === "Delivered" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                log.status === "SENDING" || log.status === "Queued" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-white/40">{log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : ""}</td>
                            <td className="py-3 px-2 text-white/50 font-mono text-[10px]">{log.providerMessageId || `N/A`}</td>
                            <td className="py-3 px-2 text-right text-rose-400/80 truncate max-w-[120px] font-mono text-[10px]" title={log.errorMessage}>
                              {log.errorMessage || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRIGGER ENGINE SIMULATOR */}
          {activeSubTab === "simulator" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Controls */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">Smart Trigger Simulator</h3>
                  <p className="text-xs text-white/50 mt-1">
                    Simulate complex productivity events. These invoke true server-side processes with full Gemini AI synthesis and transaction logs!
                  </p>
                </div>

                {/* Input Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-purple-300 block mb-1">Your Email Address</label>
                    <input
                      type="email"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-purple-300 block mb-1">Your Name</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/40"
                    />
                  </div>
                </div>

                {/* Simulator Trigger buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    disabled={!!simLoading}
                    onClick={() => handleSimulateAction("daily")}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20">
                        <Sparkle className="w-4 h-4 shrink-0" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">Generate Daily Brief</span>
                        <span className="text-[10px] text-white/40">Synthesizes a daily plan using Gemini AI</span>
                      </div>
                    </div>
                    {simLoading === "daily" ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    )}
                  </button>

                  <button
                    disabled={!!simLoading}
                    onClick={() => handleSimulateAction("weekly")}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20">
                        <Trophy className="w-4 h-4 shrink-0" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">Generate Weekly Report</span>
                        <span className="text-[10px] text-white/40">Aggregates performance + streak milestones</span>
                      </div>
                    </div>
                    {simLoading === "weekly" ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    )}
                  </button>

                  <div className="border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-2">Simulate Inactivity</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        disabled={!!simLoading}
                        onClick={() => handleSimulateAction("inactivity-3")}
                        className="py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-center text-xs font-black text-white/80 transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        <span className="text-[10px] text-purple-400 font-extrabold block">3 Days</span>
                        <span className="text-[9px] text-white/40 block">Inactivity</span>
                      </button>

                      <button
                        disabled={!!simLoading}
                        onClick={() => handleSimulateAction("inactivity-7")}
                        className="py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-center text-xs font-black text-white/80 transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        <span className="text-[10px] text-amber-400 font-extrabold block">7 Days</span>
                        <span className="text-[9px] text-white/40 block">Recovery plan</span>
                      </button>

                      <button
                        disabled={!!simLoading}
                        onClick={() => handleSimulateAction("inactivity-14")}
                        className="py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-center text-xs font-black text-white/80 transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        <span className="text-[10px] text-red-400 font-extrabold block">14 Days</span>
                        <span className="text-[9px] text-white/40 block">Comeback path</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Mock Inbox Panel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col h-[520px]">
                <div>
                  <h3 className="text-base font-bold text-white">Visual Developer Inbox</h3>
                  <p className="text-xs text-white/50 mt-1 mb-4">
                    Rendered premium HTML newsletters from the SQLite stream.
                  </p>
                </div>

                {debugEmails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30 p-6">
                    <Mail className="w-10 h-10 mb-3" />
                    <h5 className="text-xs font-bold">No Generated Emails Available</h5>
                    <p className="text-[10px] text-white/40 max-w-[200px] mt-1">
                      Trigger one of the simulation events above to watch a premium template rendered here instantly!
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden gap-4">
                    {/* Small sidebar selector */}
                    <div className="flex gap-2 overflow-x-auto pb-1.5 border-b border-white/5">
                      {debugEmails.map((mail, index) => (
                        <button
                          key={`mail-${mail.id || index}-${index}`}
                          onClick={() => setSelectedDebugEmail(mail)}
                          className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                            selectedDebugEmail?.id === mail.id
                              ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
                              : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                          }`}
                        >
                          {mail.subject.split(":")[0] || "Alert"}
                        </button>
                      ))}
                    </div>

                    {/* Render HTML content inside sanitized iframe simulator */}
                    {selectedDebugEmail && (
                      <div className="flex-1 bg-[#121214] border border-white/10 rounded-xl overflow-hidden flex flex-col">
                        {/* Header metadata */}
                        <div className="p-3 bg-white/5 border-b border-white/5 text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="text-white/40 font-extrabold block">SUBJECT: <strong className="text-white">{selectedDebugEmail.subject}</strong></span>
                            <span className="text-white/40">{new Date(selectedDebugEmail.sentAt).toLocaleTimeString()}</span>
                          </div>
                          <span className="text-white/40 block mt-1">RECIPIENT: <strong className="text-purple-300">{selectedDebugEmail.to}</strong></span>
                        </div>
                        
                        {/* Sandboxed Iframe Rendering */}
                        <iframe
                          title="Premium Email Sandbox Preview"
                          srcDoc={selectedDebugEmail.html}
                          className="flex-1 w-full bg-slate-900"
                          sandbox="allow-popups allow-popups-to-escape-sandbox"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PREFERENCES */}
          {activeSubTab === "preferences" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Alert Preferences Settings</h3>
                <p className="text-xs text-white/50 mt-1">Configure which automatic notifications and smart summaries are compiled and transmitted to you.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {[
                  { key: "dailyBrief" as const, title: "Daily Productivity Brief", desc: "Synthesizes morning calendar priorities and focus blocks" },
                  { key: "deadlineAlerts" as const, title: "Intelligent Deadline Reminders", desc: "Triggers notifications 24h, 12h, 6h, 1h, and 30m before tasks are due" },
                  { key: "weeklyReport" as const, title: "Weekly Progress Review", desc: "Aggregates week-over-week productivity metrics and burnout ratings" },
                  { key: "aiCoach" as const, title: "AI Coach Insights", desc: "Receives smart coach updates regarding focus velocity" },
                  { key: "futureYou" as const, title: "Future You Predictions", desc: "Alerts when pipeline delay risk metrics shift unexpectedly" },
                  { key: "recoveryEmails" as const, title: "Inactivity Recovery Schedules", desc: "Automatically reschedules task sequences during prolonged inactivity" },
                  { key: "achievements" as const, title: "Achievement Celebrate Emails", desc: "Celebrates project milestones with celebratory graphic alerts" },
                  { key: "marketingEmails" as const, title: "Product Updates & Bulletins", desc: "Subscribes to quarterly feature releases and newsletters" }
                ].map(item => (
                  <div key={item.key} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-4 group hover:border-white/20 transition-all">
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[10px] text-white/50 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                    
                    {/* Toggle */}
                    <button
                      onClick={() => handleTogglePref(item.key)}
                      className={`relative w-10 h-6 rounded-full p-1 transition-colors shrink-0 ${
                        preferences[item.key] ? "bg-purple-600" : "bg-white/10"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        preferences[item.key] ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
