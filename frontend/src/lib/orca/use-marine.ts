import { useQuery } from "@tanstack/react-query";
import { fetchMarineBundle } from "./marine";
import type { Coords } from "./geo";
import type { MarineBundle } from "./types";

const CACHE_KEY = "orca.marine.cache";

function readCache(c: Coords): MarineBundle | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key: string; bundle: MarineBundle };
    return parsed.key === cacheKey(c) ? parsed.bundle : null;
  } catch {
    return null;
  }
}

function cacheKey(c: Coords) {
  return `${c.lat.toFixed(2)},${c.lon.toFixed(2)}`;
}

export function useMarine(coords: Coords | null) {
  const cached = coords ? readCache(coords) : null;
  return useQuery({
    queryKey: ["marine", coords ? cacheKey(coords) : "none"],
    enabled: !!coords,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    ...(cached ? { placeholderData: cached } : {}),
    queryFn: async ({ signal }) => {
      const bundle = await fetchMarineBundle(coords!, signal);
      try {
        window.localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ key: cacheKey(coords!), bundle }),
        );
      } catch {
        /* ignore */
      }
      return bundle;
    },
  });
}
