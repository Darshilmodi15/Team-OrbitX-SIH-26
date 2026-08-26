export function OrcaLogo({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="ORCA Marine AI"
      fill="none"
    >
      <circle cx="24" cy="24" r="22" className="fill-primary" />
      <path
        d="M24 9c5.6 3.4 8.8 8.6 8.8 14.3 0 5.3-3.4 9.7-8.8 13.4-5.4-3.7-8.8-8.1-8.8-13.4C15.2 17.6 18.4 12.4 24 9Z"
        className="fill-accent"
        opacity="0.9"
      />
      <path
        d="M11 30c3.2 0 3.2 2.6 6.5 2.6S20.7 30 24 30s3.2 2.6 6.5 2.6S33.7 30 37 30"
        className="stroke-primary-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="21" r="3" className="fill-primary" />
    </svg>
  );
}

export function OrcaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <OrcaLogo className="size-8 shrink-0" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold tracking-tight">ORCA Marine AI</span>
        {!compact && (
          <span className="truncate text-[11px] text-muted-foreground">
            National Coastal Safety Platform
          </span>
        )}
      </span>
    </span>
  );
}
