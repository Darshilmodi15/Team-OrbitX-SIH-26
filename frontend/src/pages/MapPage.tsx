import { AppShell } from "@/components/orca/AppShell";
import { MapPanel } from "@/components/orca/MapPanel";
import { EmptyState } from "@/components/orca/States";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { COASTAL_BUFFER_KM, formatCoords } from "@/lib/orca/geo";

const GLOSSARY_ITEMS = [
  { short: "PFZ", fullKey: "glossary.pfz.full" as const, plainKey: "glossary.pfz.plain" as const },
  { short: "IMBL", fullKey: "glossary.imbl.full" as const, plainKey: "glossary.imbl.plain" as const },
  { short: "SST", fullKey: "glossary.sst.full" as const, plainKey: "glossary.sst.plain" as const },
  { short: "", fullKey: "glossary.wave.full" as const, plainKey: "glossary.wave.plain" as const },
  { short: "", fullKey: "glossary.swell.full" as const, plainKey: "glossary.swell.plain" as const },
];

export default function MapPage() {
  const { t, lang } = useI18n();
  const { location } = useSession();

  return (
    <AppShell>
      <h1 className="text-xl font-semibold text-foreground">{t("map.title")}</h1>

      {location ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {location.label ?? formatCoords(location.coords)} · {location.distanceToCoastKm} km{" "}
            {t("loc.coastDistance").toLowerCase()}
          </p>
          <div className="mt-3">
            <MapPanel center={location.coords} interactive height={420} />
          </div>

          <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground">{t("map.legend")}</h2>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-card-foreground">
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-secondary shrink-0" aria-hidden />
                <span>{t("map.yourPin")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-accent shrink-0" aria-hidden />
                <span>
                  {t("map.coastalZone")} ({COASTAL_BUFFER_KM} km)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-dashed border-emerald-500 bg-emerald-500/20 shrink-0" aria-hidden />
                <span>{lang === "en" ? "PFZ — " : ""}{t("glossary.pfz.full")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-red-500 shrink-0" aria-hidden />
                <span>{lang === "en" ? "IMBL — " : ""}{t("glossary.imbl.full")}</span>
              </li>
            </ul>
          </section>

          <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground">{t("glossary.title")}</h2>
            <dl className="mt-2 space-y-3">
              {GLOSSARY_ITEMS.map((g) => (
                <div key={g.fullKey}>
                  <dt className="text-sm font-semibold text-foreground">
                    {g.short && lang === "en" ? `${g.short} — ` : ""}{t(g.fullKey)}
                  </dt>
                  <dd className="mt-0.5 text-sm text-muted-foreground">{t(g.plainKey)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      ) : (
        <div className="mt-4">
          <EmptyState>{t("loc.title")}</EmptyState>
        </div>
      )}
    </AppShell>
  );
}
