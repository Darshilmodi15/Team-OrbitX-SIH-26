import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
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
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { OrcaLogo } from "@/components/orca/Logo";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useMarine } from "@/lib/orca/use-marine";
import { answerQuestion } from "@/lib/orca/assistant";
import { useSafetyLabel } from "@/components/orca/SafetyStatus";
import { transcribeVoiceAudio, sendChatMessage, synthesizeVoiceAudio } from "@/services/api";
import { MarkdownRenderer } from "@/components/orca/MarkdownRenderer";
import type { ChatMessage } from "@/lib/orca/types";
import { cn } from "@/lib/utils";

interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

type VoiceState = "idle" | "preparing" | "listening" | "processing" | "transcribing" | "error";

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
  or: "od-IN",
  pa: "pa-IN",
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  gu: "ગુજરાતી (Gujarati)",
  mr: "मराठी (Marathi)",
  ta: "தமிழ் (Tamil)",
  te: "తెలుగు (Telugu)",
  ml: "മലയാളം (Malayalam)",
  bn: "বাংলা (Bengali)",
  kn: "ಕನ್ನಡ (Kannada)",
  or: "ଓଡ଼ିଆ (Odia)",
  pa: "ਪੰਜਾਬੀ (Punjabi)",
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

  // Voice State Machine & Recording
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordingTimerRef = useRef<any>(null);

  // Audio Playback (TTS) State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isLoadingAudioId, setIsLoadingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

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
  }, [currentThread.messages.length, isThinking, voiceState]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  function createNewThread() {
    stopAudio();
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
    stopAudio();
    const filtered = threads.filter((th) => th.id !== id);
    setThreads(filtered);
    if (activeThreadId === id) {
      setActiveThreadId(filtered.length > 0 ? filtered[0].id : "default");
    }
  }

  /* ==========================================================================
     TTS Regional Audio Playback
     ========================================================================== */
  function stopAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingMessageId(null);
    setIsLoadingAudioId(null);
  }

  async function playMessageAudio(msgId: string, text: string) {
    if (playingMessageId === msgId) {
      stopAudio();
      return;
    }

    stopAudio();
    setIsLoadingAudioId(msgId);

    try {
      // Use clean text snippet without markdown for voice
      const cleanSnippet = text.replace(/[*#_`•-]/g, " ").trim().slice(0, 450);
      const res = await synthesizeVoiceAudio(cleanSnippet, lang || "en");
      if (res && res.audio_base64) {
        const audio = new Audio(`data:audio/${res.audio_format || "wav"};base64,${res.audio_base64}`);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setPlayingMessageId(null);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setPlayingMessageId(null);
          currentAudioRef.current = null;
        };
        await audio.play();
        setPlayingMessageId(msgId);
      }
    } catch (err) {
      console.warn("TTS Playback unavailable:", err);
    } finally {
      setIsLoadingAudioId(null);
    }
  }

  /* ==========================================================================
     Conversational Pipeline Execution
     ========================================================================== */
  async function ask(text: string) {
    const question = text.trim();
    if (!question || isThinking) return;

    stopAudio();
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
    setInterimTranscript("");
    setIsThinking(true);

    let reply = "";
    try {
      // Multi-turn context resolution
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
    } catch (err) {
      console.warn("Backend /api/chat error, falling back to local engine:", err);
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
    stopAudio();
    setVoiceErrorMessage(null);
    setInterimTranscript("");
    setVoiceState("preparing");

    // Start concurrent SpeechRecognition for visual interim preview only
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
            setInterimTranscript(liveBrowserTranscript);
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
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {
            // ignore
          }
        }

        setVoiceState("transcribing");
        const actualMime = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });

        try {
          // Call authoritative Sarvam Saaras v3 STT
          const result = await transcribeVoiceAudio(audioBlob, lang || "auto");
          let finalSpokenText = "";

          if (result && result.transcript && result.transcript.trim() && !result.is_mock) {
            finalSpokenText = result.transcript.trim();
          } else if (result && result.transcript && result.transcript.trim()) {
            finalSpokenText = result.transcript.trim();
          } else if (liveBrowserTranscript) {
            finalSpokenText = liveBrowserTranscript;
          }

          if (finalSpokenText) {
            // Ask directly through the intelligent assistant pipeline
            setVoiceState("idle");
            ask(finalSpokenText);
          } else {
            setVoiceErrorMessage("Could not detect clear speech. Please try speaking again or type your question.");
            setVoiceState("error");
          }
        } catch (err) {
          console.warn("Backend STT fallback:", err);
          if (liveBrowserTranscript) {
            setVoiceState("idle");
            ask(liveBrowserTranscript);
          } else {
            setVoiceErrorMessage("Transcription service temporarily unavailable. Please try again or type.");
            setVoiceState("error");
          }
        } finally {
          stream.getTracks().forEach((trk) => trk.stop());
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setVoiceState("listening");
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access denied or hardware error:", err);
      setVoiceErrorMessage("Microphone access is required for voice questions. Please allow microphone permission or type below.");
      setVoiceState("error");
    }
  }

  function stopRecording() {
    if (voiceState === "listening") {
      setVoiceState("processing");
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
          setVoiceState("idle");
        }
      } else {
        setVoiceState("idle");
      }
    } else {
      setVoiceState("idle");
    }
  }

  function toggleVoice() {
    if (voiceState === "listening") {
      stopRecording();
    } else if (voiceState === "idle" || voiceState === "error") {
      startRecording();
    }
  }

  // 4 Intelligent Prompt Shortcuts (Natural Marine Queries)
  const suggestions = [
    {
      id: "pfz",
      label: t("chat.s1") || "Nearest PFZ",
      prompt: "Where is the nearest Potential Fishing Zone (PFZ) from my current location and what are the fish species?",
      icon: ShieldCheck,
    },
    {
      id: "weather",
      label: t("chat.s2") || "Marine Weather",
      prompt: "What is the wind speed, wave height, and marine weather condition near my location right now?",
      icon: Compass,
    },
    {
      id: "safety",
      label: t("chat.s3") || "Safety Check",
      prompt: "Is it safe to venture into the sea for fishing today and tomorrow morning?",
      icon: Waves,
    },
    {
      id: "nav",
      label: t("chat.s4") || "Navigation & Boundary",
      prompt: "What is the safest navigational route from my position and how far am I from the coast and territorial boundary?",
      icon: AlertTriangle,
    },
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
            "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl md:static md:z-auto md:max-w-none md:shadow-none",
            mobileDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            sidebarOpen ? "md:w-64 lg:w-72" : "md:w-0 md:overflow-hidden md:border-r-0",
          )}
        >
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between border-b border-border p-3 md:hidden">
            <span className="text-xs font-bold text-foreground">Conversations</span>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Top New Chat Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={createNewThread}
              className="flex w-full min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <MessageSquarePlus className="size-4.5" />
                <span>New Chat</span>
              </span>
              <Sparkles className="size-4 opacity-80" />
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
                      stopAudio();
                      setActiveThreadId(th.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={cn(
                      "group flex w-full min-h-[40px] cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors",
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
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer Info */}
          <div className="border-t border-border p-3 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>ORCA Marine Decision AI</span>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-mono">v3.0 Multi</span>
          </div>
        </aside>

        {/* Right Main Chat Panel */}
        <section className="flex flex-1 min-w-0 w-full flex-col overflow-hidden bg-background">
          {/* Chat Header */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-3 sm:px-4 backdrop-blur">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Mobile Drawer Trigger */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                title="Open conversations"
                aria-label="Open conversations"
              >
                <MessageSquare className="size-4.5 text-teal-400" />
              </button>

              {/* Desktop Sidebar Toggle */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
                title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose className="size-4.5" /> : <PanelLeftOpen className="size-4.5" />}
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
                <span>{LANG_NAMES[lang] || "Multilingual Grounded AI"}</span>
              </span>

              {/* Mobile Quick New Chat Button */}
              <button
                type="button"
                onClick={createNewThread}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 text-xs font-semibold text-teal-400 hover:bg-teal-500/25 transition md:hidden"
                title="New Chat"
              >
                <MessageSquarePlus className="size-4" />
                <span className="text-[11px]">New</span>
              </button>

              {currentThread.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stopAudio();
                    setThreads((prev) =>
                      prev.map((th) => (th.id === activeThreadId ? { ...th, messages: [] } : th)),
                    );
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-red-400"
                  title="Clear chat"
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </header>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            {currentThread.messages.length === 0 ? (
              /* ChatGPT-Style Empty State with 4 Intelligent Prompt Cards */
              <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center px-1 py-4">
                <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shadow-md">
                  <OrcaLogo className="size-9 sm:size-10 shrink-0" />
                </div>
                <h2 className="mt-3 sm:mt-4 text-lg sm:text-xl font-bold text-foreground">{t("chat.title")}</h2>
                <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground">
                  Ask any marine, weather, fishing zone, boundary, or emergency question in your native language (voice or text).
                </p>

                {/* 4 Interactive Starting Cards */}
                <div className="mt-6 sm:mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
                  {suggestions.map(({ label, prompt, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => ask(prompt)}
                      className="group flex min-h-[52px] cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 sm:p-3.5 text-xs font-medium text-foreground transition-all hover:border-teal-500/50 hover:bg-muted shadow-xs active:scale-[0.98]"
                    >
                      <Icon className="mt-0.5 size-4.5 shrink-0 text-teal-400 group-hover:scale-110 transition-transform" />
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
                      "flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border shadow-xs",
                      m.role === "user"
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-teal-500/10 border-teal-500/30",
                    )}
                  >
                    {m.role === "user" ? (
                      <User className="size-4.5" />
                    ) : (
                      <OrcaLogo className="size-5.5 sm:size-6 shrink-0" />
                    )}
                  </div>

                  {/* Message Content Body */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {m.role === "user" ? "You" : "ORCA Marine Intelligence"}
                      </span>
                      
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1">
                          {/* Audio TTS Playback Button */}
                          <button
                            type="button"
                            onClick={() => playMessageAudio(m.id, m.text)}
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition",
                              playingMessageId === m.id
                                ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 animate-pulse"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                            title="Listen in your language"
                            aria-label="Listen audio"
                          >
                            {isLoadingAudioId === m.id ? (
                              <Loader2 className="size-3.5 animate-spin text-teal-400" />
                            ) : playingMessageId === m.id ? (
                              <>
                                <VolumeX className="size-3.5 text-teal-400" />
                                <span className="text-teal-400">Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="size-3.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          {/* Copy Message Button */}
                          <button
                            type="button"
                            onClick={() => handleCopy(m.text, m.id)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="Copy message"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="size-3.5 text-teal-400" />
                                <span className="text-teal-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        "rounded-lg p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed break-words shadow-xs",
                        m.role === "user"
                          ? "bg-secondary text-secondary-foreground font-medium whitespace-pre-wrap"
                          : "border border-border bg-card text-foreground",
                      )}
                    >
                      {m.role === "user" ? (
                        m.text
                      ) : (
                        <MarkdownRenderer content={m.text} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* AI Thinking / Telemetry Analysis Pulse Bubble */}
            {isThinking && (
              <div className="flex gap-2.5 sm:gap-3 animate-fade-in">
                <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10 shadow-xs">
                  <OrcaLogo className="size-5.5 sm:size-6 shrink-0 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-teal-400">ORCA Marine Intelligence</span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-teal-500/20 bg-teal-950/20 p-3.5 sm:p-4 text-xs text-muted-foreground shadow-xs">
                    <Loader2 className="size-4 shrink-0 animate-spin text-teal-400" />
                    <span>ORCA is checking live marine conditions and analyzing ocean data...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Voice State Banner / Live Listening Status */}
          {voiceState !== "idle" && (
            <div
              className={cn(
                "border-t px-3.5 sm:px-4 py-2.5 text-xs flex items-center justify-between backdrop-blur transition-all",
                voiceState === "error"
                  ? "border-red-500/30 bg-red-950/40 text-red-200"
                  : "border-teal-500/30 bg-teal-950/40 text-teal-200 animate-pulse",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {voiceState === "listening" ? (
                  <>
                    <span className="size-3 shrink-0 rounded-full bg-red-500 animate-ping" />
                    <span className="font-semibold text-teal-300">
                      🎙️ Listening ({recordingSeconds}s)... Speak your question naturally.
                    </span>
                    {interimTranscript && (
                      <span className="text-teal-400/80 italic truncate max-w-xs">
                        "{interimTranscript}"
                      </span>
                    )}
                  </>
                ) : voiceState === "preparing" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-teal-400" />
                    <span>Initializing microphone...</span>
                  </>
                ) : voiceState === "processing" || voiceState === "transcribing" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-teal-400" />
                    <span>Processing your voice with Sarvam Saaras AI...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-4 shrink-0 text-red-400" />
                    <span className="text-red-300">{voiceErrorMessage || "Voice recognition error"}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {voiceState === "listening" && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-1 text-slate-950 font-bold cursor-pointer px-3 py-1 rounded bg-teal-400 hover:bg-teal-300 text-xs shadow-xs"
                  >
                    <span>Done Speaking</span>
                  </button>
                )}
                {voiceState === "error" && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="inline-flex items-center gap-1 text-teal-300 font-semibold cursor-pointer px-2.5 py-1 rounded border border-teal-500/30 bg-teal-500/20 text-xs hover:bg-teal-500/30"
                  >
                    <RotateCcw className="size-3" />
                    <span>Try Again</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setVoiceState("idle")}
                  className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* Bottom Docked Input */}
          <div className="border-t border-border bg-card/95 p-2.5 sm:p-4 backdrop-blur">
            <div className="mx-auto max-w-3xl space-y-2.5">
              {/* Quick suggestion chips (natural prompts) */}
              {currentThread.messages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
                  {suggestions.map(({ label, prompt }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={isThinking || voiceState === "listening"}
                      onClick={() => ask(prompt)}
                      className="cursor-pointer shrink-0 min-h-[36px] rounded-full border border-border bg-surface px-3 sm:px-3.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted hover:border-teal-500/40 shadow-xs whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Box with Microphone and Send Button */}
              <form
                className="flex items-end gap-2 rounded-xl border border-border bg-surface p-1.5 sm:p-2 shadow-inner focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  disabled={isThinking || voiceState === "listening"}
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
                  className="max-h-28 sm:max-h-32 min-h-11 sm:min-h-12 flex-1 resize-none bg-transparent px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none ring-0 disabled:opacity-50"
                />

                {/* Large Microphone Button */}
                <button
                  type="button"
                  disabled={isThinking}
                  onClick={toggleVoice}
                  title={voiceState === "listening" ? "Stop recording and transcribe" : "Speak in Hindi, Gujarati, or any Indian language"}
                  className={cn(
                    "flex size-11 sm:size-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                    voiceState === "listening"
                      ? "border-red-500 bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                      : voiceState === "transcribing" || voiceState === "processing"
                      ? "border-amber-500 bg-amber-500/20 text-amber-400"
                      : "border-border bg-card text-teal-400 hover:bg-muted hover:text-teal-300 shadow-xs",
                  )}
                  aria-label="Voice input"
                >
                  {voiceState === "transcribing" || voiceState === "processing" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : voiceState === "listening" ? (
                    <MicOff className="size-5" />
                  ) : (
                    <Mic className="size-5" />
                  )}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking || voiceState === "listening"}
                  className="flex size-11 sm:size-12 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t("chat.send")}
                >
                  {isThinking ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5" />
                  )}
                </button>
              </form>

              <p className="text-center text-[10px] text-muted-foreground hidden sm:block">
                ORCA Marine Decision AI is grounded on live INCOIS ocean sensors. Always maintain VHF Channel 16 radio watch.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
