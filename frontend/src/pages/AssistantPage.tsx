import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Eye,
  Layers,
  Loader2,
  MapPin,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  MicOff,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Trash2,
  User,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { fetchSnapshot, useMarineSnapshot, snapshotExpired } from "@/lib/orca/snapshot";
import { VoiceControls } from "@/components/orca/VoiceControls";
import { ChatSnapshot } from "@/components/orca/ChatSnapshot";
import { AppShell } from "@/components/orca/AppShell";
import { OrcaLogo } from "@/components/orca/Logo";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { sendChatMessage, synthesizeVoiceAudio, fetchConversations, fetchConversation, createConversation, deleteConversation } from "@/services/api";
import { MarkdownRenderer } from "@/components/orca/MarkdownRenderer";
import type { ChatMessage, ChatEvidence } from "@/lib/orca/types";
import { cn } from "@/lib/utils";

interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
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

function EvidenceTraceCard({ evidence }: { evidence: ChatEvidence }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const hasWeather =
    evidence.weather &&
    (evidence.weather.wave_height_m != null ||
      evidence.weather.wind_speed_kmh != null ||
      evidence.weather.temperature_c != null ||
      evidence.weather.sea_surface_temperature_c != null);
  const hasPfz = evidence.nearest_pfz && evidence.nearest_pfz.length > 0;
  const hasBoundary = evidence.boundary && evidence.boundary.distance_to_boundary_km != null;
  const hasSources = evidence.sources && evidence.sources.length > 0;
  const hasReasoning = evidence.reasoning && evidence.reasoning.length > 0;

  if (!hasWeather && !hasPfz && !hasBoundary && !hasSources && !evidence.risk_level) return null;

  return (
    <div className="mt-3 rounded-lg border border-border/80 bg-muted/40 text-xs overflow-hidden transition-all shadow-xs">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/60 border-b border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 font-semibold text-teal-400 text-[11px]">
            <Sparkles className="size-3 text-teal-400" />
            <span>{t("chat.evidence")}</span>
          </span>
          {evidence.risk_level && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                evidence.risk_level === "safe"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : evidence.risk_level === "caution"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30",
              )}
            >
              {evidence.risk_level}
            </span>
          )}
          {evidence.connectivity_mode && (
            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
              {t(["FRESH", "LIVE"].includes(evidence.connectivity_mode) ? "state.live" : evidence.connectivity_mode === "CACHED" ? "health.cached" : evidence.connectivity_mode === "STALE" ? "health.stale" : "chat.unavailable")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-medium transition"
        >
          <span>{isOpen ? t("chat.hideTrace") : t("chat.viewTrace")}</span>
          {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-card/40">
        {hasWeather && (
          <>
            {evidence.weather.wave_height_m != null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Waves className="size-3 text-cyan-400" />
                <span>{evidence.weather.wave_height_m?.toFixed(1)}m {t("marine.wave")}</span>
              </span>
            )}
            {evidence.weather.wind_speed_kmh != null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Wind className="size-3 text-sky-400" />
                <span>
                  {evidence.weather.wind_speed_kmh?.toFixed(0)} km/h {evidence.weather.wind_direction_cardinal || ""}
                </span>
              </span>
            )}
            {(evidence.weather.sea_surface_temperature_c != null) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Thermometer className="size-3 text-amber-400" />
                <span>
                  {evidence.weather.sea_surface_temperature_c?.toFixed(1)}°C {t("marine.sst")}
                </span>
              </span>
            )}
            {evidence.weather.visibility_km != null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Eye className="size-3 text-teal-400" />
                <span>{evidence.weather.visibility_km?.toFixed(0)} km {t("marine.visibility")}</span>
              </span>
            )}
          </>
        )}

        {hasPfz && evidence.nearest_pfz![0] && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px] font-mono">
            <span>🐟</span>
            <span>
              PFZ: {evidence.nearest_pfz![0].distance_km != null ? `${evidence.nearest_pfz![0].distance_km.toFixed(1)} km` : evidence.nearest_pfz![0].name || "Active"}
            </span>
          </span>
        )}

        {hasBoundary && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono">
            <ShieldCheck className="size-3 text-indigo-400" />
            <span>
              {evidence.boundary.inside_eez ? "Inside EEZ" : "Buffer Zone"} ({evidence.boundary.distance_to_boundary_km?.toFixed(1)} km)
            </span>
          </span>
        )}
      </div>

      {isOpen && (
        <div className="p-3 border-t border-border/60 bg-card/90 space-y-2.5 animate-fadeIn">
          {hasSources && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                {t("chat.providers")}:
              </span>
              <div className="flex flex-wrap gap-1">
                {evidence.sources!.map((src, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-mono border border-border"
                  >
                    <CheckCircle2 className="size-2.5 text-teal-400" />
                    <span>{src}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasReasoning && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                {t("chat.steps")}:
              </span>
              <ul className="space-y-1 text-[11px] text-muted-foreground pl-1">
                {evidence.reasoning!.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-teal-400 font-bold">›</span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssistantPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { user, location } = useSession();
  const marine = useMarineSnapshot();
  const retryRequest = useRef<{ question:string; thread:string; id:string; language?:string; requestedTime?:string } | null>(null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState<"chat.startFailed" | "chat.requestFailed" | "chat.providerUnavailable" | null>(null);
  const requestInFlightRef = useRef(false);
  const historyVersion = useRef(0);
  const newlyCreatedConversation = useRef<string | null>(null);

  const [voiceBusy, setVoiceBusy] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isLoadingAudioId, setIsLoadingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentThread = threads.find((th) => th.id === activeThreadId) || {
    id: activeThreadId,
    title: t("chat.title"),
    updatedAt: Date.now(),
    messages: [],
  };

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (requestInFlightRef.current) return;
      const version = historyVersion.current;
      Promise.all([fetchConversations(), conversationId ? fetchConversation(conversationId) : Promise.resolve(null)]).then(([rows, selected]: [any[], any]) => {
        if (selected) rows = [selected, ...rows.filter(row => row.id !== selected.id)];
        if (cancelled || requestInFlightRef.current || version !== historyVersion.current) return;
        const mapped = rows.map((row) => ({ id: row.id, title: row.title, updatedAt: new Date(row.updated_at).getTime(), messages: (row.messages || []).map((m: any) => ({ id: m.metadata?.request_id ? `${m.role === "user" ? "u" : "a"}_${m.metadata.request_id}` : m.id, role: m.role, text: m.content, at: new Date(m.created_at).getTime(), evidence: m.metadata })) }));
        setThreads(mapped);
        const selectedRow=rows.find(row=>row.id === conversationId);
        const last=selectedRow?.messages?.at(-1);
        if(last?.role === "user" && last.metadata?.request_id){
          retryRequest.current={question:last.content,thread:selectedRow.id,id:last.metadata.request_id,language:last.metadata.request_language,requestedTime:last.metadata.requested_time ?? undefined};
          setInput(value=>value || last.content);
        }
        if (conversationId && !mapped.some(row => row.id === conversationId)) {
          setChatError("chat.requestFailed");
        }
      }).catch(() => { if (!cancelled) setChatError("chat.requestFailed"); });
    };
    setActiveThreadId(conversationId || "");
    setChatError(null);
    if(newlyCreatedConversation.current === conversationId) newlyCreatedConversation.current = null;
    else sync();
    window.addEventListener("focus", sync);
    return () => { cancelled = true; window.removeEventListener("focus", sync); };
  }, [user?.id, conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [currentThread.messages.length, isThinking]);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

    };
  }, []);

  async function createNewThread() {
    stopAudio();
    if (requestInFlightRef.current) return;
    setActiveThreadId("");
    navigate("/assistant");
    setChatError(null);
    setMobileDrawerOpen(false);
    setInput("");
    inputRef.current?.focus();
  }

  async function deleteThread(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    stopAudio();
    if (requestInFlightRef.current) return;
    try { await deleteConversation(id); } catch { setChatError("chat.requestFailed"); return; }
    const filtered = threads.filter((th) => th.id !== id);
    setThreads(filtered);
    if (activeThreadId === id) {
      if (filtered.length > 0) {
        setActiveThreadId(filtered[0].id);
        navigate(`/assistant/c/${filtered[0].id}`, { replace: true });
      } else {
        setThreads([]);
        setActiveThreadId("");
        navigate("/assistant", { replace: true });
      }
    }
  }

  function stopAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingMessageId(null);
    setIsLoadingAudioId(null);
  }

  async function playMessageAudio(msgId: string, text: string, msgLang?: string) {
    if (playingMessageId === msgId) {
      stopAudio();
      return;
    }

    stopAudio();
    setIsLoadingAudioId(msgId);

    try {
      const cleanSnippet = text.replace(/[*#_`•-]/g, " ").trim().slice(0, 450);
      const targetVoiceLang = msgLang || lang || "en";
      const res = await synthesizeVoiceAudio(cleanSnippet, targetVoiceLang);
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

  async function ask(text: string) {
    const question = text.trim();
    if (!question || requestInFlightRef.current) return;
    historyVersion.current++;
    requestInFlightRef.current = true;

    setIsThinking(true);
    setChatError(null);
    let startingConversation = !activeThreadId;
    try {
      stopAudio();
      let targetThreadId = activeThreadId;
      if (!targetThreadId) {
        const created = await createConversation(question.length > 80 ? question.slice(0, 80) : question);
        targetThreadId = created.id;
        newlyCreatedConversation.current = targetThreadId;
        setActiveThreadId(targetThreadId);
        navigate(`/assistant/c/${targetThreadId}`, { replace: true });
      }
      startingConversation = false;
      const now = Date.now();
      const retry = retryRequest.current?.question === question && retryRequest.current.thread === targetThreadId;
      const requestId = retry ? retryRequest.current!.id : crypto.randomUUID();
      if(!retry) retryRequest.current = { question, thread: targetThreadId, id: requestId, language:lang || "auto",requestedTime:marine.snapshot?.request.requested_time };
      const userMsg: ChatMessage = { id: `u_${requestId}`, role: "user", text: question, at: now };

      setThreads((prev) => {
        const idx = prev.findIndex((th) => th.id === targetThreadId);
        if (idx >= 0) {
          const updated = [...prev];
          const isFirst = updated[idx].messages.length === 0;
          updated[idx] = {
            ...updated[idx],
            title: isFirst ? (question.length > 28 ? `${question.slice(0, 28)}...` : question) : updated[idx].title,
            updatedAt: now,
            messages: updated[idx].messages.some(m => m.id === userMsg.id) ? updated[idx].messages : [...updated[idx].messages, userMsg],
          };
          return updated;
        } else {
          const newThread: ChatThread = {
            id: targetThreadId,
            title: question.length > 28 ? `${question.slice(0, 28)}...` : question,
            updatedAt: now,
            messages: [userMsg],
          };
          return [newThread, ...prev];
        }
      });

      setInput("");
      setIsThinking(true);

      let snapshot = marine.snapshot;
      const greeting = /^(hello|hi|hey|thanks|thank you|good morning|good evening|namaste|namaskar|નમસ્તે|નમસ્કાર|હેલો|આભાર|नमस्ते|नमस्कार|धन्यवाद)[!.?\s]*$/i.test(question);
      if (!greeting && snapshot && snapshotExpired(snapshot)) {
        const refreshed = await marine.refetch() as {data?: typeof snapshot};
        snapshot = refreshed.data;
      }
      if(!greeting && retry && retryRequest.current?.requestedTime && snapshot?.request.requested_time !== retryRequest.current.requestedTime){
        snapshot=await fetchSnapshot(retryRequest.current.requestedTime);
        marine.adopt(snapshot);
      }
      if(!retry && retryRequest.current) retryRequest.current.requestedTime=snapshot?.request.requested_time;
      const res = await sendChatMessage({
        message: question,
        ...(location ? { location: { lat: location.coords.lat, lon: location.coords.lon } } : {}),
        date: new Date().toISOString().split("T")[0],
        language: retryRequest.current?.language || lang || "auto",
        session_id: targetThreadId,
        request_id: requestId,
        snapshot_id: greeting ? undefined : snapshot?.snapshot_id,
        requested_time: greeting ? undefined : retryRequest.current?.requestedTime,
      });

      if (!res || !res.answer) {
        throw new Error("Empty authoritative response");
      }

      retryRequest.current = null;
      if(res.marine_snapshot) marine.adopt(res.marine_snapshot);
      const botNow = Date.now();
      const botMsg: ChatMessage = {
        id: `a_${requestId}`,
        role: "assistant",
        text: res.answer,
        at: botNow,
        evidence: {
          snapshot_id: res.snapshot_id,
          marine_snapshot: res.marine_snapshot,
          sources: res.sources_used || [],
          reasoning: res.reasoning || [],
          risk_level: res.risk_level || null,
          weather: res.weather || null,
          nearest_pfz: res.nearest_pfz || null,
          boundary: res.boundary || null,
          route: res.route || null,
          alerts: res.alerts || [],
          simulation: res.simulation || null,
          ocean_analytics: res.ocean_analytics || null,
          ecology: res.ecology || null,
          zone_avoidance: res.zone_avoidance || null,
          tide: res.tide || null,
          recommendations: res.recommendations || [],
          connectivity_mode: res.connectivity_mode || "UNAVAILABLE",
          language: res.language || lang || "en",
          language_name: res.language_name || "English",
          plan: res.plan || null,
          location: res.location || null,
        },
      };

      setThreads((prev) => {
        const idx = prev.findIndex((th) => th.id === targetThreadId);
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
      return {text: botMsg.text, language: botMsg.evidence?.language};
    } catch (err) {
      console.warn("Chat request failed", err);
      const providerUnavailable = err instanceof Error && 'code' in err && err.code === 'AI_PROVIDER_UNAVAILABLE';
      setChatError(startingConversation ? "chat.startFailed" : providerUnavailable ? "chat.providerUnavailable" : "chat.requestFailed");
      setInput(question);
    } finally {
      setIsThinking(false);
      requestInFlightRef.current = false;
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      <SEO
        title="AI Ocean Copilot — Multilingual Marine Decision Support | ORCA AI"
        description="Multilingual conversational agent providing instant voice and text advice on potential fishing zones, ocean weather, and safe maritime navigation in 9 coastal languages."
      />
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
                <span>{t("chat.new")}</span>
              </span>
              <Sparkles className="size-4 opacity-80" />
            </button>
          </div>

          {/* History Thread List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("chat.title")}
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
                      setActiveThreadId(th.id); navigate(`/assistant/c/${th.id}`);
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
                      title={t("chat.delete")}
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
                title={t("chat.title")}
                aria-label={t("chat.title")}
              >
                <MessageSquare className="size-4.5 text-teal-400" />
              </button>

              {/* Desktop Sidebar Toggle */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
                title={t("chat.title")}
                aria-label={t("chat.title")}
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
                title={t("chat.new")}
              >
                <MessageSquarePlus className="size-4" />
                <span className="text-[11px]">{t("chat.new")}</span>
              </button>

              {currentThread.messages.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => deleteThread(activeThreadId, e)}
                  disabled={isThinking}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-red-400"
                  title={t("chat.delete")}
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">{t("chat.delete")}</span>
                </button>
              )}
            </div>
          </header>

          {chatError && <p role="alert" className="border-b border-red-500/30 p-3 text-sm text-red-400">{t(chatError)}</p>}
          {!location && <a href="/location" className="border-b border-border p-3 text-sm text-teal-400">{t("loc.title")}</a>}
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
                  {t("chat.placeholder")}
                </p>

                {/* 4 Interactive Starting Cards */}
                <div className="mt-6 sm:mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
                  {suggestions.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => ask(label)}
                      disabled={isThinking}
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
                        {m.role === "user" ? t("chat.you") : "ORCA"}
                      </span>
                      
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1">
                          {/* Audio TTS Playback Button */}
                          <button
                            type="button"
                            onClick={() => playMessageAudio(m.id, m.text, m.evidence?.language)}
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition",
                              playingMessageId === m.id
                                ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 animate-pulse"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                            title={t("chat.listen")}
                            aria-label={t("chat.listen")}
                          >
                            {isLoadingAudioId === m.id ? (
                              <Loader2 className="size-3.5 animate-spin text-teal-400" />
                            ) : playingMessageId === m.id ? (
                              <>
                                <VolumeX className="size-3.5 text-teal-400" />
                                <span className="text-teal-400">{t("chat.stop")}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="size-3.5" />
                                <span>{t("chat.listen")}</span>
                              </>
                            )}
                          </button>

                          {/* Copy Message Button */}
                          <button
                            type="button"
                            onClick={() => handleCopy(m.text, m.id)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title={t("chat.copy")}
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="size-3.5 text-teal-400" />
                                <span className="text-teal-400">{t("chat.copied")}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5" />
                                <span>{t("chat.copy")}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        "rounded-2xl p-3.5 sm:p-4 text-sm sm:text-base leading-relaxed break-words",
                        m.role === "user"
                          ? "bg-secondary text-secondary-foreground font-medium whitespace-pre-wrap"
                          : "text-foreground",
                      )}
                    >
                      {m.role === "user" ? (
                        m.text
                      ) : (
                        <>
                          <MarkdownRenderer content={m.text} />
                          {m.evidence?.marine_snapshot ? <ChatSnapshot snapshot={m.evidence.marine_snapshot}/> : m.evidence && <EvidenceTraceCard evidence={m.evidence} />}
                        </>
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
                    <span>{t("chat.thinking")}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Bottom Docked Input */}
          <div className="border-t border-border bg-card/95 p-2.5 sm:p-4 backdrop-blur">
            <div className="mx-auto max-w-3xl space-y-2.5">
              {/* Quick suggestion chips (natural prompts) */}
              {currentThread.messages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
                  {suggestions.map(({ label }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={isThinking || voiceBusy}
                      onClick={() => ask(label)}
                      className="cursor-pointer shrink-0 min-h-[36px] rounded-full border border-border bg-surface px-3 sm:px-3.5 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted hover:border-teal-500/40 shadow-xs whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Box with Microphone and Send Button */}
              <form
                className="relative flex flex-wrap items-end gap-1 rounded-3xl border border-border bg-surface p-2 sm:p-3 shadow-inner focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  disabled={isThinking || voiceBusy}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                  rows={1}
                  placeholder={t("chat.placeholder")}
                  aria-label={t("chat.placeholder")}
                  className="max-h-40 min-h-14 basis-full resize-none bg-transparent px-2.5 sm:px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none ring-0 disabled:opacity-50"
                />

                <VoiceControls key={user?.id} threadId={activeThreadId} disabled={isThinking} onBusy={busy=>{setVoiceBusy(busy);if(busy)stopAudio();}} onTranscript={text=>{setInput(text);inputRef.current?.focus();}} onAsk={ask}/>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking || voiceBusy}
                  className="ml-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
                {t("chat.subtitle")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
