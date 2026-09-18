import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, Monitor, Smartphone, X } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { SEO } from "@/components/SEO";
import { openCookieSettings } from "@/components/CookieBanner";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { AppearanceControls } from "@/components/orca/AppearanceMenu";
import { formatCoords } from "@/lib/orca/geo";
import { cn } from "@/lib/utils";
import { fetchActiveSessions, revokeSessionById, type DeviceSessionInfo } from "@/services/api";

function DeviceIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes("ios") || n.includes("android")) return <Smartphone className="size-4 shrink-0 text-teal-400" />;
  return <Monitor className="size-4 shrink-0 text-teal-400" />;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { user, location, signOut } = useSession();

  const [sessions, setSessions] = useState<DeviceSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, []);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await revokeSessionById(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* silently fail */
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <AppShell>
      <SEO
        title="Settings & Vessel Preferences | ORCA Marine AI"
        description="Configure theme, language preferences, vessel telemetry, and privacy controls."
      />
      <h1 className="text-xl font-semibold text-foreground">{t("nav.settings")}</h1>

      <section className="mt-4 max-w-xl rounded-xl border border-border bg-card p-4 shadow-xs">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("theme.title")}</h2>
        <AppearanceControls />
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

        {sessionsLoading ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Loading sessions...</span>
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
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted shadow-xs"
          onClick={() => {
            void signOut("/");
          }}
        >
          {t("cta.signOut")}
        </button>
      </section>

      {/* Footer Links */}
      <p className="mt-6 flex gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">
          {t("footer.privacy")}
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          {t("footer.terms")}
        </Link>
      </p>
    </AppShell>
  );
}
