import { AlertOctagon, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/orca/i18n";
import type { SafetyLevel } from "@/lib/orca/types";
import { cn } from "@/lib/utils";

const MAP = {
  safe: { Icon: CheckCircle2, label: "status.safe" as const, desc: "status.safeDesc" as const, cls: "border-safe/40 bg-safe-surface text-safe" },
  caution: { Icon: AlertTriangle, label: "status.caution" as const, desc: "status.cautionDesc" as const, cls: "border-caution/40 bg-caution-surface text-caution" },
  dangerous: { Icon: ShieldAlert, label: "status.dangerous" as const, desc: "status.dangerousDesc" as const, cls: "border-danger/40 bg-danger-surface text-danger" },
  emergency: { Icon: AlertOctagon, label: "status.emergency" as const, desc: "status.emergencyDesc" as const, cls: "border-danger/60 bg-danger-surface text-danger" },
};

export function useSafetyLabel() {
  const { t } = useI18n();
  return (level: SafetyLevel) => t(MAP[level].label);
}

export function SafetyStatusCard({ level, note }: { level: SafetyLevel; note?: string }) {
  const { t } = useI18n();
  const { Icon, label, desc, cls } = MAP[level];

  return (
    <section className={cn("rounded-md border p-4", cls)} aria-live="polite">
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{t("status.title")}</p>
      <div className="mt-2 flex items-start gap-3">
        <Icon className="mt-0.5 size-7 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">{t(label)}</h2>
          <p className="mt-1 text-sm text-foreground/80">{t(desc)}</p>
          {note && <p className="mt-1 text-xs text-foreground/70">{note}</p>}
        </div>
      </div>
    </section>
  );
}

export function SafetyPill({ level }: { level: SafetyLevel }) {
  const { t } = useI18n();
  const { label, cls } = MAP[level];
  return (
    <span className={cn("inline-block rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", cls)}>
      {t(label)}
    </span>
  );
}
