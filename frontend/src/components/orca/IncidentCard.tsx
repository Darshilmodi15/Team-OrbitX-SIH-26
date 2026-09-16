import { useI18n } from "@/lib/orca/i18n";
import { incidentCopy } from "@/lib/orca/incident-copy";

type Incident = {
  sos_id: string; status: string; broadcast_timestamp?: string; assigned_mrcc?: string; mayday_message?: string;
  recorded_telemetry?: {lat?: number; lon?: number; location_name?: string; location_source?: string; notes?: string; emergency_nature?: string; vessel_name?: string; contact_phone?: string};
};
export function IncidentCard({incident:s}: {incident:Incident}) {
  const {lang,t}=useI18n(); const copy=incidentCopy(lang); const data=s.recorded_telemetry;
  const source = data?.location_source;
  return <article className="space-y-3 p-4">
    <div className="flex flex-wrap justify-between gap-2"><strong>{s.sos_id}</strong><time>{s.broadcast_timestamp ? new Date(s.broadcast_timestamp).toLocaleString(lang) : "—"}</time></div>
    <div><p className="text-sm text-muted-foreground">{copy.incident}</p><p className="text-lg font-semibold">{data?.location_name || t("chat.unavailable")}</p>
      <p className="font-mono">{data?.lat ?? "—"}, {data?.lon ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{source === "selected" || source === "gps" || source === "manual" ? copy[source] : copy.unspecified}</p></div>
    <p>{copy.nature}: {data?.emergency_nature || t("chat.unavailable")}</p>
    <p className="whitespace-pre-wrap break-words">{data?.notes || copy.noDescription}</p>
    {data?.vessel_name && <p>{data.vessel_name}</p>}
    {data?.contact_phone && <p>{t("ops.contact")}: {data.contact_phone}</p>}
    <p>{t(s.status === "RECEIVED" ? "sos.status.RECEIVED" : s.status === "RESOLVED" ? "sos.status.RESOLVED" : s.status === "RESPONDING" ? "sos.status.IN_PROGRESS" : "chat.unavailable")}</p>
    <div className="border-t pt-2 text-sm text-muted-foreground"><p>{copy.contact}: {s.assigned_mrcc || t("chat.unavailable")}</p><p>{copy.noDispatch}</p></div>
    {s.mayday_message && <details><summary className="min-h-11 cursor-pointer py-3">{copy.transcript}</summary><p className="whitespace-pre-wrap text-sm">{s.mayday_message}</p></details>}
  </article>;
}
