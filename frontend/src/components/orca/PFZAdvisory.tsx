import { useEffect, useState } from "react";
import { useI18n } from "@/lib/orca/i18n";
import { usePFZ } from "@/lib/orca/use-pfz";
import { mapCopy } from "@/lib/orca/map-copy";
import { formatCoords } from "@/lib/orca/geo";

export function PFZAdvisory({ showPoints = false }: { showPoints?: boolean }) {
  const { lang, t } = useI18n();
  const copy = mapCopy[lang];
  const [selectedSector, setSelectedSector] = useState<string>("");
  const { advisory, isPending, isError, isFetching, refetch } = usePFZ(selectedSector || undefined);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const sectors = [
    { id: "", label: copy.allSectors },
    { id: "gujarat", label: "Gujarat" },
    { id: "maharashtra", label: "Maharashtra" },
    { id: "goa", label: "Goa" },
    { id: "karnataka", label: "Karnataka" },
    { id: "kerala", label: "Kerala" },
    { id: "tamil_nadu", label: "Tamil Nadu & Puducherry" },
    { id: "andhra_pradesh", label: "Andhra Pradesh" },
    { id: "odisha", label: "Odisha" },
    { id: "west_bengal", label: "West Bengal" },
    { id: "lakshadweep", label: "Lakshadweep" },
    { id: "andaman_nicobar", label: "Andaman & Nicobar" },
  ];

  const date = (value: string | null) => value ? new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)) + " IST" : "—";

  return <section className="rounded-md border border-border bg-card p-4 text-sm space-y-3" aria-label={t("glossary.pfz.full")}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">{t("glossary.pfz.full")}</h2>
      <button type="button" className="min-h-10 rounded-md border px-3 disabled:opacity-50" onClick={() => void refetch()} disabled={!online || isFetching}>{t("cta.retry")}</button>
    </div>

    {/* Sector Selector */}
    <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
      <label htmlFor="pfz-sector-select" className="text-xs font-medium text-muted-foreground">
        {copy.sector}:
      </label>
      <select
        id="pfz-sector-select"
        value={selectedSector}
        onChange={(e) => setSelectedSector(e.target.value)}
        className="min-h-9 rounded-md border border-border bg-background px-2.5 py-1 text-xs"
      >
        {sectors.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>

    <p role="status" className={advisory.status === "current" ? "font-medium" : "text-muted-foreground"}>
      {!online ? copy.offline : isPending ? t("state.loading") : isError ? t("state.error") : copy[advisory.status]}
      {!online && !isPending ? ` · ${copy[advisory.status]}` : ""}
      {advisory.coverageStatus === "coverage_gap" ? ` (${copy.coverageGap})` : ""}
    </p>

    <dl className="grid gap-3 sm:grid-cols-3 text-xs">
      <div><dt className="text-muted-foreground">{t("state.source")}</dt><dd className="mt-1 break-words">{advisory.source ?? "—"}</dd></div>
      <div><dt className="text-muted-foreground">{copy.issued}</dt><dd className="mt-1">{date(advisory.issuedAt)}</dd></div>
      <div><dt className="text-muted-foreground">{copy.valid}</dt><dd className="mt-1">{date(advisory.validUntil)}</dd></div>
    </dl>

    {showPoints && <div>
      <h3 className="font-medium">{copy.points} ({advisory.points.length})</h3>
      <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-border">
        {advisory.points.map((point, i) => <li key={`${point.id}-${i}`} className="flex flex-wrap justify-between gap-2 py-2"><span>{point.name}</span><span className="font-mono text-xs">{formatCoords(point)}</span></li>)}
      </ul>
    </div>}

    <details className="border-t border-border pt-3">
      <summary className="cursor-pointer min-h-8 font-medium">{copy.guide}</summary>
      <div className="mt-2 space-y-2 text-muted-foreground">
        <p>{t("glossary.pfz.plain")}</p>
        <p>{t("terms.body1")} {t("terms.body2")}</p>
        <a className="inline-block py-2 text-primary underline" href="https://incois.gov.in/MarineFisheries/PfzAdvisory" target="_blank" rel="noopener noreferrer">INCOIS · {t("glossary.pfz.full")} ↗</a>
      </div>
    </details>
  </section>;
}
