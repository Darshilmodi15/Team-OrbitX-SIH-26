import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, Download, Loader2, Monitor, Ship, Smartphone, X } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { SEO } from "@/components/SEO";
import { openCookieSettings } from "@/lib/orca/cookies";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import type { VesselClass } from "@/lib/orca/types";
import { AppearanceControls } from "@/components/orca/AppearanceMenu";
import { formatCoords } from "@/lib/orca/geo";
import { cn } from "@/lib/utils";
import {
  fetchActiveSessions,
  fetchPushConfig,
  revokeSessionById,
  subscribeWebPush,
  unsubscribeWebPush,
  type DeviceSessionInfo,
} from "@/services/api";

function DeviceIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes("ios") || n.includes("android")) return <Smartphone className="size-4 shrink-0 text-teal-400" />;
  return <Monitor className="size-4 shrink-0 text-teal-400" />;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

const VESSEL_PROFILES: Array<{ value: VesselClass; label: string; desc: string }> = [
  { value: "traditional_canoe", label: "Traditional Canoe / Country Craft (<8 m)", desc: "Strictest wave (0.8 m caution) & wind (22 km/h caution) thresholds" },
  { value: "motorized_gillnetter", label: "Motorized Gillnetter / FRP (8–14 m)", desc: "Balanced small-boat offshore thresholds (1.2 m wave caution)" },
  { value: "mechanized_trawler", label: "Mechanized Trawler (>14 m)", desc: "Deep-sea mechanized hull thresholds (1.8 m wave caution)" },
  { value: "standard", label: "Standard Profile", desc: "Default baseline marine thresholds" },
];

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function SettingsPage() {
  const { t } = useI18n();
  const { user, location, signOut, setVesselClass } = useSession();

  const [sessions, setSessions] = useState<DeviceSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [revision, setRevision] = useState(0);
  const [vesselSaving, setVesselSaving] = useState(false);
  const [vesselSaved, setVesselSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ configured: boolean; publicKey: string | null; subscribed: boolean; notice: string }>({
    configured: false,
    publicKey: null,
    subscribed: false,
    notice: "",
  });
  const [pushBusy, setPushBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchActiveSessions()
      .then((rows) => {
        if (!cancelled) {
          setSessions(rows);
          setSessionsError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          setSessionsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [revision]);

  useEffect(() => {
    let cancelled = false;
    void fetchPushConfig()
      .then(async (cfg) => {
        if (cancelled) return;
        let subActive = false;
        if ("serviceWorker" in navigator && "PushManager" in window) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            subActive = !!sub;
          } catch { /* ignore */ }
        }
        if (!cancelled) {
          setPushStatus({
            configured: cfg.configured,
            publicKey: cfg.vapid_public_key,
            subscribed: subActive,
            notice: "",
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleSelectVessel(next: VesselClass) {
    setVesselSaving(true);
    setVesselSaved(false);
    await setVesselClass(next);
    setVesselSaving(false);
    setVesselSaved(true);
  }

  async function handleTogglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus((p) => ({ ...p, notice: "Push notifications are not supported by this browser." }));
      return;
    }
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await unsubscribeWebPush(existing.endpoint).catch(() => {});
        await existing.unsubscribe();
        setPushStatus((p) => ({ ...p, subscribed: false, notice: "Push alerts paused for this device." }));
      } else {
        if (!pushStatus.publicKey) {
          setPushStatus((p) => ({ ...p, notice: "Push gateway awaiting server VAPID keys." }));
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushStatus.publicKey) as unknown as BufferSource,
        });
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Incomplete browser push keys");
        }
        await subscribeWebPush({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
        setPushStatus((p) => ({ ...p, subscribed: true, notice: "Push safety alerts enabled on this device." }));
      }
    } catch {
      setPushStatus((p) => ({ ...p, notice: "Could not update push subscription (permission denied or unconfigured)." }));
    } finally {
      setPushBusy(false);
    }
  }

  async function handleInstallApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const res = await installPrompt.userChoice;
    setInstallStatus(res.outcome === "accepted" ? "Matsya installed on your device." : "Installation dismissed.");
    setInstallPrompt(null);
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setRevokeError(null);
    try {
      await revokeSessionById(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setRevokeError(t("state.error"));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <AppShell>
      <SEO
        title="Settings & Vessel Preferences | Matsya"
        description="Configure theme, language preferences, vessel telemetry, and privacy controls."
      />
      <h1 className="text-xl font-semibold text-foreground">{t("nav.settings")}</h1>

      <section className="mt-4 max-w-xl rounded-xl border border-border bg-card p-4 shadow-xs">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("theme.title")}</h2>
        <AppearanceControls />
      </section>

      {/* Vessel Operating Profile */}
      <section className="mt-4 max-w-xl rounded-md border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Ship className="size-4 text-secondary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Vessel Operating Profile</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Tailors wave height and wind speed safety risk thresholds for your boat class.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {VESSEL_PROFILES.map((item) => {
            const active = (user?.vesselClass || "standard") === item.value;
            return (
              <button
                key={item.value}
                type="button"
                disabled={vesselSaving}
                aria-pressed={active}
                onClick={() => void handleSelectVessel(item.value)}
                className={cn(
                  "rounded-md border p-3 text-left text-xs transition cursor-pointer",
                  active
                    ? "border-teal-500/60 bg-teal-500/10 text-foreground"
                    : "border-border bg-background/60 hover:bg-muted",
                )}
              >
                <span className="block font-semibold">{item.label}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{item.desc}</span>
              </button>
            );
          })}
        </div>
        {vesselSaved && (
          <p role="status" className="mt-2 text-xs text-teal-500">
            Vessel profile saved. Marine risk threshold updates apply on next snapshot refresh.
          </p>
        )}
      </section>

      {/* Web Push & PWA App Install */}
      <section className="mt-4 max-w-xl rounded-md border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-secondary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Safety Push Alerts &amp; Offline App</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pushBusy || !pushStatus.configured}
            onClick={() => void handleTogglePush()}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50"
          >
            {pushBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5 text-secondary" />}
            <span>
              {!pushStatus.configured
                ? "Push gateway awaiting server VAPID keys"
                : pushStatus.subscribed
                  ? "Disable Web Push Alerts"
                  : "Enable Web Push Alerts"}
            </span>
          </button>
          {installPrompt && (
            <button
              type="button"
              onClick={() => void handleInstallApp()}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 text-xs font-semibold text-secondary-foreground hover:brightness-110"
            >
              <Download className="size-3.5" aria-hidden />
              <span>Install Matsya App</span>
            </button>
          )}
        </div>
        {pushStatus.notice && <p role="status" className="text-xs text-muted-foreground">{pushStatus.notice}</p>}
        {installStatus && <p role="status" className="text-xs text-teal-500">{installStatus}</p>}
      </section>

      {/* Location Section */}
      {user?.role !== "admin" && <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">{t(user?.role === "government" ? "ops.region" : "loc.current")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.operationalRegion || (location ? (location.label ?? formatCoords(location.coords)) : t("loc.title"))}
        </p>
        <Link
          to="/location"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted shadow-xs"
        >
          {t("loc.change")}
        </Link>
      </section>

      }
      {/* Privacy & Cookies Section */}
      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">{t("footer.cookies")}</h2>

        <button
          type="button"
          onClick={openCookieSettings}
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted shadow-xs"
        >
          {t("footer.cookies")}
        </button>
      </section>

      {/* Active Sessions Section */}
      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">Active Sessions</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Devices currently signed into your account. You can revoke access to any session.
        </p>

        {revokeError && <p role="alert" className="mt-3 text-xs text-rose-400">{revokeError}</p>}
        {sessionsLoading ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            <span>{t("state.loading")}</span>
          </div>
        ) : sessionsError ? (
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span role="alert" className="text-rose-400">{t("state.error")}</span>
            <button type="button" onClick={() => { setSessionsLoading(true); setSessionsError(false); setRevision((r) => r + 1); }} className="rounded border border-border px-2 py-1 hover:bg-muted">
              {t("cta.retry")}
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground italic">No active sessions found.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border p-3 text-xs transition-colors",
                  session.current
                    ? "border-teal-500/30 bg-teal-500/5"
                    : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <DeviceIcon name={session.device_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {session.device_name}
                      </span>
                      {session.current && (
                        <span className="shrink-0 rounded-full bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 text-[10px] font-bold text-teal-400">
                          This device
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      Last active {timeAgo(session.last_seen_at || session.created_at)}
                    </span>
                  </div>
                </div>

                {!session.current && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                    title="Revoke this session"
                  >
                    {revokingId === session.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* User / Account Section */}
      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">{user?.name || user?.contact || t("auth.title")}</h2>

        <button
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted shadow-xs disabled:opacity-50"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut("/").finally(() => setSigningOut(false));
          }}
        >
          {t("cta.signOut")}
        </button>
      </section>

      {/* Footer Links */}
      <p className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">
          {t("footer.privacy")}
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          {t("footer.terms")}
        </Link>
        <a href="mailto:support@matsya.app" className="hover:text-foreground underline underline-offset-2">
          Support (support@matsya.app)
        </a>
      </p>
    </AppShell>
  );
}
