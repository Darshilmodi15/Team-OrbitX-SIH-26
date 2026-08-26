import { lazy, Suspense } from "react";
import { useI18n } from "@/lib/orca/i18n";
import type { Coords } from "@/lib/orca/geo";

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
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div
          style={{ height }}
          className="flex w-full animate-pulse items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground"
        >
          {t("state.loading")}
        </div>
      }
    >
      <CoastMap center={center} interactive={interactive} height={height} onSelect={onSelect} />
    </Suspense>
  );
}
