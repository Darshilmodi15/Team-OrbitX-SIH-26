import { useSession } from "./session";
import { useQuery } from "@tanstack/react-query";
import { fetchMarineBundle } from "./marine";
import type { Coords } from "./geo";
import type { MarineBundle } from "./types";

const CACHE_PREFIX = "orca.marine.cache.v5.";

function readCache(c: Coords, owner: string): MarineBundle | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_PREFIX + owner);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key: string; bundle: MarineBundle };
    if (parsed.key !== cacheKey(c)) return null;
    const current = parsed.bundle.current;
    const age = Date.now() - Date.parse(current.time);
    if (!Number.isFinite(age) || age > 24 * 3600000 || age < -3600000 || current.dataMode === "unavailable") return null;
    return { ...parsed.bundle, current: { ...current, dataMode: age > 3 * 3600000 || current.dataMode === "stale" ? "stale" : "cached" } };
  } catch {
    return null;
  }
}

function cacheKey(c: Coords) {
  return `${c.lat},${c.lon}`;
}

export function useMarine(coords: Coords | null) {
  const { user } = useSession();
  const owner = user?.id ?? "anonymous";
  const cached = coords ? readCache(coords, owner) : null;
  return useQuery({
    queryKey: ["marine-v5", owner, coords ? cacheKey(coords) : "none"],
    enabled: !!coords,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    ...(cached ? { placeholderData: cached } : {}),
    queryFn: async ({ signal }) => {
      let sessionAtStart: string | null = null;
      try { sessionAtStart = window.sessionStorage.getItem("orca.auth.session"); } catch { /* Network data remains usable without storage. */ }
      const bundle = await fetchMarineBundle(coords!, signal);
      try {
        if (!signal.aborted && sessionAtStart === window.sessionStorage.getItem("orca.auth.session")) window.sessionStorage.setItem(
          CACHE_PREFIX + owner,
          JSON.stringify({ key: cacheKey(coords!), bundle }),
        );
      } catch {
        /* ignore */
      }
      return bundle;
    },
  });
}
