import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/orca/States";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useMarine } from "@/lib/orca/use-marine";
import { deriveAdvisories } from "@/lib/orca/alerts";

const ICONS = { info: Info, warning: AlertTriangle, danger: ShieldAlert } as const;
const TONE = {
  info: "border-border bg-card",
  warning: "border-caution/40 bg-caution-surface",
  danger: "border-danger/40 bg-danger-surface",
} as const;

export default function AlertsPage() {
  const { lang, t } = useI18n();
  const { location } = useSession();
  const marine = useMarine(location?.coords ?? null);
  const alerts = deriveAdvisories(marine.data ?? null, lang);

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">{t("alerts.title")}</h1>

      <div className="mt-4 space-y-3">
        {marine.isError ? (
          <ErrorState description={t("state.offline")} onRetry={() => marine.refetch()} />
        ) : marine.isPending ? (
          <LoadingState label={t("state.loadingMarine")} />
        ) : alerts.length === 0 ? (
          <EmptyState>{t("alerts.none")}</EmptyState>
        ) : (
          alerts.map((a) => {
            const Icon = ICONS[a.level];
            return (
              <article key={a.id} className={`rounded-md border p-4 ${TONE[a.level]}`}>
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{a.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed">{a.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("state.source")}: {a.source} · {new Date(a.issuedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
