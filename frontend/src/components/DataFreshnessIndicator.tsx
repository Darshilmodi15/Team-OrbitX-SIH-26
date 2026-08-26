import { useAppContext } from '../context/AppContext';

type FreshnessSize = 'xs' | 'sm' | 'md';

interface DataFreshnessIndicatorProps {
  size?: FreshnessSize;
  showSource?: boolean;
  className?: string;
}

export default function DataFreshnessIndicator({
  size = 'xs',
  showSource = true,
  className = '',
}: DataFreshnessIndicatorProps) {
  const { lastUpdated, dataFreshnessText } = useAppContext();

  // Determine freshness state
  const now = new Date();
  const minutesAgo = lastUpdated
    ? Math.floor((now.getTime() - lastUpdated.getTime()) / 60000)
    : Infinity;

  const isLive = minutesAgo < 10;
  const isStale = minutesAgo >= 10 && minutesAgo < 30;
  const isOffline = minutesAgo >= 30 || !lastUpdated;

  const dotColor = isLive
    ? 'bg-emerald-500'
    : isStale
    ? 'bg-amber-500'
    : 'bg-red-500';

  const textColor = isLive
    ? 'text-emerald-700'
    : isStale
    ? 'text-amber-700'
    : 'text-red-700';

  const bgColor = isLive
    ? 'bg-emerald-50'
    : isStale
    ? 'bg-amber-50'
    : 'bg-red-50';

  const borderColor = isLive
    ? 'border-emerald-200'
    : isStale
    ? 'border-amber-200'
    : 'border-red-200';

  const dotAnimation = isLive
    ? 'animate-pulseDot'
    : isStale
    ? 'animate-staleBlink'
    : '';

  const sizeStyles: Record<FreshnessSize, { text: string; dot: string; padding: string }> = {
    xs: { text: 'text-[10px]', dot: 'h-1.5 w-1.5', padding: 'px-1.5 py-0.5' },
    sm: { text: 'text-[11px]', dot: 'h-2 w-2', padding: 'px-2 py-1' },
    md: { text: 'text-xs', dot: 'h-2.5 w-2.5', padding: 'px-2.5 py-1' },
  };

  const s = sizeStyles[size];

  const statusLabel = isLive
    ? dataFreshnessText || 'Live'
    : isStale
    ? `Stale — last sync ${minutesAgo}m ago`
    : 'Offline — cached data';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${borderColor} ${bgColor} ${s.padding} ${className}`}
    >
      <span
        className={`inline-block rounded-full ${dotColor} ${s.dot} ${dotAnimation} shrink-0`}
      />
      <span className={`${s.text} ${textColor} font-medium leading-none whitespace-nowrap`}>
        {statusLabel}
        {showSource && isLive && (
          <span className="opacity-60"> via INCOIS</span>
        )}
      </span>
    </div>
  );
}
