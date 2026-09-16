import { useI18n } from "@/lib/orca/i18n";
import { snapshotExpired, type MarineSnapshot } from "@/lib/orca/snapshot";
export function SnapshotDetails({snapshot,offline=false}:{snapshot:MarineSnapshot;offline?:boolean}) {
  const {t}=useI18n();
  const old=offline || snapshotExpired(snapshot) || snapshot.provenance.cache_status === "stale";
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`orca-snapshot-${snapshot.snapshot_id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <details className="rounded-md border bg-card p-3 text-xs" data-snapshot-id={snapshot.snapshot_id}>
    <summary className="cursor-pointer break-all">{t("chat.evidence")} · {snapshot.snapshot_id.slice(0,12)} · {t(old ? "health.stale" : snapshot.provenance.cache_status === "unavailable" ? "chat.unavailable" : "health.cached")}</summary>
    <div className="mt-3 space-y-2 break-words">
      {old && <p>Last downloaded marine snapshot — not live.</p>}
      <p>Snapshot ID: {snapshot.snapshot_id}</p><p>{t("loc.current")}: {snapshot.location.lat}, {snapshot.location.lon}</p>
      <p>Requested: {snapshot.request.requested_time}</p><p>{t("state.updated")}: {snapshot.provenance.retrieved_at}</p><p>Expires: {snapshot.expires_at}</p>
      <p>Backend: {snapshot.backend_sha}</p>
      <p>ORCA assessment: {snapshot.risk.level}</p>
      <ul>{snapshot.risk.reasons.map((reason,index)=><li key={index}>{reason}</li>)}</ul>
      <ul>{Object.entries(snapshot.provenance.fields).map(([field,source])=><li key={field} className="mt-2">{field}: {source.source} · valid {source.forecast_valid_at ?? "—"} · issued {source.issued_at ?? "—"} · retrieved {source.retrieved_at ?? "—"} · grid {source.grid_lat ?? "—"}, {source.grid_lon ?? "—"}</li>)}</ul>
      <button onClick={download} className="min-h-11 rounded border px-3">Download snapshot JSON</button>
    </div>
  </details>;
}
