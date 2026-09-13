import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPFZDataset } from "@/services/api";
import { normalizePFZ } from "./pfz";

export function usePFZ(selectedSector?: string, coords?: { lat: number; lon: number }, lang?: string) {
  const query = useQuery({
    queryKey: ["pfz-dataset", selectedSector, coords?.lat, coords?.lon, lang],
    queryFn: () => fetchPFZDataset(selectedSector, coords?.lat, coords?.lon, lang),
    staleTime: 300_000,
    retry: 1,
  });
  const [now, setNow] = useState(Date.now);
  const advisory = useMemo(() => normalizePFZ(query.data, Math.max(now, query.dataUpdatedAt)), [query.data, query.dataUpdatedAt, now]);
  useEffect(() => {
    if (!advisory.validUntil || advisory.status !== "current") return;
    const delay = Math.min(Math.max(0, Date.parse(advisory.validUntil) - Date.now()), 2_147_483_646);
    const timer = window.setTimeout(() => setNow(Date.now()), delay + 1);
    return () => window.clearTimeout(timer);
  }, [advisory.validUntil, advisory.status, now]);
  return { ...query, advisory };
}
