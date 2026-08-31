import { Link } from "react-router-dom";
import { AppShell } from "@/components/orca/AppShell";
import { SafetyStatusCard } from "@/components/orca/SafetyStatus";
import { MarineConditions, ForecastTimeline } from "@/components/orca/Conditions";
import { MapPanel } from "@/components/orca/MapPanel";
import { LoadingState, ErrorState, EmptyState } from "@/components/orca/States";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useMarine } from "@/lib/orca/use-marine";
import { safetyFrom } from "@/lib/orca/marine";
import {
  Bell, CloudSun, Fish, LifeBuoy, Map as MapIcon, MessageSquare,
} from "lucide-react";

const QUICK = [
  { to: "/map", key: "quick.weather" as const, Icon: CloudSun },
  { to: "/map", key: "quick.zones" as const, Icon: Fish },
  { to: "/services", key: "quick.emergency" as const, Icon: LifeBuoy },
  { to: "/alerts", key: "quick.alerts" as const, Icon: Bell },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const { location } = useSession();
  const marine = useMarine(location?.coords ?? null);

  if (!location) {
    return (
      <AppShell>
        <SEO
          title="Command Dashboard | ORCA Marine AI"
          description="Real-time ocean telemetry, wave heights, wind speed, potential fishing zones, and maritime safety alerts."
        />
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">{t("nav.dashboard")}</h1>
          <EmptyState>{t("loc.title")}</EmptyState>
          <Link
            to="/location"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-secondary px-6 text-sm font-semibold text-secondary-foreground transition hover:brightness-110"
          >
            {t("loc.title")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const c = marine.data?.current;
  const level = c ? safetyFrom(c.waveHeightM, c.windSpeedKmh, c.visibilityKm) : null;

  return (
    <AppShell>
      <SEO
        title="Live Marine Command Dashboard | ORCA Marine AI"
        description="Real-time ocean telemetry, wave heights, wind speed, potential fishing zones, and maritime safety alerts."
      />
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-foreground">{t("nav.dashboard")}</h1>

        {/* Safety status */}
        {marine.isError ? (
          <ErrorState description={t("state.offline")} onRetry={() => marine.refetch()} />
        ) : marine.isPending ? (
          <LoadingState label={t("state.loadingMarine")} />
        ) : level ? (
          <SafetyStatusCard level={level} />
        ) : null}

        {/* Quick actions */}
        <section>
          <h2 className="text-sm font-semibold text-foreground">{t("quick.title")}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK.map(({ to, key, Icon }) => (
              <Link
                key={key}
                to={to}
                className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-3 text-center transition hover:bg-muted shadow-xs"
              >
                <Icon className="size-5 text-secondary" aria-hidden />
                <span className="text-xs font-medium text-foreground">{t(key)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Marine conditions */}
        {c && <MarineConditions data={c} tide={marine.data?.tide ?? null} />}

        {/* Forecast */}
        {marine.data?.forecast && <ForecastTimeline points={marine.data.forecast} />}

        {/* Map preview */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{t("map.title")}</h2>
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:underline"
            >
              <MapIcon className="size-3.5" aria-hidden />
              {t("map.open")}
            </Link>
          </div>
          <MapPanel center={location.coords} height={220} />
        </section>

        {/* Assistant CTA */}
        <Link
          to="/assistant"
          className="flex items-center gap-3 rounded-md border border-border bg-card p-4 transition hover:bg-muted shadow-xs"
        >
          <MessageSquare className="size-5 text-secondary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("chat.title")}</p>
            <p className="text-xs text-muted-foreground">{t("chat.subtitle")}</p>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
