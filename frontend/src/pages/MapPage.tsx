import { useEffect, useState } from "react";
import { fetchSnapshotById, type MarineSnapshot } from "@/lib/orca/snapshot";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { MapPanel } from "@/components/orca/MapPanel";
import { APP_NAME, getLocalizedAppName } from "@/lib/brand";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import "@/components/orca/workspace.css";

export default function MapPage() {
  const { lang, t } = useI18n();
  const { location } = useSession();
  const [params] = useSearchParams();
  const id = params.get("snapshot");
  const rawReturn = params.get("return");
  const returnTo =
    rawReturn &&
    rawReturn.startsWith("/") &&
    !rawReturn.startsWith("//") &&
    !rawReturn.startsWith("/\\")
      ? rawReturn
      : null;
  const appName = getLocalizedAppName(lang);
  const [snapshotState, setSnapshotState] = useState<{
    forId: string | null;
    data?: MarineSnapshot;
    failed: boolean;
  }>({ forId: null, failed: false });
  const historical = id && snapshotState.forId === id ? snapshotState.data : undefined;
  const failed = !!id && snapshotState.forId === id && snapshotState.failed;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void fetchSnapshotById(id)
      .then((value) => {
        if (!cancelled) setSnapshotState({ forId: id, data: value, failed: false });
      })
      .catch(() => {
        if (!cancelled) setSnapshotState({ forId: id, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <AppShell>
      <SEO
        title={`Marine Map | ${APP_NAME}`}
        description="Explore source-backed marine conditions, available PFZ advisories and EEZ reference geometry."
      />
      <div className="orca-workspace map-workspace-shell space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{t("map.title")}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {appName} · {historical?.location.name || location?.label || t("loc.current")}
            </p>
          </div>
          {returnTo && (
            <Link
              to={returnTo}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted shadow-xs"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              <span>{t("cta.back")}</span>
            </Link>
          )}
        </div>

        {id && historical?.snapshot_id !== id ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground" role="status">
            {t(failed ? "chat.unavailable" : "state.loading")}
          </p>
        ) : location ? (
          <MapPanel
            center={historical?.location || location.coords}
            snapshot={historical}
            interactive
            height={620}
            full
          />
        ) : (
          <Link
            to="/location"
            className="block rounded-xl border border-border bg-card p-6 text-center text-sm font-medium text-foreground hover:bg-muted"
          >
            {t("loc.title")}
          </Link>
        )}
      </div>
    </AppShell>
  );
}
