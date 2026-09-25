import { useState } from "react";
import type { LocationInfo, MarineBundle } from "@/lib/orca/types";
import { snapshotPFZ } from "@/lib/orca/snapshot";
import { useI18n } from "@/lib/orca/i18n";
import { reviewCopy } from "@/lib/orca/review-copy";
import { marineCopy } from "@/lib/orca/marine-copy";

export function TripPack({ location, bundle }: { location: LocationInfo; bundle: MarineBundle }) {
  const { lang, t } = useI18n(); const copy = reviewCopy(lang); const marine = marineCopy[lang];
  const pfz = { advisory: snapshotPFZ(bundle.snapshot), isPending: false };
  const [busy, setBusy] = useState(false); const [status, setStatus] = useState("");
  async function download() {
    setBusy(true); setStatus("");
    try {
      const { prepareTripPack } = await import("@/lib/orca/offline/trip-pack");
      const pack = prepareTripPack(location, bundle, pfz.advisory);
      const time = (stamp: number) => new Date(stamp).toLocaleString(lang, {timeZoneName: "short"});
      const labels: Record<string,string> = {
        "Wave height": t("marine.wave"), "Wave period": t("marine.period"), "Wave direction (from)": marine.waveDirection,
        "Wind speed": t("marine.wind"), "Wind direction (from)": t("marine.windDir"), "Sea surface temperature": t("marine.sst"),
        "Wind-wave height": marine.windWave, "Wind-wave period": marine.windWave, "Wind-wave direction (from)": marine.windWave,
        "Swell height": marine.swell, "Swell period": marine.swell, "Swell direction (from)": marine.swell,
        "Current speed": marine.current, "Current direction (towards)": marine.current,
      };
      const lines = ["ORCA — " + copy.tripTitle, ...(bundle.snapshot?.provenance.demo_scenario ? ["DEMO SCENARIO — ILLUSTRATIVE DATASET — NOT LIVE"] : []), `Snapshot: ${bundle.snapshot?.snapshot_id ?? "unavailable"}`, copy.warning, marine.notice, "", `${t("loc.current")}: ${pack.location.label} (${pack.location.lat}, ${pack.location.lon})`, `${copy.savedAt}: ${time(pack.savedAt)}`, `${copy.expiresAt}: ${time(pack.expiresAt)}`, "", t("marine.title")];
      for (const r of pack.readings) lines.push(`${labels[r.label] || r.label}: ${r.value} ${r.unit}`, `${copy.source}: ${r.source}`, `${copy.validAt}: ${time(r.validAt)}`, `${copy.expiresAt}: ${time(r.expiresAt)}`, "");
      if (!pack.readings.length) lines.push(t("state.liveUnavailable"));
      lines.push("PFZ", pack.pfz.status === "current" ? `${copy.source}: ${pack.pfz.source} / ${copy.expiresAt}: ${pack.pfz.validUntil}` : t("state.liveUnavailable"));
      for (const p of pack.pfz.points) lines.push(`${p.name}: ${p.lat}, ${p.lon}`);
      const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\n")], {type:"text/plain;charset=utf-8"}));
      const link = document.createElement("a"); link.href = url; link.download = `orca-trip-${lang}-${new Date(pack.savedAt).toISOString().slice(0,10)}.txt`;
      document.body.append(link); link.click(); link.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),60000); setStatus(copy.saved);
    } catch { setStatus(copy.failed); } finally {setBusy(false);}
  }
  return <section className="space-y-3 rounded-md border border-border bg-card p-4 text-card-foreground" lang={lang} aria-labelledby="trip-heading">
    <h2 id="trip-heading" className="font-semibold">{copy.tripTitle}</h2><p className="text-sm text-muted-foreground">{copy.warning}</p>
    <button onClick={download} className="min-h-12 rounded-md bg-secondary px-4 text-secondary-foreground disabled:opacity-50" disabled={busy || pfz.isPending}>{busy ? t("state.loading") : copy.download}</button>
    <p role="status" className="text-sm">{status}</p>
  </section>;
}
