import { POWERED_BY, getLocalizedAppName } from "@/lib/brand";
import { useI18n } from "@/lib/orca/i18n";
import { MatsyaLogo } from "./Logo";
import { cn } from "@/lib/utils";

export interface MatsyaLoaderProps {
  message?: string;
  variant?: "fullscreen" | "section" | "compact";
  className?: string;
}

export function MatsyaLoader({
  message,
  variant = "section",
  className,
}: MatsyaLoaderProps) {
  const { lang, t } = useI18n();
  const appName = getLocalizedAppName(lang);
  const statusText = message ?? t("state.loading");

  if (variant === "compact") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border/60 bg-[var(--matsya-loader-bg)] px-4 py-5 text-center",
          className,
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl border border-[#2FB5A3]/30 bg-[var(--matsya-loader-tile)] shadow-sm">
          <MatsyaLogo className="size-10" animated />
        </div>
        <div className="flex flex-col items-center leading-tight">
          <span className="text-sm font-bold tracking-tight text-[#2FB5A3]">
            {appName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {POWERED_BY}
          </span>
        </div>
        <div className="h-1 w-28 overflow-hidden rounded-full bg-muted/80">
          <div className="matsya-bar-motion h-full w-1/2 rounded-full bg-gradient-to-r from-[#2FB5A3] to-[#4AB3F4]" />
        </div>
        {statusText && (
          <p className="text-xs text-muted-foreground">{statusText}</p>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center text-foreground selection:bg-teal-500/30",
        variant === "fullscreen"
          ? "min-h-screen bg-[var(--matsya-loader-bg)]"
          : "rounded-2xl border border-border/60 bg-[var(--matsya-loader-bg)] py-10",
        className,
      )}
    >
      <div className="relative flex size-24 items-center justify-center rounded-3xl border border-[#2FB5A3]/30 bg-[var(--matsya-loader-tile)] shadow-xl shadow-[#2FB5A3]/15">
        <MatsyaLogo className="size-16" animated />
      </div>

      <div className="mt-5 flex flex-col items-center gap-0.5">
        <span className="text-xl font-bold tracking-tight text-[#2FB5A3]">
          {appName}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {POWERED_BY}
        </span>
      </div>

      <div className="mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-muted/80">
        <div className="matsya-bar-motion h-full w-1/2 rounded-full bg-gradient-to-r from-[#2FB5A3] to-[#4AB3F4]" />
      </div>

      {statusText && (
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {statusText}
        </p>
      )}
    </div>
  );
}
