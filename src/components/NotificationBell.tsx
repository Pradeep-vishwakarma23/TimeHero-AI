import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  Clock, 
  Sparkles, 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  Trophy, 
  Trash2, 
  Check, 
  ExternalLink 
} from "lucide-react";

interface Notification {
  id: number;
  userId: string;
  title: string;
  message: string;
  category: "Deadline" | "AI Insight" | "Planner" | "Recovery" | "Reminder" | "Success" | "Achievement" | string;
  priority: "Low" | "Medium" | "High" | "Critical" | string;
  isRead: boolean;
  createdAt: string;
  actionType?: string;
  actionPayload?: string;
}

interface NotificationBellProps {
  userId: string;
  onNavigate: (tab: string) => void;
}

export default function NotificationBell({ userId, onNavigate }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [userId]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        
        // Dispatch custom global event to show success toast
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: "Marked notification as read", type: "success" }
        }));
      }
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: "Deleted notification", type: "info" }
        }));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: "All notifications marked as read", type: "success" }
        }));
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch(`/api/notifications/clear-all`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new CustomEvent("timehero-toast", {
          detail: { message: "Cleared all notifications", type: "info" }
        }));
      }
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "Deadline":
        return { icon: Clock, bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" };
      case "AI Insight":
        return { icon: Sparkles, bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" };
      case "Planner":
        return { icon: Calendar, bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" };
      case "Recovery":
        return { icon: RefreshCw, bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
      case "Reminder":
        return { icon: Bell, bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" };
      case "Success":
        return { icon: CheckCircle, bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" };
      case "Achievement":
        return { icon: Trophy, bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" };
      default:
        return { icon: Bell, bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const past = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      
      if (diffSecs < 60) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return "just now";
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} id="notification-bell-container">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all duration-200 focus:outline-none ${
          isOpen 
            ? "bg-purple-500/10 border-purple-500/40 text-purple-200" 
            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
        }`}
        aria-label="View notifications"
        id="notification-bell-btn"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? "animate-wiggle" : ""}`} />
        
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-[10px] font-black text-white flex items-center justify-center border-2 border-[#050505] shadow-lg shadow-rose-500/20"
            id="notification-bell-badge"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-3 w-[380px] bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-slide-up"
          id="notification-bell-panel"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="text-[10px] text-white/50 mt-0.5">{unreadCount} unread messages</p>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2.5">
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider"
                >
                  Mark all read
                </button>
                <span className="text-white/20 text-xs">|</span>
                <button 
                  onClick={handleClearAll}
                  className="text-[10px] font-black text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white/80">No Notifications Yet</h4>
                  <p className="text-[10px] text-white/40 mt-1 max-w-[220px]">
                    Tasks with imminent deadlines or dynamic AI reports will populate alerts here.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notif, index) => {
                const style = getCategoryStyles(notif.category);
                const IconComponent = style.icon;
                return (
                  <div 
                    key={`bell-notif-${notif.id || index}-${index}`}
                    className={`p-4 transition-all duration-150 relative ${
                      notif.isRead ? "bg-transparent opacity-75" : "bg-purple-500/5 hover:bg-purple-500/10"
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Left Category Icon */}
                      <div className={`w-9 h-9 rounded-xl ${style.bg} ${style.text} flex items-center justify-center border ${style.border} shrink-0 mt-0.5`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-bold leading-snug truncate ${notif.isRead ? "text-white/70" : "text-white"}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[9px] font-medium text-white/40 shrink-0 mt-0.5">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/60 leading-relaxed mt-1 break-words">
                          {notif.message}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                            notif.priority === "Critical" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            notif.priority === "High" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                            "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          }`}>
                            {notif.priority}
                          </span>

                          <div className="flex gap-2">
                            {!notif.isRead && (
                              <button
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20"
                                title="Mark read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(notif.id, e)}
                              className="p-1 rounded bg-white/5 hover:bg-rose-500/10 text-rose-400 transition-all border border-transparent hover:border-rose-500/20"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer view-all link */}
          <div className="p-3.5 bg-white/5 border-t border-white/10 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate("Intelligence Hub");
              }}
              className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-purple-400 hover:text-purple-300 tracking-wider transition-all"
            >
              <span>Manage & View in Intelligence Hub</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
