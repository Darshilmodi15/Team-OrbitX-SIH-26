import { useState } from "react";
import { useI18n } from "@/lib/orca/i18n";
import { incidentCopy } from "@/lib/orca/incident-copy";

type Incident = {
  sos_id: string;
  status: string;
  broadcast_timestamp?: string;
  assigned_mrcc?: string;
  mayday_message?: string;
  recorded_telemetry?: {
    lat?: number;
    lon?: number;
    location_name?: string;
    location_source?: string;
    notes?: string;
    emergency_nature?: string;
    vessel_name?: string;
    contact_phone?: string;
  };
};

type Props = {
  incident: Incident;
  onStatusChange?: (sosId: string, nextStatus: "RESPONDING" | "RESOLVED") => Promise<void> | void;
  updating?: boolean;
};

export function IncidentCard({ incident: s, onStatusChange, updating = false }: Props) {
  const { lang, t } = useI18n();
  const copy = incidentCopy(lang);
  const data = s.recorded_telemetry;
  const source = data?.location_source;
  const [copied, setCopied] = useState(false);

  const badgeClass =
    s.status === "RESOLVED"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
      : s.status === "RESPONDING"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
        : "border-rose-500/40 bg-rose-500/10 text-rose-500";

  function copyMayday() {
    if (!s.mayday_message || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(s.mayday_message).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <article className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <strong>{s.sos_id}</strong>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
            {t(
              s.status === "RECEIVED"
                ? "sos.status.RECEIVED"
                : s.status === "RESOLVED"
                  ? "sos.status.RESOLVED"
                  : s.status === "RESPONDING"
                    ? "sos.status.IN_PROGRESS"
                    : "chat.unavailable",
            )}
          </span>
        </div>
        <time>{s.broadcast_timestamp ? new Date(s.broadcast_timestamp).toLocaleString(lang) : "—"}</time>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{copy.incident}</p>
        <p className="text-lg font-semibold">{data?.location_name || t("chat.unavailable")}</p>
        <p className="font-mono">
          {data?.lat ?? "—"}, {data?.lon ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {source === "selected" || source === "gps" || source === "manual" ? copy[source] : copy.unspecified}
        </p>
      </div>
      <p>
        {copy.nature}: {data?.emergency_nature || t("chat.unavailable")}
      </p>
      <p className="whitespace-pre-wrap break-words">{data?.notes || copy.noDescription}</p>
      {data?.vessel_name && <p>{data.vessel_name}</p>}
      {data?.contact_phone && (
        <p>
          {t("ops.contact")}: {data.contact_phone}
        </p>
      )}
      <div className="border-t pt-2 text-sm text-muted-foreground">
        <p>
          {copy.contact}: {s.assigned_mrcc || t("chat.unavailable")}
        </p>
        <p>{copy.noDispatch}</p>
      </div>
      {onStatusChange && s.status !== "RESOLVED" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {s.status === "RECEIVED" && (
            <button
              type="button"
              disabled={updating}
              onClick={() => void onStatusChange(s.sos_id, "RESPONDING")}
              className="min-h-10 cursor-pointer rounded-md border border-amber-500/50 bg-amber-500/10 px-3 text-xs font-semibold text-amber-500 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              Mark Responding
            </button>
          )}
          <button
            type="button"
            disabled={updating}
            onClick={() => void onStatusChange(s.sos_id, "RESOLVED")}
            className="min-h-10 cursor-pointer rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-500 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Mark Resolved
          </button>
        </div>
      )}
      {s.mayday_message && (
        <details>
          <summary className="min-h-11 cursor-pointer py-3">{copy.transcript}</summary>
          <div className="space-y-2">
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs">
              {s.mayday_message}
            </pre>
            <button
              type="button"
              onClick={copyMayday}
              className="min-h-9 cursor-pointer rounded border border-border px-3 text-xs font-medium hover:bg-muted"
            >
              {copied ? "Copied MAYDAY" : "Copy MAYDAY"}
            </button>
          </div>
        </details>
      )}
    </article>
  );
}
