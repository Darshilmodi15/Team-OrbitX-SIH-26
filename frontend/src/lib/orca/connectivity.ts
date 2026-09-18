import { useSyncExternalStore } from "react";

export type Connectivity = "FULL" | "GOOD" | "DEGRADED" | "OFFLINE";
type Sample = { latency: number; failed: boolean };
type Hint = { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number; addEventListener?: (name: string, fn: () => void) => void; removeEventListener?: (name: string, fn: () => void) => void };
export function classifyConnectivity(online: boolean, samples: Sample[], hint?: Hint): Connectivity {
  if (!online) return "OFFLINE";
  const recent = samples.slice(-8);
  const failures = recent.filter(s => s.failed).length;
  const successes = recent.filter(s => !s.failed);
  const mean = successes.reduce((sum, s) => sum + s.latency, 0) / Math.max(1, successes.length);
  if (hint?.saveData || /(^|-)2g|3g/.test(hint?.effectiveType || "") || (hint?.rtt ?? 0) > 1000 || failures >= 2 || mean > 2500) return "DEGRADED";
  if (recent.length >= 3 && failures === 0 && mean < 700) return "FULL";
  return "GOOD"; // No performance evidence is not proof of a fast connection.
}
const listeners = new Set<() => void>();
let samples: Sample[] = [];
let mode: Connectivity = "GOOD";
const hint = () => (navigator as Navigator & { connection?: Hint }).connection;
function refresh() {
  const next = classifyConnectivity(navigator.onLine, samples, hint());
  if (next !== mode) { mode = next; listeners.forEach(fn => fn()); }
}
export function recordNetworkSample(latency: number, failed: boolean) {
  samples = [...samples.slice(-7), { latency, failed }]; refresh();
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) { window.addEventListener("online", refresh); window.addEventListener("offline", refresh); hint()?.addEventListener?.("change", refresh); refresh(); }
  return () => { listeners.delete(fn); if (!listeners.size) { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); hint()?.removeEventListener?.("change", refresh); } };
}
export function useConnectivity() { return useSyncExternalStore(subscribe, () => mode, () => "GOOD" as Connectivity); }
