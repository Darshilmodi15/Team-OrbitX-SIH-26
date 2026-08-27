import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Compass,
  Copy,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  MicOff,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Sparkles,
  Trash2,
  User,
  Waves,
  ShieldCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { OrcaLogo } from "@/components/orca/Logo";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useMarine } from "@/lib/orca/use-marine";
import { answerQuestion } from "@/lib/orca/assistant";
import { useSafetyLabel } from "@/components/orca/SafetyStatus";
import { transcribeVoiceAudio, sendChatMessage } from "@/services/api";
import type { ChatMessage } from "@/lib/orca/types";
import { cn } from "@/lib/utils";

interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = "orca_assistant_threads_v1";

function loadThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveThreads(threads: ChatThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    // ignore
  }
}

const LANG_BCP47: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  gu: "gu-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  ml: "ml-IN",
  bn: "bn-IN",
  kn: "kn-IN",
  or: "or-IN",
  pa: "pa-IN",
};

export default function AssistantPage() {
  const { t, lang } = useI18n();
  const { location } = useSession();
  const marine = useMarine(location?.coords ?? null);
  const levelLabel = useSafetyLabel();

  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    const existing = loadThreads();
    return existing.length > 0 ? existing[0].id : "default";
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Voice Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Active thread
  const currentThread = threads.find((th) => th.id === activeThreadId) || {
    id: activeThreadId,
    title: t("chat.title"),
    updatedAt: Date.now(),
    messages: [],
  };

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [currentThread.messages.length, isThinking]);

  function createNewThread() {
    const newId = `thread_${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: `${t("chat.title")} ${threads.length + 1}`,
      updatedAt: Date.now(),
      messages: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setMobileDrawerOpen(false);
    setInput("");
    inputRef.current?.focus();
  }

  function deleteThread(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const filtered = threads.filter((th) => th.id !== id);
    setThreads(filtered);
    if (activeThreadId === id) {
      setActiveThreadId(filtered.length > 0 ? filtered[0].id : "default");
    }
  }

  async function ask(text: string) {
    const question = text.trim();
    if (!question || isThinking) return;

    const now = Date.now();
    const userMsg: ChatMessage = { id: `u_${now}`, role: "user", text: question, at: now };

    // Update UI immediately with user's message
    setThreads((prev) => {
      const idx = prev.findIndex((th) => th.id === activeThreadId);
      if (idx >= 0) {
        const updated = [...prev];
        const isFirst = updated[idx].messages.length === 0;
        updated[idx] = {
          ...updated[idx],
          title: isFirst ? (question.length > 28 ? `${question.slice(0, 28)}...` : question) : updated[idx].title,
          updatedAt: now,
          messages: [...updated[idx].messages, userMsg],
        };
        return updated;
      } else {
        const newThread: ChatThread = {
          id: activeThreadId,
          title: question.length > 28 ? `${question.slice(0, 28)}...` : question,
          updatedAt: now,
          messages: [userMsg],
        };
        return [newThread, ...prev];
      }
    });

    setInput("");
    setIsThinking(true);

    let reply = "";
    try {
      // Gather past turns for multi-turn conversational reasoning
      const historyTurns = currentThread.messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await sendChatMessage({
        message: question,
        location: location ? { lat: location.coords.lat, lon: location.coords.lon } : { lat: 18.9220, lon: 72.8347 },
        date: new Date().toISOString().split("T")[0],
        language: lang || "auto",
        session_id: activeThreadId,
        history: historyTurns,
      });

      if (res && res.answer) {
        reply = res.answer;
      }
    } catch {
      // High-fidelity fallback to dynamic reasoning assistant
      reply = answerQuestion(question, {
        location: location ?? null,
        bundle: marine.data ?? null,
        levelLabel,
        lang,
        history: currentThread.messages.map((m) => ({ role: m.role, text: m.text })),
      });
    }

    if (!reply) {
      reply = answerQuestion(question, {
        location: location ?? null,
        bundle: marine.data ?? null,
        levelLabel,
        lang,
        history: currentThread.messages.map((m) => ({ role: m.role, text: m.text })),
      });
    }

    const botNow = Date.now();
    const botMsg: ChatMessage = { id: `a_${botNow}`, role: "assistant", text: reply, at: botNow };

    setThreads((prev) => {
      const idx = prev.findIndex((th) => th.id === activeThreadId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          updatedAt: botNow,
          messages: [...updated[idx].messages, botMsg],
        };
        return updated;
      }
      return prev;
    });

    setIsThinking(false);
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  /* ==========================================================================
     Voice Recognition & Speech-to-Text Controller
     ========================================================================== */
  async function startRecording() {
    // Start concurrent SpeechRecognition if supported
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let liveBrowserTranscript = "";

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = LANG_BCP47[lang] || "en-IN";
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let full = "";
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript;
          }
          if (full.trim()) {
            liveBrowserTranscript = full.trim();
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch {
        // ignore
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
        }
      }

      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {
            // ignore
          }
        }

        const actualMime = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        setIsTranscribing(true);

        try {
          // Call Sarvam AI STT
          const result = await transcribeVoiceAudio(audioBlob, lang || "auto");
          if (result && result.transcript && !result.is_mock) {
            setInput((prev) => (prev ? `${prev} ${result.transcript}` : result.transcript));
          } else if (liveBrowserTranscript) {
            setInput((prev) => (prev ? `${prev} ${liveBrowserTranscript}` : liveBrowserTranscript));
          } else if (result && result.transcript) {
            setInput((prev) => (prev ? `${prev} ${result.transcript}` : result.transcript));
          }
        } catch (err) {
          console.warn("Backend STT fallback to Web Speech:", err);
          if (liveBrowserTranscript) {
            setInput((prev) => (prev ? `${prev} ${liveBrowserTranscript}` : liveBrowserTranscript));
          }
        } finally {
          setIsTranscribing(false);
          setIsRecording(false);
          stream.getTracks().forEach((trk) => trk.stop());
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn("Microphone hardware error or denied:", err);
      if (!speechRecognitionRef.current) {
        alert("Voice input requires microphone permission on a supported browser.");
        setIsRecording(false);
      }
    }
  }

  function stopRecording() {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
    }
  }

  function toggleVoice() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  const suggestions = [
    { label: t("chat.s1"), icon: ShieldCheck },
    { label: t("chat.s2"), icon: Compass },
    { label: t("chat.s3"), icon: Waves },
    { label: t("chat.s4"), icon: AlertTriangle },
  ];

  return (
    <AppShell>
      <div className="relative flex h-[calc(100dvh-13rem)] sm:h-[calc(100vh-8.5rem)] w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {/* Mobile Backdrop Overlay */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Left ChatGPT-Style Sidebar (Drawer on mobile, collapsible on desktop) */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-card md:bg-surface/80 transition-all duration-300 ease-in-out",
            // Mobile Drawer Positioning
            "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl md:static md:z-auto md:max-w-none md:shadow-none",
            mobileDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            // Desktop Sidebar Collapsible Width
            sidebarOpen ? "md:w-64 lg:w-72" : "md:w-0 md:overflow-hidden md:border-r-0",
          )}
        >
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between border-b border-border p-3 md:hidden">
            <span className="text-xs font-bold text-foreground">Conversations</span>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Top New Chat Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={createNewThread}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 px-3.5 py-2.5 text-xs font-bold text-slate-950 shadow-md transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <MessageSquarePlus className="size-4" />
                <span>New Chat</span>
              </span>
              <Sparkles className="size-3.5 opacity-80" />
            </button>
          </div>

          {/* History Thread List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Conversations
            </p>
            {threads.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-muted-foreground italic">No past conversations</p>
            ) : (
              threads.map((th) => {
                const isActive = th.id === activeThreadId;
                return (
                  <div
                    key={th.id}
                    onClick={() => {
                      setActiveThreadId(th.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={cn(
                      "group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-teal-500/15 text-teal-400 font-semibold border border-teal-500/30"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <MessageSquare className={cn("size-3.5 shrink-0", isActive ? "text-teal-400" : "text-muted-foreground")} />
                      <span className="truncate">{th.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => deleteThread(th.id, e)}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity p-1 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer Info */}
          <div className="border-t border-border p-3 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>ORCA Maritime Copilot</span>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-mono">v2.4</span>
          </div>
        </aside>

        {/* Right Main Chat Panel */}
        <section className="flex flex-1 min-w-0 w-full flex-col overflow-hidden bg-background">
          {/* Chat Header */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-3 sm:px-4 backdrop-blur">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Mobile Conversations Drawer Trigger */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                title="Open conversations"
                aria-label="Open conversations"
              >
                <MessageSquare className="size-4 text-teal-400" />
              </button>

              {/* Desktop Sidebar Toggle Button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
                title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xs sm:text-sm font-bold text-foreground">
                  {currentThread.title}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 text-[11px] font-medium text-teal-400">
                <Bot className="size-3" />
                Live Ocean LLM
              </span>

              {/* Mobile Quick New Chat Button */}
              <button
                type="button"
                onClick={createNewThread}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-teal-500/15 border border-teal-500/30 px-2 py-1 text-xs font-semibold text-teal-400 hover:bg-teal-500/25 transition md:hidden"
                title="New Chat"
              >
                <MessageSquarePlus className="size-3.5" />
                <span className="text-[11px]">New</span>
              </button>

              {currentThread.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setThreads((prev) =>
                      prev.map((th) => (th.id === activeThreadId ? { ...th, messages: [] } : th)),
                    );
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-red-400"
                  title="Clear chat"
                >
                  <Trash2 className="size-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </header>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            {currentThread.messages.length === 0 ? (
              /* ChatGPT-Style Empty State */
              <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center px-1 py-4">
                <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shadow-md">
                  <OrcaLogo className="size-8 sm:size-9 shrink-0" />
                </div>
                <h2 className="mt-3 sm:mt-4 text-lg sm:text-xl font-bold text-foreground">{t("chat.title")}</h2>
                <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground">{t("chat.subtitle")}</p>

                {/* 4 Interactive Starting Cards */}
                <div className="mt-6 sm:mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 text-left">
                  {suggestions.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => ask(label)}
                      className="group flex cursor-pointer items-start gap-2.5 sm:gap-3 rounded-lg border border-border bg-card p-3 sm:p-3.5 text-xs font-medium text-foreground transition-all hover:border-teal-500/50 hover:bg-muted shadow-xs active:scale-[0.98]"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-teal-400 group-hover:scale-110 transition-transform" />
                      <span className="leading-snug">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Bubbles */
              currentThread.messages.map((m) => (
                <div key={m.id} className="flex gap-2.5 sm:gap-3">
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex size-7.5 sm:size-8 shrink-0 items-center justify-center rounded-lg border shadow-xs",
                      m.role === "user"
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-teal-500/10 border-teal-500/30",
                    )}
                  >
                    {m.role === "user" ? (
                      <User className="size-4" />
                    ) : (
                      <OrcaLogo className="size-5 sm:size-5.5 shrink-0" />
                    )}
                  </div>

                  {/* Message Content Body */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {m.role === "user" ? "You" : "ORCA Marine Intelligence"}
                      </span>
                      {m.role === "assistant" && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.text, m.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          title="Copy message"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="size-3 text-teal-400" />
                              <span className="text-teal-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div
                      className={cn(
                        "rounded-lg p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words shadow-xs",
                        m.role === "user"
                          ? "bg-secondary text-secondary-foreground font-medium"
                          : "border border-border bg-card text-foreground",
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* AI Thinking / Telemetry Analysis Pulse Bubble */}
            {isThinking && (
              <div className="flex gap-2.5 sm:gap-3 animate-fade-in">
                <div className="flex size-7.5 sm:size-8 shrink-0 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10 shadow-xs">
                  <OrcaLogo className="size-5 sm:size-5.5 shrink-0 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-teal-400">ORCA Marine Intelligence</span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-teal-500/20 bg-teal-950/20 p-3 sm:p-3.5 text-xs text-muted-foreground shadow-xs">
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-teal-400" />
                    <span>Analyzing live oceanographic telemetry and calculating safety parameters...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Voice Recording Status Toast */}
          {(isRecording || isTranscribing) && (
            <div className="border-t border-teal-500/30 bg-teal-950/40 px-3 sm:px-4 py-2 text-xs flex items-center justify-between backdrop-blur animate-pulse">
              <div className="flex items-center gap-2 text-teal-300 min-w-0">
                <span className="size-2.5 shrink-0 rounded-full bg-red-500 animate-ping" />
                <span className="truncate">
                  {isTranscribing
                    ? "Transcribing voice audio..."
                    : `Listening in ${LANG_BCP47[lang] || "selected language"}...`}
                </span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="shrink-0 inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold cursor-pointer px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-xs"
              >
                <X className="size-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Bottom Docked Input */}
          <div className="border-t border-border bg-card/95 p-2.5 sm:p-4 backdrop-blur">
            <div className="mx-auto max-w-3xl space-y-2">
              {/* Quick suggestion chips */}
              {currentThread.messages.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
                  {suggestions.map(({ label }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={isThinking}
                      onClick={() => ask(label)}
                      className="cursor-pointer shrink-0 rounded-full border border-border bg-surface px-2.5 sm:px-3 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted hover:border-teal-500/40 shadow-xs whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Box with Microphone and Send Button */}
              <form
                className="flex items-end gap-1.5 sm:gap-2 rounded-xl border border-border bg-surface p-1.5 sm:p-2 shadow-inner focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  disabled={isThinking}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                  rows={1}
                  placeholder={t("chat.placeholder")}
                  aria-label={t("chat.placeholder")}
                  className="max-h-28 sm:max-h-32 min-h-9 sm:min-h-10 flex-1 resize-none bg-transparent px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none ring-0 disabled:opacity-50"
                />

                {/* Microphone Button */}
                <button
                  type="button"
                  disabled={isThinking}
                  onClick={toggleVoice}
                  title={isRecording ? "Stop recording" : "Speak in your language"}
                  className={cn(
                    "flex size-9 sm:size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                    isRecording
                      ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse shadow-md shadow-red-500/20"
                      : isTranscribing
                      ? "border-amber-500 bg-amber-500/20 text-amber-400"
                      : "border-border bg-card text-teal-400 hover:bg-muted hover:text-teal-300 shadow-xs",
                  )}
                  aria-label="Voice input"
                >
                  {isTranscribing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="size-4 text-red-400" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className="flex size-9 sm:size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t("chat.send")}
                >
                  {isThinking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </form>

              <p className="text-center text-[10px] text-muted-foreground hidden sm:block">
                ORCA Marine AI is grounded on live oceanographic sensors. Always follow official VHF maritime advisories.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
