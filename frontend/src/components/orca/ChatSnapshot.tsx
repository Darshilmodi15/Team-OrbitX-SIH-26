import { Link, useInRouterContext } from "react-router-dom";
import { MapPin, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/orca/i18n";
import type { MarineSnapshot } from "@/lib/orca/snapshot";
import { SnapshotDetails } from "./SnapshotDetails";
import { MapPanel } from "./MapPanel";

export function ChatSnapshot({ snapshot }: { snapshot: MarineSnapshot }) {
  const { t } = useI18n();
  const inRouter = useInRouterContext();
  const [open, setOpen] = useState(false);
  const mapUrl = `/map?snapshot=${encodeURIComponent(snapshot.snapshot_id)}`;
  return (
    <div className="chat-snapshot mt-4 space-y-2">
      <SnapshotDetails snapshot={snapshot} />
      <button
        type="button"
        className="chat-map-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MapPin size={16} />
        {t("map.open")}
      </button>
      {open && (
        <div className="chat-map-card">
          <MapPanel
            center={snapshot.location}
            snapshot={snapshot}
            height={280}
            interactive
            compact
          />
          {inRouter ? (
            <Link to={mapUrl} className="chat-map-expand">
              {t("nav.map")}
              <ArrowUpRight size={16} />
            </Link>
          ) : (
            <a href={mapUrl} className="chat-map-expand">
              {t("nav.map")}
              <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
