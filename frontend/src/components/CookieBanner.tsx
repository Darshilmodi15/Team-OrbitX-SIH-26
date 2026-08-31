import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, Shield, Check, X, Sliders, ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/orca/analytics";

export interface CookieConsentPreferences {
  essential: boolean;
  telemetry: boolean;
  analytics: boolean;
  savedAt: string;
}

const STORAGE_KEY = "orca_cookie_consent";

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [telemetryAllowed, setTelemetryAllowed] = useState(true);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Delay showing banner slightly for smooth page entry
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(stored) as CookieConsentPreferences;
        setTelemetryAllowed(parsed.telemetry ?? true);
        setAnalyticsAllowed(parsed.analytics ?? true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  // Listen for manual trigger to open cookie settings (e.g. from footer or settings)
  useEffect(() => {
    const handleOpen = () => {
      setShowPreferences(true);
      setIsOpen(true);
    };
    window.addEventListener("orca:open-cookie-settings", handleOpen);
    return () => window.removeEventListener("orca:open-cookie-settings", handleOpen);
  }, []);

  const savePreferences = (telemetry: boolean, analytics: boolean) => {
    const pref: CookieConsentPreferences = {
      essential: true,
      telemetry,
      analytics,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
    } catch {
      // Ignore storage write failure
    }
    setIsOpen(false);
    setShowPreferences(false);
    trackEvent("cookie_consent_updated", { telemetry, analytics });
  };

  const handleAcceptAll = () => {
    setTelemetryAllowed(true);
    setAnalyticsAllowed(true);
    savePreferences(true, true);
  };

  const handleRejectNonEssential = () => {
    setTelemetryAllowed(false);
    setAnalyticsAllowed(false);
    savePreferences(false, false);
  };

  const handleSaveCustom = () => {
    savePreferences(telemetryAllowed, analyticsAllowed);
  };

  if (!isOpen) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie & Privacy Consent"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="overflow-hidden rounded-xl border border-teal-500/30 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 sm:p-5">
        {!showPreferences ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Cookie className="size-5" />
              </div>
              <div className="text-xs sm:text-sm text-slate-300">
                <p className="font-semibold text-white">
                  Maritime Data & Cookie Preferences
                </p>
                <p className="mt-1 leading-relaxed">
                  We use cookies and local storage to cache oceanographic telemetry, maintain offshore session continuity, and analyze platform reliability for maritime safety.
                  Read our{" "}
                  <Link to="/privacy" className="text-teal-400 underline hover:text-teal-300">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/terms" className="text-teal-400 underline hover:text-teal-300">
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreferences(true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <Sliders className="size-3.5 text-teal-400" />
                <span>Customize</span>
              </button>

              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <X className="size-3.5 text-rose-400" />
                <span>Essential Only</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-teal-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-teal-950/50 transition hover:bg-teal-400 hover:scale-[1.02]"
              >
                <Check className="size-4" />
                <span>Accept All</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Customize Privacy Preferences</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
              >
                <span>Back</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              {/* Essential */}
              <div className="rounded-lg border border-teal-500/20 bg-teal-950/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-300">Essential (Required)</span>
                  <span className="text-[10px] font-mono text-teal-400/80 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800">Always Active</span>
                </div>
                <p className="mt-1.5 text-slate-400 text-[11px] leading-relaxed">
                  Session authentication, language selection, security tokens, and emergency SOS routing.
                </p>
              </div>

              {/* Telemetry Cache */}
              <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Ocean Telemetry</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telemetryAllowed}
                      onChange={(e) => setTelemetryAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>
                <p className="mt-1.5 text-slate-400 text-[11px] leading-relaxed">
                  Local offline caching of GIS bathymetry, PFZ spots, and INCOIS weather bulletins.
                </p>
              </div>

              {/* Analytics */}
              <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Usage Analytics</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsAllowed}
                      onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>
                <p className="mt-1.5 text-slate-400 text-[11px] leading-relaxed">
                  Anonymized diagnostic telemetry to improve advisory response accuracy and network latency.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="rounded-lg bg-teal-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-teal-400"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orca:open-cookie-settings"));
  }
}
