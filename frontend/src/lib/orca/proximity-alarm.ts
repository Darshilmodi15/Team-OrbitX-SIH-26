import type { MarineSnapshot } from "./snapshot";

export interface ProximityAlertResult {
  triggered: boolean;
  severity: "critical" | "warning" | "none";
  reason: string;
}

/**
 * Evaluates a marine snapshot for IMBL / boundary proximity or critical marine hazards.
 */
export function evaluateProximityAlert(
  snapshot?: MarineSnapshot,
  thresholdKm = 10,
): ProximityAlertResult {
  if (!snapshot) {
    return { triggered: false, severity: "none", reason: "" };
  }
  const insideEez = snapshot.boundary?.eez?.inside;
  const distKm = snapshot.boundary?.nearest_boundary_distance;

  if (insideEez === false) {
    return {
      triggered: true,
      severity: "critical",
      reason:
        distKm != null
          ? `Outside Indian EEZ reference polygon (~${distKm.toFixed(1)} km from boundary edge).`
          : "Outside Indian EEZ reference boundary.",
    };
  }

  if (typeof distKm === "number" && Number.isFinite(distKm) && distKm <= thresholdKm) {
    return {
      triggered: true,
      severity: "critical",
      reason: `Within ${distKm.toFixed(1)} km of EEZ / boundary reference edge (alert threshold ${thresholdKm} km).`,
    };
  }

  const criticalHazard = snapshot.hazards?.find((h) => h.severity === "critical");
  if (criticalHazard) {
    return {
      triggered: true,
      severity: "critical",
      reason: `${criticalHazard.title}: ${criticalHazard.message}`,
    };
  }

  if (snapshot.risk?.level === "unsafe") {
    return {
      triggered: true,
      severity: "warning",
      reason: "ORCA heuristic classifies current sea state as UNSAFE for small craft.",
    };
  }

  return { triggered: false, severity: "none", reason: "" };
}

/**
 * Plays a short two-tone Web Audio API chime with graceful fallback if unsupported/blocked.
 */
export function playMaritimeAlarmTone(): boolean {
  if (typeof window === "undefined") return false;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  try {
    const ctx = new Ctor();
    const now = ctx.currentTime;
    for (const [offset, freq] of [
      [0, 880],
      [0.24, 660],
      [0.48, 880],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.21);
    }
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 900);
    return true;
  } catch {
    return false;
  }
}

export function announceProximityWarning(message: string, lang = "en"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = lang.includes("-") ? lang : `${lang}-IN`;
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  } catch {
    /* Optional voice synthesis */
  }
}
