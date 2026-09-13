import { lazy, Suspense, useState } from "react";
import { useI18n } from "@/lib/orca/i18n";
import type { Coords } from "@/lib/orca/geo";
import { PFZAdvisory } from "./PFZAdvisory";
import { mapCopy } from "@/lib/orca/map-copy";

const CoastMap = lazy(() => import("./CoastMap"));

export function MapPanel({
  center,
  interactive = false,
  height = 240,
  onSelect,
}: {
  center: Coords;
  interactive?: boolean;
  height?: number;
  onSelect?: (c: Coords) => void;
}) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"text" | "map" | "satellite">(() => {
    try { return localStorage.getItem("orca.map.mode") === "text" && !onSelect ? "text" : "map"; } catch { return "map"; }
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("map.layers")}>
        {(["text", "map", "satellite"] as const).filter(item => !onSelect || item !== "text").map(item => <button type="button" key={item} aria-pressed={mode === item}
          className={`min-h-11 rounded-md border px-4 text-sm ${mode === item ? "bg-primary text-primary-foreground" : "bg-card"}`}
          onClick={() => { setMode(item); try { localStorage.setItem("orca.map.mode", item); } catch { /* Storage is optional. */ } }}>
          {mapCopy[lang][item]}
        </button>)}
      </div>
      {!onSelect && <PFZAdvisory showPoints={mode === "text"} />}
      {mode !== "text" && <Suspense
      fallback={
        <div
          style={{ height }}
          className="flex w-full animate-pulse items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground"
        >
          {t("state.loading")}
        </div>
      }
    >
      <CoastMap center={center} interactive={interactive} height={height} onSelect={onSelect} satellite={mode === "satellite"} />
    </Suspense>}
    </div>
  );
}
