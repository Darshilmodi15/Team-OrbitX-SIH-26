import { useEffect, useRef, useState } from "react";
import { broadcastSOS, updateSOSDetails } from "../services/api";
import { useI18n } from "@/lib/orca/i18n";
import { incidentCopy } from "@/lib/orca/incident-copy";
import { saveDetails } from "@/lib/orca/review-copy";

type LocationCoords = { lat: number; lon: number };
type SOSRecord = {
  sos_id: string;
  status?: string;
  assigned_mrcc?: string;
  mayday_message?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userLocation: LocationCoords;
  currentLang?: string;
  locationName?: string;
  locationSource?: "selected" | "gps" | "manual" | "unspecified";
}

export default function EmergencySOSModal({
  isOpen,
  onClose,
  userLocation,
  locationName,
  locationSource = "unspecified",
}: Props) {
  const { t, lang } = useI18n();
  const copy = incidentCopy(lang);
  const panel = useRef<HTMLElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [record, setRecord] = useState<SOSRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [copiedMayday, setCopiedMayday] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending.current) onClose();
      if (e.key === "Tab") {
        const items = panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],textarea",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === panel.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [isOpen, onClose]);

  async function send() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    setError("");
    try {
      const result = await broadcastSOS({
        lat: userLocation.lat,
        lon: userLocation.lon,
        emergency_nature: "General Emergency",
        notes: notes.trim(),
        location_name: locationName,
        location_source: locationSource,
      });
      if (!result?.sos_id || result.status !== "RECEIVED") {
        throw new Error("SOS_NOT_CONFIRMED");
      }
      setRecord(result);
      window.dispatchEvent(new CustomEvent("orca:sos_broadcasted", { detail: result }));
    } catch (err) {
      setError(
        err instanceof Error && err.message === "SOS_SELECTED_LOCATION_CHANGED"
          ? copy.locationChanged
          : copy.failed,
      );
      setFailed(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function update() {
    if (pending.current || !record || !notes.trim()) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    setError("");
    setSaved(false);
    try {
      const updated = await updateSOSDetails(record.sos_id, notes.trim());
      setRecord((prev) => ({
        ...(prev || { sos_id: record.sos_id }),
        ...(updated || {}),
      }));
      setSaved(true);
      window.dispatchEvent(new CustomEvent("orca:sos_broadcasted", { detail: updated || record }));
    } catch {
      setError(copy.failed);
      setFailed(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function handleClose() {
    if (busy) return;
    setFailed(false);
    setError("");
    setSaved(false);
    setCopiedMayday(false);
    setRecord(null);
    onClose();
  }

  function copyMayday() {
    if (!record?.mayday_message || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(record.mayday_message).then(() => {
      setCopiedMayday(true);
      window.setTimeout(() => setCopiedMayday(false), 2000);
    }).catch(() => {});
  }

  if (!isOpen) return null;

  const sourceCopy = (copy as Record<string, string>)[locationSource] || copy.unspecified;
  const smsBody = encodeURIComponent(
    `ORCA SOS | Lat ${userLocation.lat.toFixed(4)}, Lon ${userLocation.lon.toFixed(4)}` +
      (locationName ? ` (${locationName})` : "") +
      (notes.trim() ? ` | ${notes.trim()}` : ""),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
        className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-lg border border-border bg-card p-5 text-card-foreground"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="sos-title" className="text-xl font-semibold">
            SOS
          </h2>
          <button
            className="min-h-11 px-3"
            onClick={handleClose}
            disabled={busy}
            aria-label={t("cta.back")}
          >
            ×
          </button>
        </div>
        <p className="my-3 text-sm">{t("sos.confirmDesc")}</p>
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <a className="underline" href="tel:112">
            {t("svc.call")} 112
          </a>
          <a className="underline" href="tel:1554">
            1554
          </a>
          <a className="underline" href={`sms:112?body=${smsBody}`}>
            SMS 112 (Offline)
          </a>
        </div>
        <p className="mb-4 text-sm">
          {copy.incident}: {locationName ? `${locationName} · ` : ""}
          {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)} · {sourceCopy}
        </p>
        {failed && (
          <p role="alert" className="my-3 text-destructive">
            {error || copy.failed}
          </p>
        )}
        <label className="my-4 block">
          {copy.description}
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-border bg-background p-3"
            value={notes}
            maxLength={2000}
            disabled={busy}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        {!record ? (
          <button
            className="min-h-12 w-full rounded-md bg-destructive px-4 text-white disabled:opacity-50"
            onClick={send}
            disabled={busy}
          >
            {busy ? t("state.loading") : t("sos.submit")}
          </button>
        ) : (
          <div className="space-y-3">
            <p role="status" className="font-semibold">
              {t("sos.received")} · {record.sos_id}
            </p>
            {record.assigned_mrcc && (
              <p className="rounded-md border border-border bg-muted/40 p-2.5 text-xs">
                <strong>{copy.contact}:</strong> {record.assigned_mrcc}
              </p>
            )}
            {record.mayday_message && (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold">{copy.transcript}</p>
                <pre className="whitespace-pre-wrap text-xs">{record.mayday_message}</pre>
                <button
                  type="button"
                  onClick={copyMayday}
                  className="min-h-9 rounded border border-border px-3 text-xs font-medium hover:bg-muted"
                >
                  {copiedMayday ? "Copied MAYDAY" : "Copy MAYDAY"}
                </button>
              </div>
            )}
            <button
              className="mt-1 min-h-11 rounded-md border border-border px-4"
              onClick={update}
              disabled={busy || !notes.trim()}
            >
              {busy ? t("state.loading") : saveDetails[lang] ?? saveDetails.en}
            </button>
            {saved && <p role="status">{t("sos.received")}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
