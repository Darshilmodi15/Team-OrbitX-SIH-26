import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCcw, Loader2, Radio } from "lucide-react";
import { useI18n } from "@/lib/orca/i18n";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-400">
        <Radio className="size-3.5 animate-pulse text-teal-400" />
        <span>{label ?? t("state.loading")}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/40 p-4"
          >
            <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
            <div className="mt-3 h-5 w-2/3 rounded bg-muted-foreground/15" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-xl border border-border bg-card/60 p-4">
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="size-6 rounded bg-muted" />
      </div>
      <div className="mt-4 h-7 w-28 rounded bg-muted" />
      <div className="mt-2 h-2.5 w-36 rounded bg-muted/70" />
    </div>
  );
}

export function Spinner({ className = "size-4 text-teal-400" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
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
    <div className="flex flex-col items-start gap-3 rounded-xl border border-caution/40 bg-caution-surface/60 p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-caution" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title ?? t("state.liveUnavailable")}</p>
          {description && <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors active:scale-95"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          <span>{t("cta.retry")}</span>
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <Inbox className="size-5 shrink-0 opacity-60" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
