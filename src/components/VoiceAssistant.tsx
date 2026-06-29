import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Play, Square, Send, Volume2, Sparkles, Check, ChevronRight, AlertCircle, HelpCircle } from "lucide-react";

interface VoiceAssistantProps {
  session: { user_id: string; email: string };
  onNavigate: (tab: string) => void;
  fetchTasksAndStats: () => Promise<void>;
}

export default function VoiceAssistant({ session, onNavigate, fetchTasksAndStats }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pomodoro session tracking
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(1500); // 25 mins
  const pomodoroIntervalRef = useRef<any>(null);

  // Recognition ref
  const recognitionRef = useRef<any>(null);

  // Result state
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat window to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Draggable and scroll-lock state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling while the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setPosition({ x: 0, y: 0 });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("textarea") || target.closest("input")) {
      return;
    }
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      let newX = dragRef.current.posX + deltaX;
      let newY = dragRef.current.posY + deltaY;

      // Constrain dragging bounds within the browser viewport
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const limitX = Math.max(0, (viewportWidth - rect.width) / 2);
        const limitY = Math.max(0, (viewportHeight - rect.height) / 2);

        newX = Math.max(-limitX, Math.min(limitX, newX));
        newY = Math.max(-limitY, Math.min(limitY, newY));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleDoubleClickHeader = () => {
    setPosition({ x: 0, y: 0 });
  };

  // Listen to global open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      startSpeechRecognition();
    };
    window.addEventListener("open-voice-assistant", handleOpen);
    return () => window.removeEventListener("open-voice-assistant", handleOpen);
  }, []);

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setErrorMsg("");
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setTranscript(currentText);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone permission denied. Feel free to type your prompt manually!");
        } else {
          setErrorMsg(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      console.warn("Speech Recognition API is not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Pomodoro logic
  useEffect(() => {
    if (pomodoroActive) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(pomodoroIntervalRef.current);
            setPomodoroActive(false);
            speakText("Focus session complete! Time to take a five minute study break.");
            triggerToast("🍅 Pomodoro Complete! Outstanding work.");
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    }

    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [pomodoroActive]);

  const triggerToast = (msg: string) => {
    const event = new CustomEvent("timehero-toast", {
      detail: { message: msg, type: "success" }
    });
    window.dispatchEvent(event);
  };

  const startSpeechRecognition = () => {
    setTranscript("");
    setAnalysisResult(null);
    setErrorMsg("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Already listening or error restarting:", err);
      }
    } else {
      setErrorMsg("Web Speech API not supported in this environment. You can still input prompts manually below!");
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const speakText = (text: string) => {
    if (!audioFeedbackEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      // Try to find a premium female/natural english voice
      const naturalVoice = voices.find(
        v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Zira"))
      ) || voices.find(v => v.lang.startsWith("en"));
      
      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech Synthesis failed:", err);
    }
  };

  const handleProcessInput = async () => {
    if (!transcript.trim()) return;
    
    const userPrompt = transcript;
    setTranscript(""); // Clear prompt box
    stopSpeechRecognition();
    setIsProcessing(true);
    setAnalysisResult(null);
    setErrorMsg("");

    // Append user message
    const updatedMessages = [...messages, { role: "user" as const, content: userPrompt }];
    setMessages(updatedMessages);

    try {
      let res;
      try {
        res = await fetch("/api/voice/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: userPrompt,
            userId: session.user_id,
            email: session.email,
            history: updatedMessages
          })
        });
      } catch (networkErr) {
        throw new Error(`[AI Parsing] Network connection to /api/voice/process failed.`);
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.analysis) {
          const analysis = data.analysis;
          setAnalysisResult(analysis);
          
          // Append assistant response
          setMessages(prev => [...prev, { role: "model" as const, content: analysis.speechResponse }]);
          
          // Trigger Vocal output
          speakText(analysis.speechResponse);

          // Command Dispatcher maps structured intents to application actions
          const intent = analysis.commandType || "none";
          
          // Requirements logging
          console.log(`[Voice AI Pipeline] Step 1: Recognized Transcript: "${userPrompt}"`);
          console.log(`[Voice AI Pipeline] Step 2: Parsed Intent: "${intent}"`);

          const isTaskCreation = intent === "create_task" || (analysis.extractedTask && analysis.isComplete && intent === "none");

          if (isTaskCreation) {
            console.log(`[Voice AI Pipeline] Step 3: Tool/Action Selected: "create_task"`);
            await executeCreateTask(analysis);
          } else if (intent === "update_task") {
            console.log(`[Voice AI Pipeline] Step 3: Tool/Action Selected: "update_task"`);
            await executeUpdateTask(analysis);
          } else if (intent === "delete_task") {
            console.log(`[Voice AI Pipeline] Step 3: Tool/Action Selected: "delete_task"`);
            await executeDeleteTask(analysis);
          } else if (intent === "complete_task") {
            console.log(`[Voice AI Pipeline] Step 3: Tool/Action Selected: "complete_task"`);
            await executeCompleteTask(analysis);
          } else if (analysis.isCommand) {
            console.log(`[Voice AI Pipeline] Step 3: Tool/Action Selected: "${intent}"`);
            handleSystemCommandExecution(intent);
          } else {
            console.log(`[Voice AI Pipeline] Step 3: Tool/Action Selected: none (conversational response)`);
            try {
              await fetchTasksAndStats();
            } catch (err) {}
            if (analysis.isComplete) {
              triggerToast("🎤 Voice request processed successfully!");
            }
          }
        } else if (data.unclear) {
          setAnalysisResult(data.analysis);
          setMessages(prev => [...prev, { role: "model" as const, content: data.analysis.speechResponse }]);
          speakText(data.analysis.speechResponse);
        } else {
          setErrorMsg("[AI Parsing Failed] Gemini response could not be parsed structurally.");
        }
      } else {
        setErrorMsg(`[AI Parsing Failed] Gemini parser API returned non-200 response: ${res.status}`);
      }
    } catch (err: any) {
      console.error("Failed to process voice input:", err);
      if (err.message.includes("[AI Parsing]")) {
        setErrorMsg("[AI Parsing Failed] Connection to Gemini Voice service failed.");
      } else {
        setErrorMsg(`[AI Parsing Failed] ${err.message || "An unexpected error occurred."}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCreateTask = async (analysis: any) => {
    const taskData = analysis.extractedTask;
    if (!taskData) {
      setErrorMsg("[AI Parsing Failed] Task details missing from Gemini analysis.");
      return;
    }

    const taskPayload = {
      title: taskData.title || taskData.task || "Untitled Task",
      description: taskData.description || "",
      priority: taskData.priority || "Medium",
      category: taskData.category || "Study",
      dueDate: taskData.dueDate || taskData.deadline || new Date().toISOString().split("T")[0],
      dueTime: taskData.dueTime || "12:00",
      estimatedHours: taskData.estimatedHours !== undefined ? Number(taskData.estimatedHours) : (taskData.effort !== undefined ? Number(taskData.effort) : 2.0),
      tags: taskData.tags || ["Voice"],
      calendarEvent: taskData.calendarEvent !== undefined ? taskData.calendarEvent : true,
      studyPlannerSessions: taskData.studyPlannerSessions || []
    };

    console.log("[Voice AI Pipeline] Step 4: API Request (POST /api/tasks):", JSON.stringify(taskPayload, null, 2));

    try {
      let createRes;
      try {
        createRes = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskPayload)
        });
      } catch (netErr: any) {
        console.error("[Voice AI Pipeline] Stage 4 Failed: API request connection error", netErr);
        setErrorMsg(`[API Request Failed] Failed to send POST /api/tasks: ${netErr.message}`);
        triggerToast("❌ Failed to contact scheduling service.");
        return;
      }

      const createData = await createRes.json();
      console.log(`[Voice AI Pipeline] Step 5: API Response (Status ${createRes.status}):`, JSON.stringify(createData, null, 2));

      if (createRes.ok) {
        console.log(`[Voice AI Pipeline] Step 6: SQLite Insert Result: SUCCESS. Record ID: ${createData.id || "OK"}`);
        console.log("[Voice AI Pipeline] Step 7: Global State Refresh initiating...");

        // State Synchronization
        try {
          await fetchTasksAndStats();
          console.log("[Voice AI Pipeline] Global state refreshed successfully across all panels.");
          triggerToast(`🎤 Voice Task Created: "${taskPayload.title}"!`);
        } catch (syncErr: any) {
          console.error("[Voice AI Pipeline] Step 7 Failed:", syncErr);
          setErrorMsg(`[State Synchronization Failed] Task inserted but local dashboard failed to refresh automatically.`);
          triggerToast("❌ State synchronization failed.");
        }
      } else {
        console.error("[Voice AI Pipeline] Stage 5/6 Failed: SQLite failed to save task:", createData);
        setErrorMsg(`[Database Save Failed] SQLite database insert failed: ${createData.error || "Missing database write permissions"}`);
        triggerToast("❌ Failed to schedule Voice Task.");
      }
    } catch (err: any) {
      console.error("[Voice AI Pipeline] Unexpected error in createTask workflow:", err);
      setErrorMsg(`[Database Save Failed] SQLite failed to insert task: ${err.message || err}`);
      triggerToast("❌ Action execution failed.");
    }
  };

  const executeUpdateTask = async (analysis: any) => {
    const taskData = analysis.extractedTask;
    const taskTitle = taskData?.title || taskData?.task;
    if (!taskTitle) {
      setErrorMsg("[AI Parsing Failed] Task name missing for update action.");
      return;
    }

    console.log(`[Voice AI Pipeline] Step 4: API Request (Find and Update matching "${taskTitle}")`);

    try {
      const getRes = await fetch("/api/tasks");
      if (!getRes.ok) {
        throw new Error("Unable to fetch current tasks list for matching.");
      }
      const activeTasks = await getRes.json();
      const match = activeTasks.find((t: any) => 
        t.task.toLowerCase().includes(taskTitle.toLowerCase()) || 
        taskTitle.toLowerCase().includes(t.task.toLowerCase())
      );

      if (!match) {
        console.warn(`[Voice AI Pipeline] Stage 4 Failed: No matching task found for "${taskTitle}"`);
        setErrorMsg(`[API Request Failed] Task matching "${taskTitle}" could not be located.`);
        triggerToast(`❌ Task "${taskTitle}" not found.`);
        return;
      }

      const updatePayload = {
        ...match,
        priority: taskData.priority || match.priority,
        category: taskData.category || match.category,
        dueDate: taskData.dueDate || match.dueDate,
        dueTime: taskData.dueTime || match.dueTime,
        estimatedHours: taskData.estimatedHours !== undefined ? Number(taskData.estimatedHours) : match.estimatedHours,
        description: taskData.description || match.description,
      };

      console.log(`[Voice AI Pipeline] Step 4: API Request (PUT /api/tasks/${match.id}):`, JSON.stringify(updatePayload, null, 2));

      const updateRes = await fetch(`/api/tasks/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });

      const updateData = await updateRes.json();
      console.log(`[Voice AI Pipeline] Step 5: API Response (Status ${updateRes.status}):`, JSON.stringify(updateData, null, 2));

      if (updateRes.ok) {
        console.log("[Voice AI Pipeline] Step 6: SQLite Update Result: SUCCESS.");
        console.log("[Voice AI Pipeline] Step 7: Global State Refresh initiating...");

        try {
          await fetchTasksAndStats();
          triggerToast(`🎤 Voice Task Updated: "${updatePayload.task}"!`);
        } catch (syncErr: any) {
          console.error("[Voice AI Pipeline] Step 7 Failed:", syncErr);
          setErrorMsg(`[State Synchronization Failed] Task updated but local state failed to synchronize.`);
          triggerToast("❌ State synchronization failed.");
        }
      } else {
        console.error("[Voice AI Pipeline] Stage 5 Failed: SQLite update failed:", updateData);
        setErrorMsg(`[Database Save Failed] SQLite failed to update task: ${updateData.error}`);
        triggerToast("❌ Failed to update Voice Task.");
      }
    } catch (err: any) {
      console.error("[Voice AI Pipeline] Unexpected error in updateTask workflow:", err);
      setErrorMsg(`[Database Save Failed] SQLite failed to update task: ${err.message || err}`);
      triggerToast("❌ Action execution failed.");
    }
  };

  const executeDeleteTask = async (analysis: any) => {
    const taskData = analysis.extractedTask;
    const taskTitle = taskData?.title || taskData?.task;
    if (!taskTitle) {
      setErrorMsg("[AI Parsing Failed] Task name missing for delete action.");
      return;
    }

    console.log(`[Voice AI Pipeline] Step 4: API Request (Find and Delete matching "${taskTitle}")`);

    try {
      const getRes = await fetch("/api/tasks");
      if (!getRes.ok) {
        throw new Error("Unable to fetch current tasks list.");
      }
      const activeTasks = await getRes.json();
      const match = activeTasks.find((t: any) => 
        t.task.toLowerCase().includes(taskTitle.toLowerCase()) || 
        taskTitle.toLowerCase().includes(t.task.toLowerCase())
      );

      if (!match) {
        console.warn(`[Voice AI Pipeline] Stage 4 Failed: No matching task found for "${taskTitle}"`);
        setErrorMsg(`[API Request Failed] Task matching "${taskTitle}" could not be located.`);
        triggerToast(`❌ Task "${taskTitle}" not found.`);
        return;
      }

      console.log(`[Voice AI Pipeline] Step 4: API Request (DELETE /api/tasks/${match.id})`);

      const deleteRes = await fetch(`/api/tasks/${match.id}`, {
        method: "DELETE"
      });

      const deleteData = await deleteRes.json();
      console.log(`[Voice AI Pipeline] Step 5: API Response (Status ${deleteRes.status}):`, JSON.stringify(deleteData, null, 2));

      if (deleteRes.ok) {
        console.log("[Voice AI Pipeline] Step 6: SQLite Delete Result: SUCCESS.");
        console.log("[Voice AI Pipeline] Step 7: Global State Refresh initiating...");

        try {
          await fetchTasksAndStats();
          triggerToast(`🎤 Voice Task Deleted: "${match.task}"!`);
        } catch (syncErr: any) {
          console.error("[Voice AI Pipeline] Step 7 Failed:", syncErr);
          setErrorMsg(`[State Synchronization Failed] Task deleted but local state failed to synchronize.`);
          triggerToast("❌ State synchronization failed.");
        }
      } else {
        console.error("[Voice AI Pipeline] Stage 5 Failed: SQLite delete failed:", deleteData);
        setErrorMsg(`[Database Save Failed] SQLite failed to delete task: ${deleteData.error}`);
        triggerToast("❌ Failed to delete Voice Task.");
      }
    } catch (err: any) {
      console.error("[Voice AI Pipeline] Unexpected error in deleteTask workflow:", err);
      setErrorMsg(`[Database Save Failed] SQLite failed to delete task: ${err.message || err}`);
      triggerToast("❌ Action execution failed.");
    }
  };

  const executeCompleteTask = async (analysis: any) => {
    const taskData = analysis.extractedTask;
    const taskTitle = taskData?.title || taskData?.task;
    if (!taskTitle) {
      setErrorMsg("[AI Parsing Failed] Task name missing for complete action.");
      return;
    }

    console.log(`[Voice AI Pipeline] Step 4: API Request (Find and Complete matching "${taskTitle}")`);

    try {
      const getRes = await fetch("/api/tasks");
      if (!getRes.ok) {
        throw new Error("Unable to fetch current tasks list.");
      }
      const activeTasks = await getRes.json();
      const match = activeTasks.find((t: any) => 
        t.task.toLowerCase().includes(taskTitle.toLowerCase()) || 
        taskTitle.toLowerCase().includes(t.task.toLowerCase())
      );

      if (!match) {
        console.warn(`[Voice AI Pipeline] Stage 4 Failed: No matching task found for "${taskTitle}"`);
        setErrorMsg(`[API Request Failed] Task matching "${taskTitle}" could not be located.`);
        triggerToast(`❌ Task "${taskTitle}" not found.`);
        return;
      }

      const updatePayload = {
        ...match,
        status: "Completed"
      };

      console.log(`[Voice AI Pipeline] Step 4: API Request (PUT /api/tasks/${match.id} to complete):`, JSON.stringify(updatePayload, null, 2));

      const updateRes = await fetch(`/api/tasks/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });

      const updateData = await updateRes.json();
      console.log(`[Voice AI Pipeline] Step 5: API Response (Status ${updateRes.status}):`, JSON.stringify(updateData, null, 2));

      if (updateRes.ok) {
        console.log("[Voice AI Pipeline] Step 6: SQLite Complete/Update Result: SUCCESS.");
        console.log("[Voice AI Pipeline] Step 7: Global State Refresh initiating...");

        try {
          await fetchTasksAndStats();
          triggerToast(`🎤 Voice Task Completed: "${match.task}"!`);
        } catch (syncErr: any) {
          console.error("[Voice AI Pipeline] Step 7 Failed:", syncErr);
          setErrorMsg(`[State Synchronization Failed] Task marked completed but local state failed to synchronize.`);
          triggerToast("❌ State synchronization failed.");
        }
      } else {
        console.error("[Voice AI Pipeline] Stage 5 Failed: SQLite complete failed:", updateData);
        setErrorMsg(`[Database Save Failed] SQLite failed to complete task: ${updateData.error}`);
        triggerToast("❌ Failed to complete Voice Task.");
      }
    } catch (err: any) {
      console.error("[Voice AI Pipeline] Unexpected error in completeTask workflow:", err);
      setErrorMsg(`[Database Save Failed] SQLite failed to complete task: ${err.message || err}`);
      triggerToast("❌ Action execution failed.");
    }
  };

  const handleSystemCommandExecution = (commandType: string) => {
    switch (commandType) {
      case "show_tasks":
        onNavigate("Dashboard");
        triggerToast("🎤 Navigating to your Active Dashboard.");
        break;
      case "due_tomorrow":
        onNavigate("Task Pipeline");
        triggerToast("🎤 Opening your upcoming Pipeline.");
        break;
      case "show_focus":
        onNavigate("Task Pipeline");
        triggerToast("🎤 Displaying your focused tasks.");
        break;
      case "show_productivity":
        onNavigate("Dashboard");
        triggerToast("🎤 Showing your productivity metrics.");
        break;
      case "show_calendar":
        onNavigate("Calendar");
        triggerToast("🎤 Displaying synchronized calendar view.");
        break;
      case "deadlines_today":
        onNavigate("Dashboard");
        triggerToast("🎤 Scanning today's deadlines.");
        break;
      case "pending_count":
        onNavigate("Task Pipeline");
        triggerToast("🎤 Checking active sprint tasks.");
        break;
      case "recovery_plan":
        onNavigate("Future You Simulator");
        triggerToast("🎤 Loading your recovery plan engine.");
        break;
      case "study_schedule":
        onNavigate("AI Planner");
        triggerToast("🎤 Preparing automated study roadmap.");
        break;
      case "start_pomodoro":
        setPomodoroActive(true);
        setPomodoroSeconds(1500); // Reset to 25 mins
        triggerToast("🍅 Pomodoro started! Put on your headphones.");
        break;
      default:
        break;
    }
  };

  const handleSuggestionAction = () => {
    if (!analysisResult || !analysisResult.suggestionAction) return;
    const action = analysisResult.suggestionAction;

    // Route based on action key
    if (action === "create_study_schedule" || action === "distribute_study") {
      onNavigate("AI Planner");
      triggerToast("🎤 Accessing AI study scheduler.");
    } else if (action === "optimize_calendar" || action === "manual_calendar_sync" || action === "lock_focus") {
      onNavigate("Calendar");
      triggerToast("🎤 Syncing Calendar optimization.");
    } else if (action === "view_focus_metrics" || action === "weekly_burnout_check" || action === "check_risk") {
      onNavigate("Dashboard");
      triggerToast("🎤 Loading analysis dashboard.");
    } else if (action === "recovery_plan" || action === "email_recovery_plan") {
      onNavigate("Future You Simulator");
      triggerToast("🎤 Preparing Future Simulator forecast.");
    } else if (action === "split_task" || action === "map_focus_plan") {
      onNavigate("Task Pipeline");
      triggerToast("🎤 Opening Task breakdown manager.");
    } else if (action === "log_pomodoro") {
      setPomodoroActive(true);
      setPomodoroSeconds(1500);
      triggerToast("🍅 Pomodoro initiated from smart suggestion.");
    }

    setIsOpen(false);
  };

  const formatPomodoroTime = () => {
    const m = Math.floor(pomodoroSeconds / 60);
    const s = pomodoroSeconds % 60;
    return `${m}:${s < 10 ? "0" + s : s}`;
  };

  return (
    <>
      {/* Waveforms CSS injection to guarantee gorgeous animation */}
      <style>{`
        @keyframes custom-wave-bounce {
          0%, 100% { height: 8px; }
          50% { height: 48px; }
        }
        .waveform-bar {
          animation: custom-wave-bounce 1s ease-in-out infinite;
        }
        .waveform-bar:nth-child(1) { animation-delay: 0.1s; }
        .waveform-bar:nth-child(2) { animation-delay: 0.25s; }
        .waveform-bar:nth-child(3) { animation-delay: 0.4s; }
        .waveform-bar:nth-child(4) { animation-delay: 0.15s; }
        .waveform-bar:nth-child(5) { animation-delay: 0.3s; }
      `}</style>

      {/* FLOATING MICROPHONE BUTTON IN THE BOTTOM-RIGHT */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
        {/* Real-time Pomodoro Mini Display if Active */}
        {pomodoroActive && (
          <div className="pointer-events-auto flex items-center gap-2 bg-[#0d1527]/90 border border-rose-500/30 text-rose-300 rounded-full px-4 py-2 text-xs font-black tracking-wider shadow-2xl backdrop-blur-xl animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>POMODORO: {formatPomodoroTime()}</span>
            <button 
              onClick={() => {
                setPomodoroActive(false);
                triggerToast("🍅 Pomodoro paused.");
              }}
              className="text-rose-400 hover:text-rose-200 ml-1"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        )}

        <button
          id="floating-mic-button"
          onClick={() => {
            setIsOpen(true);
            startSpeechRecognition();
          }}
          className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-purple-500/30 active:scale-95 hover:scale-105 transition-all duration-200 group relative border border-white/15"
          title="Open Voice Assistant"
        >
          <Mic className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
          <span className="absolute right-16 scale-0 group-hover:scale-100 bg-slate-900 border border-white/10 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl transition-all duration-150">
            Voice AI Assistant
          </span>
        </button>
      </div>

      {/* FULL-SCREEN IMMERSIVE COSMIC MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div 
            ref={modalRef}
            className="relative w-full max-w-2xl bg-slate-950/90 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-2xl animate-scale-up max-h-[95vh] h-[95vh] md:h-auto md:max-h-[90vh]"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px)`, 
              minHeight: "440px"
            }}
          >
            {/* Header / Brand bar */}
            <div 
              onMouseDown={handleMouseDown}
              onDoubleClick={handleDoubleClickHeader}
              className={`p-5 border-b border-white/10 flex items-center justify-between shrink-0 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
              title="Drag header to move. Double click to center."
            >
              <div className="flex items-center gap-2.5 pointer-events-none">
                <img 
                  src="/branding/logo-mark.svg" 
                  alt="TimeHero AI" 
                  className="w-8 h-8 rounded-lg object-contain" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-white leading-tight">TimeHero Voice</h4>
                  <p className="text-[10px] text-purple-400/80 font-bold uppercase tracking-widest leading-none mt-0.5">
                    Pro AI Assistant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Audio voice toggle */}
                <button
                  onClick={() => {
                    setAudioFeedbackEnabled(!audioFeedbackEnabled);
                    if (audioFeedbackEnabled) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className={`p-2 rounded-lg border transition-all duration-150 ${
                    audioFeedbackEnabled 
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                      : "bg-slate-900 border-white/5 text-slate-500"
                  }`}
                  title={audioFeedbackEnabled ? "Vocal Speech Synthesis On" : "Vocal Speech Synthesis Off"}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    stopSpeechRecognition();
                    window.speechSynthesis.cancel();
                    setIsOpen(false);
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Immersive Audio wave / active record panel - SCROLLABLE */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10">
              
              {/* Dynamic Chat Dialog Thread */}
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2 bg-white/5 rounded-2xl border border-white/5 p-4">
                    <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                    <span>TimeHero AI Partner Awaiting Input</span>
                    <p className="text-[10px] text-slate-600 font-medium normal-case mt-1">
                      Start dictating your exam prep, tasks, or study schedule rules.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 text-xs font-bold leading-relaxed ${
                            msg.role === "user"
                              ? "bg-purple-600/20 text-purple-200 rounded-tr-none border border-purple-500/10"
                              : "bg-slate-900 text-slate-200 rounded-tl-none border border-indigo-500/25 border-l-4 border-l-indigo-500"
                          }`}
                        >
                          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">
                            {msg.role === "user" ? "You" : "TimeHero AI Partner"}
                          </div>
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Dynamic Study Planner Sessions Checklist (Visual confirmation when complete) */}
              {analysisResult && analysisResult.isComplete && analysisResult.extractedTask?.studyPlannerSessions && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 space-y-3.5 animate-slide-up">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-indigo-300">
                      Tailored Study Roadmap Activated
                    </span>
                  </div>

                  <div className="space-y-2">
                    {analysisResult.extractedTask.studyPlannerSessions.map((sess: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/5 hover:border-purple-500/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{sess.task}</p>
                            <p className="text-[10px] text-slate-500">{sess.context}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] uppercase tracking-widest font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/10">
                            {sess.effort}h
                          </span>
                          <p className="text-[9px] text-slate-500 mt-1">{sess.deadline}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic waveform visualizer */}
              <div className="flex flex-col items-center justify-center min-h-[140px] relative bg-white/5 border border-white/5 p-4 rounded-2xl">
                {isListening ? (
                  <div className="flex items-center justify-center gap-2 h-14 mb-3">
                    <div className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full waveform-bar" style={{ height: "12px" }}></div>
                    <div className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full waveform-bar" style={{ height: "30px" }}></div>
                    <div className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full waveform-bar" style={{ height: "48px" }}></div>
                    <div className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full waveform-bar" style={{ height: "24px" }}></div>
                    <div className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full waveform-bar" style={{ height: "16px" }}></div>
                  </div>
                ) : isProcessing ? (
                  <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mb-4"></div>
                ) : (
                  <button
                    onClick={startSpeechRecognition}
                    className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-purple-400 hover:text-purple-300 transition-all duration-200 mb-4 group active:scale-95"
                  >
                    <Mic className="w-6 h-6 group-hover:scale-105 transition-transform" />
                  </button>
                )}

                <span className="text-xs font-black tracking-widest uppercase text-slate-400">
                  {isListening 
                    ? "LISTENING TO SPEECH..." 
                    : isProcessing 
                    ? "AI IS PROCESSING..." 
                    : "MIC STANDBY"}
                </span>

                {/* Helpful prompt hint */}
                {!transcript && !isProcessing && (
                  <p className="text-[11px] text-slate-500 mt-2 text-center max-w-sm">
                    Say "I have an exam next Monday" or "Start Pomodoro" or "Show today's tasks"
                  </p>
                )}
              </div>

              {/* Transcription Area with interactive edit */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  <span>Speech Transcription</span>
                  {transcript && <span>Editable Field</span>}
                </div>
                <div className="relative">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Type or dictate a productivity command here..."
                    className="w-full h-24 bg-slate-900/60 hover:bg-slate-900 focus:bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 resize-none transition-colors"
                  />
                  {transcript && !isListening && !isProcessing && (
                    <button
                      onClick={handleProcessInput}
                      className="absolute bottom-3 right-3 p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 active:scale-95 transition-all duration-150"
                      title="Process input"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error messages if any */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/15 text-rose-300 text-xs font-bold leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {/* Dynamic Analysis results overlay */}
              {analysisResult && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5 animate-slide-up">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black tracking-widest uppercase text-purple-300">
                        {analysisResult.isCommand ? "Command Processed" : "Schedule Generated"}
                      </span>
                    </div>
                    {analysisResult.unclear && (
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/20 uppercase tracking-widest">
                        Unclear
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 font-bold leading-relaxed">
                    "{analysisResult.speechResponse}"
                  </p>

                  {/* Suggestion & Buttons Action */}
                  {analysisResult.suggestion && (
                    <div className="mt-2.5 pt-3 border-t border-white/5 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>AI PROACTIVE SUGGESTION</span>
                      </div>
                      <p className="text-xs text-purple-200 leading-relaxed font-bold">
                        {analysisResult.suggestion}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSuggestionAction}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept & Execute</span>
                        </button>
                        <button
                          onClick={() => {
                            speakText("Alright, keeping things as is.");
                            setAnalysisResult(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-300 font-extrabold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Sticky Action Footer Controls */}
            <div className="p-5 border-t border-white/10 bg-slate-950/90 shrink-0">
              <div className="flex items-center gap-3">
                {isListening ? (
                  <button
                    onClick={stopSpeechRecognition}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop Recording</span>
                  </button>
                ) : (
                  <button
                    onClick={startSpeechRecognition}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-purple-400" />
                    <span>Start Recording</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
