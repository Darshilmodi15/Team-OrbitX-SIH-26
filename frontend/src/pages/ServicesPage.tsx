import { useState } from "react";
import { PhoneCall, Radio, Share2 } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import EmergencySOSModal from "@/components/EmergencySOSModal";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { getEmergencyServices } from "@/lib/orca/reference";
import { formatCoords } from "@/lib/orca/geo";

export default function ServicesPage() {
  const { lang, t } = useI18n();
  const { location } = useSession();
  const [copied, setCopied] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const services = getEmergencyServices(lang);

  async function shareLocation() {
    if (!location) return;
    const text = `My location: ${formatCoords(location.coords)} (${location.label ?? ""})`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-xl font-semibold text-foreground">{t("svc.title")}</h1>

      <div className="mt-4 rounded-md border border-danger/40 bg-danger-surface p-4 shadow-sm">
        <p className="text-sm font-bold text-danger">{t("svc.sos")}</p>
        <p className="mt-1 text-sm font-medium text-foreground/90">{t("svc.sosConfirm")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href="tel:112"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-destructive text-sm font-bold text-white transition hover:brightness-110 shadow-sm"
          >
            <PhoneCall className="size-4" aria-hidden />
            <span>112</span>
          </a>
          <button
            className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50 shadow-sm"
            onClick={() => setSosOpen(true)}
            disabled={!location}
          >
            <Radio className="size-4" aria-hidden />
            <span>{t("svc.transmitSos")}</span>
          </button>
          <button
            className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition hover:bg-muted disabled:opacity-50 shadow-sm"
            onClick={shareLocation}
            disabled={!location}
          >
            <Share2 className="size-4 text-secondary" aria-hidden />
            <span className="text-foreground">{t("svc.shareLocation")}</span>
          </button>
        </div>
        {copied && (
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {t("svc.copied")}
          </p>
        )}
      </div>

      {location && (
        <EmergencySOSModal
          isOpen={sosOpen}
          onClose={() => setSosOpen(false)}
          userLocation={location.coords}
          currentLang={lang}
        />
      )}

      <ul className="mt-4 space-y-3">
        {services.map((s) => (
          <li key={s.id} className="rounded-md border border-border bg-card text-card-foreground p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">{s.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("state.source")}: {s.source}
                </p>
              </div>
              <a
                href={`tel:${s.phone}`}
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-110 shadow-xs"
              >
                <PhoneCall className="size-4" aria-hidden />
                <span>{t("svc.call")}</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
