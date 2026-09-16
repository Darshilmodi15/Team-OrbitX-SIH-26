import { useEffect, useState } from "react";
import { fetchSnapshotById, type MarineSnapshot } from "@/lib/orca/snapshot";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { MapPanel } from "@/components/orca/MapPanel";
import { LanguageMenu } from "@/components/orca/LanguageMenu";
import { OrcaLogo } from "@/components/orca/Logo";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import "@/components/orca/workspace.css";
export default function MapPage() {
  const { t } = useI18n();
  const { location } = useSession();
  const [params] = useSearchParams();
  const id = params.get("snapshot");
  const [historical, setHistorical] = useState<MarineSnapshot>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setHistorical(undefined);
    setFailed(false);
    if (id)
      void fetchSnapshotById(id)
        .then((value) => {
          if (!cancelled) setHistorical(value);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return (
    <div className="orca-workspace map-workspace">
      <SEO
        title="Marine Map | ORCA"
        description="Explore source-backed marine conditions, available PFZ advisories and EEZ reference geometry."
      />
      <header className="map-page-header">
        <Link
          to="/assistant"
          className="workspace-icon"
          aria-label={t("nav.assistant")}
        >
          <ArrowLeft size={20} />
        </Link>
        <OrcaLogo className="size-8" />
        <div>
          <h1>{t("map.title")}</h1>
          <p>
            ORCA ·{" "}
            {historical?.location.name || location?.label || t("loc.current")}
          </p>
        </div>
        <LanguageMenu />
        <Link to="/location" className="map-change-location">
          <MapPin size={16} />
          {t("loc.change")}
        </Link>
      </header>
      <main>
        {id && historical?.snapshot_id !== id ? (
          <p className="map-empty" role="status">
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
          <Link to="/location" className="map-empty">
            {t("loc.title")}
          </Link>
        )}
      </main>
    </div>
  );
}
