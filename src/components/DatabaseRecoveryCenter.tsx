import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Wrench,
  Database,
  Download,
  Upload,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Terminal,
  Clock,
  Activity,
  FileText
} from "lucide-react";

interface DbDiagnostics {
  status: "healthy" | "recovered" | "compromised";
  isRecoveryMode: boolean;
  diagnostics: string[];
  recoveryLogs: string[];
  alerts: string[];
  lastStartupTime: string;
  snapshots?: string[];
}

interface DatabaseRecoveryCenterProps {
  onRecoveryResolved?: () => void;
}

export default function DatabaseRecoveryCenter({ onRecoveryResolved }: DatabaseRecoveryCenterProps) {
  const [state, setState] = useState<DbDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/recovery/status");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        
        // If recovery mode resolved and database is healthy or recovered, trigger callback
        if (data && !data.isRecoveryMode && onRecoveryResolved) {
          onRecoveryResolved();
        }
      }
    } catch (err) {
      console.error("Error loading recovery status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll logs to bottom
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state?.recoveryLogs]);

  const handleSimulateCorruption = async () => {
    if (!window.confirm("Are you sure you want to corrupt the SQLite database header to test recovery mode? This will archive the current database and force reload diagnostics.")) return;
    try {
      setActionLoading("simulate");
      const res = await fetch("/api/recovery/simulate-corruption", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Simulation active! SQLite header overwritten with garbage. Check the startup logs below.");
        fetchStatus();
      }
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore the database from snapshot: ${filename}? Current unsaved in-memory sessions/state will be replaced.`)) return;
    try {
      setActionLoading(`restore-${filename}`);
      const res = await fetch("/api/recovery/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (data.success) {
        alert("Database successfully restored from snapshot!");
        fetchStatus();
      } else {
        alert(`Restore failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Restore error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceFresh = async () => {
    if (!window.confirm("CRITICAL WARNING: This will discard the current corrupted database entirely and start a fresh empty database. This cannot be undone. Do you wish to proceed?")) return;
    try {
      setActionLoading("force-fresh");
      const res = await fetch("/api/recovery/force-fresh", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Successfully started fresh database!");
        fetchStatus();
      } else {
        alert(`Failed to start fresh: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUploadDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress("Reading database file...");
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          setUploadProgress("Uploading binary stream...");
          const arrayBuffer = reader.result as ArrayBuffer;
          const res = await fetch("/api/recovery/upload", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: arrayBuffer
          });
          const data = await res.json();
          if (data.success) {
            alert("Database snapshot uploaded and loaded successfully!");
            fetchStatus();
          } else {
            alert(`Upload loading failed: ${data.error}`);
          }
        } catch (innerErr: any) {
          alert(`Error uploading file: ${innerErr.message}`);
        } finally {
          setUploadProgress(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      alert(`Failed to read file: ${err.message}`);
      setUploadProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center p-6 text-[#E5EEF9]">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
        <span className="text-sm font-semibold text-slate-400 tracking-wider">LOADING DIAGNOSTICS...</span>
      </div>
    );
  }

  const isCompromised = state?.isRecoveryMode;

  return (
    <div className="min-h-screen bg-[#030303] text-[#E5EEF9] px-4 py-8 md:p-8 flex flex-col gap-6 font-sans">
      {/* Background blurs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-15%] w-[45%] h-[45%] bg-purple-950/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-15%] w-[45%] h-[45%] bg-rose-950/15 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col gap-6">
        
        {/* Top Header Card */}
        <header className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-xl gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-1.5 rounded-xl border border-white/5 ${isCompromised ? "bg-rose-500/15 animate-pulse" : "bg-slate-900/60"}`}>
              <img 
                src="/branding/logo-mark.svg" 
                alt="TimeHero AI Logo" 
                className="w-11 h-11 object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight uppercase">Database Recovery Console</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isCompromised 
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                    : state?.status === "recovered"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {isCompromised ? "RECOVERY MODE" : state?.status || "HEALTHY"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Resilient transaction management, live monitoring logs, and self-healing backup systems.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchStatus}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all border border-white/5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Status
            </button>
            <button
              onClick={handleSimulateCorruption}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition-all border border-rose-500/20"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {actionLoading === "simulate" ? "Simulating..." : "Simulate Corruption"}
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Status & Diagnostic Details Card */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <section className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Activity className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Startup Diagnostics</h2>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400">Database Status</span>
                  <span className={`text-xs font-bold ${isCompromised ? "text-rose-400" : "text-emerald-400"}`}>
                    {isCompromised ? "Compromised (Blocked)" : "Active (Pristine)"}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400">Last Startup Time</span>
                  <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {state?.lastStartupTime ? new Date(state.lastStartupTime).toLocaleTimeString() : "N/A"}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Diagnostic Checks</span>
                <div className="flex flex-col gap-2">
                  {state?.diagnostics && state.diagnostics.length > 0 ? (
                    state.diagnostics.map((diag, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs text-slate-300 font-mono bg-white/[0.01] p-2.5 rounded-lg border border-white/5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{diag}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-white/5 rounded-lg">
                      No startup diagnostics recorded.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Action Tools */}
            <section className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Wrench className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Recovery Options</h2>
              </div>

              <div className="flex flex-col gap-3">
                {/* Upload Database File */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Upload SQLite Backup
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadDatabase}
                    accept=".sqlite"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadProgress !== null}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-black transition-all border border-purple-500/20"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadProgress ? uploadProgress : "Upload .sqlite File"}
                  </button>
                </div>

                <div className="border-t border-white/5 my-1" />

                {/* Download Malformed DB */}
                <div>
                  <a
                    href="/api/recovery/download-corrupted"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all border border-white/5"
                  >
                    <Download className="w-4 h-4" />
                    Download Malformed SQLite
                  </a>
                  <span className="text-[9px] text-slate-500 block text-center mt-1">
                    Download the latest corrupted file for local sandbox forensics.
                  </span>
                </div>

                <div className="border-t border-white/5 my-1" />

                {/* Force Start Fresh */}
                <div>
                  <button
                    onClick={handleForceFresh}
                    disabled={actionLoading !== null}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-950/20 hover:bg-rose-950/50 text-rose-300 text-xs font-black transition-all border border-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    Force Start Fresh (Wipe)
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* System Snapshots & Live Terminal Logs */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Snapshots Table */}
            <section className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-xl flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <FileText className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Timestamped Backup Snapshots</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-slate-400 text-left">
                      <th className="pb-2.5">Snapshot Name</th>
                      <th className="pb-2.5">Timestamp</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state?.snapshots && state.snapshots.length > 0 ? (
                      state.snapshots.map((snap, idx) => {
                        const tsPart = snap.replace("timehero_db_backup_", "").replace(".sqlite", "");
                        const date = isNaN(Number(tsPart)) ? "System Backup" : new Date(Number(tsPart)).toLocaleString();
                        return (
                          <tr key={idx} className="border-b border-white/[0.02] text-xs hover:bg-white/[0.01]">
                            <td className="py-3 font-mono text-slate-200 font-semibold">{snap}</td>
                            <td className="py-3 text-slate-400">{date}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleRestoreSnapshot(snap)}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider transition-all border border-purple-500/20"
                              >
                                <Play className="w-2.5 h-2.5 shrink-0" />
                                Restore
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-500 text-xs italic">
                          No backup snapshots found in the backups directory.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Live Terminal Terminal Logs */}
            <section className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-xl flex flex-col gap-4 flex-1 min-h-[350px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Live Recovery Logs</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Stream Live</span>
                </div>
              </div>

              <div className="flex-1 bg-black/80 rounded-xl p-4 font-mono text-xs border border-white/5 overflow-y-auto max-h-[400px] flex flex-col gap-1.5 custom-scrollbar">
                {state?.recoveryLogs && state.recoveryLogs.length > 0 ? (
                  state.recoveryLogs.map((log, index) => {
                    let textClass = "text-slate-300";
                    if (log.includes("[CRITICAL]")) textClass = "text-rose-400 font-bold";
                    else if (log.includes("[WARNING]")) textClass = "text-amber-300";
                    else if (log.includes("[INFO]")) textClass = "text-purple-300";
                    return (
                      <div key={index} className={`${textClass} whitespace-pre-wrap leading-relaxed`}>
                        {log}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-500 italic text-center py-10">
                    Terminal ready. Awaiting log entries...
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </section>

          </div>
          
        </div>

        {/* System Alert Overlay */}
        {isCompromised && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 animate-bounce" />
            <div>
              <span className="font-bold">SYSTEM ALERT: Database in Recovery Mode!</span> Normal client traffic is intercepted to block corrupt state operations. Select an automated backup snapshot or upload a valid database file above to restore operations.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
