import { useId } from "react";
import { APP_NAME, POWERED_BY } from "@/lib/brand";

export function MatsyaLogo({
  className = "size-8",
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  const clipId = useId();
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label={APP_NAME}
      fill="none"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="60" cy="60" r="47" />
        </clipPath>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="52"
        style={{ fill: "var(--matsya-mark-ring-fill, #BDEFE6)" }}
        stroke="var(--matsya-teal, #2FB5A3)"
        strokeWidth="4"
      />
      <g className={animated ? "matsya-fish-motion" : undefined}>
        <path
          d="M26 52C38 32 66 32 78 52C66 72 38 72 26 52Z"
          fill="var(--matsya-teal, #2FB5A3)"
        />
        <path
          d="M76 52L96 38Q91 52 96 66Z"
          fill="var(--matsya-teal, #2FB5A3)"
        />
        <circle
          cx="40"
          cy="49"
          r="3.4"
          style={{ fill: "var(--matsya-mark-ink, #12232B)" }}
        />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <path
          className={animated ? "matsya-wave-motion" : undefined}
          d="M-48 86q10-8 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"
          fill="none"
          style={{ stroke: "var(--matsya-mark-ink, #12232B)" }}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function MatsyaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <MatsyaLogo className="size-8 shrink-0" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-bold tracking-tight text-foreground">
          {APP_NAME}
        </span>
        {!compact && (
          <span className="truncate text-[11px] text-muted-foreground">
            {POWERED_BY}
          </span>
        )}
      </span>
    </span>
  );
}

// Backward-compatible aliases while internal paths stay stable.
export const OrcaLogo = MatsyaLogo;
export const OrcaWordmark = MatsyaWordmark;
