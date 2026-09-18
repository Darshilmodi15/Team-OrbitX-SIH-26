import { useI18n } from "@/lib/orca/i18n";
import { snapshotExpired, type MarineSnapshot } from "@/lib/orca/snapshot";
export function SnapshotDetails({
  snapshot,
  offline = false,
}: {
  snapshot: MarineSnapshot;
  offline?: boolean;
}) {
  const { t, lang } = useI18n();
  const old =
    offline ||
    snapshotExpired(snapshot) ||
    snapshot.provenance.cache_status === "stale";
  const sources = [...new Set(snapshot.provenance.source || [])];
  const updated = new Date(snapshot.provenance.retrieved_at);
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `orca-snapshot-${snapshot.snapshot_id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <details
      className="snapshot-disclosure rounded-xl border bg-card p-3 text-xs"
      data-snapshot-id={snapshot.snapshot_id}
    >
      <summary className="cursor-pointer leading-6">
        {t("chat.evidence")}{" "}
        <span className="text-muted-foreground">
          ·{" "}
          {t(
            old
              ? "health.stale"
              : snapshot.provenance.cache_status === "unavailable"
                ? "chat.unavailable"
                : "health.cached",
          )}
          {Number.isFinite(updated.getTime())
            ? ` · ${updated.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </span>
      </summary>
      <div className="mt-3 space-y-3 break-words">
        <div className="flex flex-wrap gap-1.5">
          {sources.map((source) => (
            <span key={source} className="rounded-full border px-2.5 py-1">
              {source}
            </span>
          ))}
        </div>
        {old && (
          <p>
            {lang === "gu"
              ? "છેલ્લે ડાઉનલોડ કરેલી માહિતી — જીવંત નથી."
              : lang === "hi"
                ? "अंतिम डाउनलोड की गई जानकारी — लाइव नहीं।"
                : "Last downloaded marine snapshot — not live."}
          </p>
        )}
        <p>
          {t("loc.current")}: {snapshot.location.lat}, {snapshot.location.lon}
        </p>
        <p>Requested: {snapshot.request.requested_time}</p>
        <p>
          {t("state.updated")}: {snapshot.provenance.retrieved_at}
        </p>
        <p>Expires: {snapshot.expires_at}</p>
        <p>ORCA assessment: {snapshot.risk.level}</p>
        <ul>
          {snapshot.risk.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
        <ul>
          {Object.entries(snapshot.provenance.fields).map(([field, source]) => (
            <li key={field} className="mt-3">
              <details>
              <summary className="cursor-pointer">
              <strong>
                {field.replace(/^(weather|ocean)\./, "").replaceAll("_", " ")}
              </strong>
              {source.value != null ? ` · ${source.value} ${source.unit || ""}` : ""} · {source.evidence_type === "model_forecast" ? "Forecast model" : "Source details"}
              </summary>
              <br />
              {source.source} · valid {source.forecast_valid_at ?? "—"}
              <br />
              Issued {source.issued_at ?? "—"} · retrieved{" "}
              {source.retrieved_at ?? "—"}
              <br />
              Grid {source.grid_lat ?? "—"}, {source.grid_lon ?? "—"} ·{" "}
              {source.cache_status}
              <br/>Product: {source.product || "Unavailable"}
              <br/>Spatial resolution: {source.spatial_resolution || "Unavailable"}
              <br/>Temporal resolution: {source.temporal_resolution || "Unavailable"}
              <br/>Satellite / sensor: {source.satellite || source.sensor || "Not attributed for this model value"}
              {source.source_url && /^https:\/\//.test(source.source_url) && <p><a href={source.source_url} target="_blank" rel="noreferrer">Provider documentation</a></p>}
              </details>
            </li>
          ))}
        </ul>
        <details className="border-t pt-3">
          <summary className="cursor-pointer">Snapshot reference</summary>
          <p className="mt-2 break-all">{snapshot.snapshot_id}</p>
          <p className="break-all">Backend: {snapshot.backend_sha}</p>
          <button
            onClick={download}
            className="mt-2 min-h-11 rounded-full border px-3"
          >
            Download snapshot JSON
          </button>
        </details>
      </div>
    </details>
  );
}
