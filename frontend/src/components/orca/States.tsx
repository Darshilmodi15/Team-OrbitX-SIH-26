import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/orca/i18n";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">{label ?? t("state.loading")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-caution/40 bg-caution-surface/60 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-caution" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title ?? t("state.liveUnavailable")}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <RotateCcw className="size-4" aria-hidden />
          <span>{t("cta.retry")}</span>
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      <Inbox className="size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
