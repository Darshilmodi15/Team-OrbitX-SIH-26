import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { OperationalTrace } from "@/components/orca/OperationalTrace";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Eye,
  Loader2,
  MapPin,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ArrowUp,
  Plus,
  Search,
  Map as MapIcon,
  LayoutDashboard,
  LifeBuoy,
  Settings,
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
import {
  fetchSnapshot,
  fetchSnapshotById,
  useMarineSnapshot,
  snapshotExpired,
} from "@/lib/orca/snapshot";
import { VoiceControls } from "@/components/orca/VoiceControls";
import { ChatSnapshot } from "@/components/orca/ChatSnapshot";
import { LanguageMenu } from "@/components/orca/LanguageMenu";
import "@/components/orca/workspace.css";
import { OrcaLogo } from "@/components/orca/Logo";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import {
  sendChatMessage,
  synthesizeVoiceAudio,
  fetchConversations,
  fetchConversation,
  createConversation,
  deleteConversation,
} from "@/services/api";
import { MarkdownRenderer } from "@/components/orca/MarkdownRenderer";
import type { ChatMessage, ChatEvidence } from "@/lib/orca/types";
import { cn } from "@/lib/utils";

interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

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
  const hasBoundary =
    evidence.boundary && evidence.boundary.distance_to_boundary_km != null;
  const hasSources = evidence.sources && evidence.sources.length > 0;
  const hasReasoning = evidence.reasoning && evidence.reasoning.length > 0;

  if (
    !hasWeather &&
    !hasPfz &&
    !hasBoundary &&
    !hasSources &&
    !evidence.risk_level
  )
    return null;

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
              {t(
                ["FRESH", "LIVE"].includes(evidence.connectivity_mode)
                  ? "state.live"
                  : evidence.connectivity_mode === "CACHED"
                    ? "health.cached"
                    : evidence.connectivity_mode === "STALE"
                      ? "health.stale"
                      : "chat.unavailable",
              )}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-medium transition"
        >
          <span>{isOpen ? t("chat.hideTrace") : t("chat.viewTrace")}</span>
          {isOpen ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-card/40">
        {hasWeather && (
          <>
            {evidence.weather.wave_height_m != null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Waves className="size-3 text-cyan-400" />
                <span>
                  {evidence.weather.wave_height_m?.toFixed(1)}m{" "}
                  {t("marine.wave")}
                </span>
              </span>
            )}
            {evidence.weather.wind_speed_kmh != null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Wind className="size-3 text-sky-400" />
                <span>
                  {evidence.weather.wind_speed_kmh?.toFixed(0)} km/h{" "}
                  {evidence.weather.wind_direction_cardinal || ""}
                </span>
              </span>
            )}
            {evidence.weather.sea_surface_temperature_c != null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Thermometer className="size-3 text-amber-400" />
                <span>
                  {evidence.weather.sea_surface_temperature_c?.toFixed(1)}°C{" "}
                  {t("marine.sst")}
                </span>
              </span>
            )}
            {evidence.weather.visibility_km != null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono">
                <Eye className="size-3 text-teal-400" />
                <span>
                  {evidence.weather.visibility_km?.toFixed(0)} km{" "}
                  {t("marine.visibility")}
                </span>
              </span>
            )}
          </>
        )}

        {hasPfz && evidence.nearest_pfz![0] && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px] font-mono">
            <span>🐟</span>
            <span>
              PFZ:{" "}
              {evidence.nearest_pfz![0].distance_km != null
                ? `${evidence.nearest_pfz![0].distance_km.toFixed(1)} km`
                : evidence.nearest_pfz![0].name || "Active"}
            </span>
          </span>
        )}

        {hasBoundary && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono">
            <ShieldCheck className="size-3 text-indigo-400" />
            <span>
              {evidence.boundary.inside_eez ? "Inside EEZ" : "Buffer Zone"} (
              {evidence.boundary.distance_to_boundary_km?.toFixed(1)} km)
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
  const route = useLocation();
  const mapSnapshotId = new URLSearchParams(route.search).get("snapshot");
  const [resolvedMapSnapshot, setResolvedMapSnapshot] = useState<string | null>(
    null,
  );
  const [mapContextError, setMapContextError] = useState(false);
  const [search, setSearch] = useState("");
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const { conversationId } = useParams();
  const { user, location } = useSession();
  const marine = useMarineSnapshot();
  const mapContextKey = `${mapSnapshotId}:${location?.coords.lat}:${location?.coords.lon}`;
  const mapContextPending =
    !!mapSnapshotId && resolvedMapSnapshot !== mapContextKey;
  const retryRequest = useRef<{
    question: string;
    thread: string;
    id: string;
    language?: string;
    requestedTime?: string;
  } | null>(null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState<
    | "chat.startFailed"
    | "chat.requestFailed"
    | "chat.providerUnavailable"
    | null
  >(null);
  const requestInFlightRef = useRef(false);
  const historyVersion = useRef(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const newlyCreatedConversation = useRef<string | null>(null);

  const [voiceBusy, setVoiceBusy] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isLoadingAudioId, setIsLoadingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const copy =
    lang === "gu"
      ? {
          welcome: "દરિયામાં આજે શું જાણવું છે?",
          history: "તમારી વાતચીત",
          search: "વાતચીત શોધો",
          empty: "હજી કોઈ વાતચીત નથી",
          attachments: "જોડાણો",
          soon: "ઇમેજ અને દસ્તાવેજ — ટૂંક સમયમાં",
          review: "પ્રશ્ન તપાસો અને મોકલો",
          copyFailed: "કૉપિ થઈ શક્યું નથી",
        }
      : lang === "hi"
        ? {
            welcome: "आज समुद्र के बारे में क्या जानना है?",
            history: "आपकी बातचीत",
            search: "बातचीत खोजें",
            empty: "अभी कोई बातचीत नहीं",
            attachments: "अटैचमेंट",
            soon: "चित्र और दस्तावेज़ — जल्द आ रहा है",
            review: "प्रश्न जाँचें और भेजें",
            copyFailed: "कॉपी नहीं हो सका",
          }
        : {
            welcome: "How can I help at sea today?",
            history: "Your conversations",
            search: "Search conversations",
            empty: "No conversations yet",
            attachments: "Attachments",
            soon: "Images and documents — coming soon",
            review: "Review the question, then send",
            copyFailed: "Could not copy this response",
          };
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
      setHistoryLoading(true);
      Promise.all([
        fetchConversations(),
        conversationId
          ? fetchConversation(conversationId)
          : Promise.resolve(null),
      ])
        .then(([rows, selected]: [any[], any]) => {
          if (selected)
            rows = [selected, ...rows.filter((row) => row.id !== selected.id)];
          if (
            cancelled ||
            requestInFlightRef.current ||
            version !== historyVersion.current
          )
            return;
          const mapped = rows.map((row) => ({
            id: row.id,
            title: row.title,
            updatedAt: new Date(row.updated_at).getTime(),
            messages: (row.messages || []).map((m: any) => ({
              id: m.metadata?.request_id
                ? `${m.role === "user" ? "u" : "a"}_${m.metadata.request_id}`
                : m.id,
              role: m.role,
              text: m.content,
              at: new Date(m.created_at).getTime(),
              evidence: m.metadata,
            })),
          }));
          setThreads(mapped);
          const selectedRow = rows.find((row) => row.id === conversationId);
          const last = selectedRow?.messages?.at(-1);
          if (last?.role === "user" && last.metadata?.request_id) {
            retryRequest.current = {
              question: last.content,
              thread: selectedRow.id,
              id: last.metadata.request_id,
              language: last.metadata.request_language,
              requestedTime: last.metadata.requested_time ?? undefined,
            };
            setInput((value) => value || last.content);
          }
          if (
            conversationId &&
            !mapped.some((row) => row.id === conversationId)
          ) {
            setChatError("chat.requestFailed");
          }
        })
        .catch(() => {
          if (!cancelled) setChatError("chat.requestFailed");
        })
        .finally(() => { if (!cancelled) setHistoryLoading(false); });
    };
    setActiveThreadId(conversationId || "");
    setChatError(null);
    if (newlyCreatedConversation.current === conversationId) {
      newlyCreatedConversation.current = null;
      setHistoryLoading(false);
    } else sync();
    window.addEventListener("focus", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", sync);
    };
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

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [input]);
  useEffect(() => {
    const prompt = new URLSearchParams(route.search).get("prompt");
    if (prompt && !conversationId) {
      setInput(prompt.slice(0, 4000));
      inputRef.current?.focus();
    }
  }, [route.search, conversationId]);
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const drawer = document.getElementById("chat-sidebar");
    const previous = document.activeElement as HTMLElement | null;
    const nodes = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input",
        ) || [],
      );
    nodes()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
      if (e.key === "Tab") {
        const items = nodes();
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!mapSnapshotId) {
      setMapContextError(false);
      return;
    }
    let cancelled = false;
    setMapContextError(false);
    void fetchSnapshotById(mapSnapshotId)
      .then((snapshot) => {
        if (cancelled) return;
        if (
          snapshot.location.lat !== location?.coords.lat ||
          snapshot.location.lon !== location?.coords.lon
        ) {
          setMapContextError(true);
          return;
        }
        marine.adopt(snapshot);
        setResolvedMapSnapshot(mapContextKey);
      })
      .catch(() => {
        if (!cancelled) setMapContextError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mapSnapshotId, location?.coords.lat, location?.coords.lon, marine.adopt]);

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
    try {
      await deleteConversation(id);
    } catch {
      setChatError("chat.requestFailed");
      return;
    }
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

  async function playMessageAudio(
    msgId: string,
    text: string,
    msgLang?: string,
  ) {
    if (playingMessageId === msgId) {
      stopAudio();
      return;
    }

    stopAudio();
    setIsLoadingAudioId(msgId);

    try {
      const cleanSnippet = text
        .replace(/[*#_`•-]/g, " ")
        .trim()
        .slice(0, 450);
      const targetVoiceLang = msgLang || lang || "en";
      const res = await synthesizeVoiceAudio(cleanSnippet, targetVoiceLang);
      if (res && res.audio_base64) {
        const audio = new Audio(
          `data:audio/${res.audio_format || "wav"};base64,${res.audio_base64}`,
        );
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
    if (!question || requestInFlightRef.current || mapContextPending) return;
    historyVersion.current++;
    requestInFlightRef.current = true;

    setIsThinking(true);
    setChatError(null);
    let startingConversation = !activeThreadId;
    try {
      stopAudio();
      let targetThreadId = activeThreadId;
      if (!targetThreadId) {
        const created = await createConversation(
          question.length > 80 ? question.slice(0, 80) : question,
        );
        targetThreadId = created.id;
        newlyCreatedConversation.current = targetThreadId;
        setActiveThreadId(targetThreadId);
        navigate(`/assistant/c/${targetThreadId}`, { replace: true });
      }
      startingConversation = false;
      const now = Date.now();
      const retry =
        retryRequest.current?.question === question &&
        retryRequest.current.thread === targetThreadId;
      const requestId = retry ? retryRequest.current!.id : crypto.randomUUID();
      if (!retry)
        retryRequest.current = {
          question,
          thread: targetThreadId,
          id: requestId,
          language: lang || "auto",
          requestedTime: marine.snapshot?.request.requested_time,
        };
      const userMsg: ChatMessage = {
        id: `u_${requestId}`,
        role: "user",
        text: question,
        at: now,
      };

      setThreads((prev) => {
        const idx = prev.findIndex((th) => th.id === targetThreadId);
        if (idx >= 0) {
          const updated = [...prev];
          const isFirst = updated[idx].messages.length === 0;
          updated[idx] = {
            ...updated[idx],
            title: isFirst
              ? question.length > 28
                ? `${question.slice(0, 28)}...`
                : question
              : updated[idx].title,
            updatedAt: now,
            messages: updated[idx].messages.some((m) => m.id === userMsg.id)
              ? updated[idx].messages
              : [...updated[idx].messages, userMsg],
          };
          return updated;
        } else {
          const newThread: ChatThread = {
            id: targetThreadId,
            title:
              question.length > 28 ? `${question.slice(0, 28)}...` : question,
            updatedAt: now,
            messages: [userMsg],
          };
          return [newThread, ...prev];
        }
      });

      setInput("");
      setIsThinking(true);

      let snapshot = marine.snapshot;
      const greeting =
        /^(hello|hi|hey|thanks|thank you|good morning|good evening|namaste|namaskar|નમસ્તે|નમસ્કાર|હેલો|આભાર|नमस्ते|नमस्कार|धन्यवाद)[!.?\s]*$/i.test(
          question,
        );
      if (!greeting && snapshot && snapshotExpired(snapshot)) {
        const refreshed = (await marine.refetch()) as {
          data?: typeof snapshot;
        };
        snapshot = refreshed.data;
      }
      if (
        !greeting &&
        retry &&
        retryRequest.current?.requestedTime &&
        snapshot?.request.requested_time !== retryRequest.current.requestedTime
      ) {
        snapshot = await fetchSnapshot(retryRequest.current.requestedTime);
        marine.adopt(snapshot);
      }
      if (!retry && retryRequest.current)
        retryRequest.current.requestedTime = snapshot?.request.requested_time;
      const res = await sendChatMessage({
        message: question,
        ...(location
          ? { location: { lat: location.coords.lat, lon: location.coords.lon } }
          : {}),
        date: new Date().toISOString().split("T")[0],
        language: retryRequest.current?.language || lang || "auto",
        session_id: targetThreadId,
        request_id: requestId,
        snapshot_id: greeting ? undefined : snapshot?.snapshot_id,
        requested_time: greeting
          ? undefined
          : retryRequest.current?.requestedTime,
      });

      if (!res || !res.answer) {
        throw new Error("Empty authoritative response");
      }

      retryRequest.current = null;
      if (res.marine_snapshot) marine.adopt(res.marine_snapshot);
      const botNow = Date.now();
      const botMsg: ChatMessage = {
        id: `a_${requestId}`,
        role: "assistant",
        text: res.answer,
        at: botNow,
        evidence: {
          snapshot_id: res.snapshot_id,
          marine_snapshot: res.marine_snapshot,
          operational_trace: res.operational_trace,
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
      return { text: botMsg.text, language: botMsg.evidence?.language };
    } catch (err) {
      console.warn("Chat request failed", err);
      const providerUnavailable =
        err instanceof Error &&
        "code" in err &&
        err.code === "AI_PROVIDER_UNAVAILABLE";
      setChatError(
        startingConversation
          ? "chat.startFailed"
          : providerUnavailable
            ? "chat.providerUnavailable"
            : "chat.requestFailed",
      );
      setInput(question);
    } finally {
      setIsThinking(false);
      requestInFlightRef.current = false;
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // 4 Intelligent Prompt Shortcuts (Natural Marine Queries)
  const suggestions = [
    {
      id: "pfz",
      label: t("chat.s1") || "Nearest PFZ",
      prompt:
        "Where is the nearest Potential Fishing Zone (PFZ) from my current location and what are the fish species?",
      icon: ShieldCheck,
    },
    {
      id: "weather",
      label: t("chat.s2") || "Marine Weather",
      prompt:
        "What is the wind speed, wave height, and marine weather condition near my location right now?",
      icon: Compass,
    },
    {
      id: "safety",
      label: t("chat.s3") || "Safety Check",
      prompt:
        "Is it safe to venture into the sea for fishing today and tomorrow morning?",
      icon: Waves,
    },
    {
      id: "nav",
      label: t("chat.s4") || "Navigation & Boundary",
      prompt:
        "What is the safest navigational route from my position and how far am I from the coast and territorial boundary?",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="orca-workspace chat-workspace">
      <SEO
        title="Ocean Copilot | ORCA"
        description="Ask ORCA about coastal conditions with source-backed marine snapshots."
      />
      <a className="sr-only focus:not-sr-only" href="#chat-composer">
        {t("chat.placeholder")}
      </a>
      {mobileDrawerOpen && (
        <button
          className="chat-drawer-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}
      <aside
        id="chat-sidebar"
        aria-label={copy.history}
        className={cn(
          "chat-sidebar",
          !sidebarOpen && "is-collapsed",
          mobileDrawerOpen && "is-open",
        )}
      >
        <div className="chat-brand">
          <Link to="/assistant">
            <OrcaLogo className="size-8" />
            <strong>ORCA</strong>
          </Link>
          <button
            className="workspace-icon mobile-only"
            aria-label="Close menu"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        <button
          className="sidebar-new"
          onClick={createNewThread}
          disabled={isThinking || voiceBusy}
        >
          <MessageSquarePlus size={19} />
          {t("chat.new")}
        </button>
        <nav className="workspace-nav" aria-label="Primary">
          <Link to="/dashboard">
            <LayoutDashboard size={18} />
            {t("nav.dashboard")}
          </Link>
          <Link to="/map">
            <MapIcon size={18} />
            {t("nav.map")}
          </Link>
          <Link to="/services">
            <LifeBuoy size={18} />
            {t("nav.services")}
          </Link>
        </nav>
        <label className="history-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.search}
            aria-label={copy.search}
          />
        </label>
        <p className="sidebar-caption">{copy.history}</p>
        <div className="chat-history">
          {!threads.length && <p className="sidebar-empty" role={historyLoading ? "status" : undefined}>{historyLoading ? t("state.loading") : copy.empty}</p>}
          {threads
            .filter((th) =>
              th.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            )
            .map((th) => (
              <div
                key={th.id}
                className={cn(
                  "history-row",
                  th.id === activeThreadId && "active",
                )}
              >
                <button
                  disabled={isThinking || voiceBusy}
                  onClick={() => {
                    stopAudio();
                    setActiveThreadId(th.id);
                    navigate(`/assistant/c/${th.id}`);
                    setMobileDrawerOpen(false);
                  }}
                  title={th.title}
                >
                  {th.title}
                </button>
                <button
                  className="history-delete"
                  disabled={isThinking || voiceBusy}
                  onClick={(e) => deleteThread(th.id, e)}
                  aria-label={`${t("chat.delete")}: ${th.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
        </div>
        <div className="sidebar-account">
          <Link to="/location" className="sidebar-location">
            <MapPin size={16} />
            <span>
              {location?.label ||
                (location
                  ? `${location.coords.lat}, ${location.coords.lon}`
                  : t("loc.title"))}
            </span>
          </Link>
          <Link to="/settings" className="sidebar-profile">
            <span className="profile-avatar">
              <User size={18} />
            </span>
            <span>{t("nav.settings")}</span>
            <Settings size={17} />
          </Link>
        </div>
      </aside>
      <main className="chat-main" inert={mobileDrawerOpen || undefined}>
        <header className="chat-header">
          <button
            className="workspace-icon desktop-only"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={t("chat.title")}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <PanelLeftClose size={20} />
            ) : (
              <PanelLeftOpen size={20} />
            )}
          </button>
          <button
            className="workspace-icon mobile-only"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label={t("chat.title")}
            aria-expanded={mobileDrawerOpen}
          >
            <PanelLeftOpen size={20} />
          </button>
          <h1>
            {currentThread.messages.length ? currentThread.title : "ORCA"}
          </h1>
          <LanguageMenu />
          <Link
            className="workspace-icon"
            to="/map"
            title={t("nav.map")}
            aria-label={t("nav.map")}
          >
            <MapIcon size={20} />
          </Link>
          <button
            className="workspace-icon"
            onClick={createNewThread}
            disabled={isThinking || voiceBusy}
            aria-label={t("chat.new")}
          >
            <MessageSquarePlus size={20} />
          </button>
        </header>
        {mapContextPending && (
          <p role="status" className="chat-error">
            {t(mapContextError ? "chat.unavailable" : "state.loading")}{" "}
            {mapContextError && <Link to="/assistant">{t("chat.new")}</Link>}
          </p>
        )}
        {chatError && (
          <p role="alert" className="chat-error">
            {t(chatError)}
          </p>
        )}
        {!location && (
          <Link to="/location" className="chat-location-notice">
            {t("loc.title")}
          </Link>
        )}
        <div className="chat-stream">
          {historyLoading && conversationId && !currentThread.messages.length ? (
            <p role="status" className="chat-welcome">{t("state.loading")}</p>
          ) : !currentThread.messages.length ? (
            <div className="chat-welcome">
              <OrcaLogo className="size-12" />
              <h2>{copy.welcome}</h2>
              <p>{t("chat.placeholder")}</p>
              <div className="chat-suggestions">
                {suggestions.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => ask(label)}
                    disabled={isThinking || voiceBusy}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              {currentThread.messages.map((m) => (
                <article
                  key={m.id}
                  className={cn(
                    "chat-message",
                    m.role === "user" ? "from-user" : "from-assistant",
                  )}
                >
                  {m.role === "user" ? (
                    <div className="user-bubble">{m.text}</div>
                  ) : (
                    <>
                      <div className="assistant-label">
                        <OrcaLogo className="size-6" />
                        <span>ORCA</span>
                      </div>
                      <div className="assistant-content">
                        <MarkdownRenderer content={m.text} />
                      </div>
                      <OperationalTrace trace={m.evidence?.operational_trace} />
                      {m.evidence?.marine_snapshot ? (
                        <ChatSnapshot snapshot={m.evidence.marine_snapshot} />
                      ) : (
                        m.evidence && (
                          <EvidenceTraceCard evidence={m.evidence} />
                        )
                      )}
                      <div className="message-actions">
                        <button
                          className="workspace-icon"
                          onClick={() => handleCopy(m.text, m.id)}
                          title={t(
                            copiedId === m.id ? "chat.copied" : "chat.copy",
                          )}
                          aria-label={t(
                            copiedId === m.id ? "chat.copied" : "chat.copy",
                          )}
                        >
                          {copiedId === m.id ? (
                            <Check size={17} />
                          ) : (
                            <Copy size={17} />
                          )}
                        </button>
                        <button
                          className="workspace-icon"
                          disabled={voiceBusy}
                          onClick={() =>
                            playMessageAudio(m.id, m.text, m.evidence?.language)
                          }
                          title={t("chat.listen")}
                          aria-label={t("chat.listen")}
                        >
                          {isLoadingAudioId === m.id ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : playingMessageId === m.id ? (
                            <VolumeX size={17} />
                          ) : (
                            <Volume2 size={17} />
                          )}
                        </button>
                        <button
                          className="workspace-icon"
                          disabled={isThinking || voiceBusy}
                          title={copy.review}
                          aria-label={copy.review}
                          onClick={() => {
                            const index = currentThread.messages.indexOf(m);
                            const question = currentThread.messages
                              .slice(0, index)
                              .reverse()
                              .find((row) => row.role === "user");
                            if (question) {
                              setInput(question.text);
                              inputRef.current?.focus();
                            }
                          }}
                        >
                          <RotateCcw size={17} />
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
          {isThinking && (
            <div role="status" className="chat-thinking">
              <OrcaLogo className="size-6" />
              <Loader2 size={17} className="animate-spin" />
              {t("chat.thinking")}
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="composer-dock">
          <form
            id="chat-composer"
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (!voiceBusy) void ask(input);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              disabled={isThinking || voiceBusy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (!voiceBusy) void ask(input);
                }
              }}
              rows={1}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
            />
            <div className="composer-tools">
              <div className="attachment-control">
                <button
                  type="button"
                  className="workspace-icon"
                  aria-label={copy.attachments}
                  aria-expanded={attachmentsOpen}
                  onClick={() => setAttachmentsOpen(!attachmentsOpen)}
                >
                  <Plus size={23} />
                </button>
                {attachmentsOpen && (
                  <div className="attachment-popover" role="status">
                    <button type="button" disabled>
                      {copy.soon}
                    </button>
                  </div>
                )}
              </div>
              <span className="composer-language">{LANG_NAMES[lang]}</span>
              <VoiceControls
                key={user?.id}
                threadId={activeThreadId}
                disabled={isThinking || mapContextPending}
                onBusy={(busy) => {
                  setVoiceBusy(busy);
                  if (busy) stopAudio();
                }}
                onTranscript={(text) => {
                  setInput(text);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                onAsk={ask}
              />
              <button
                type="submit"
                className="composer-send"
                disabled={
                  !input.trim() || isThinking || voiceBusy || mapContextPending
                }
                aria-label={t("chat.send")}
              >
                {isThinking ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <ArrowUp size={23} />
                )}
              </button>
            </div>
          </form>
          <p className="composer-footnote">{t("chat.subtitle")}</p>
        </div>
      </main>
    </div>
  );
}
