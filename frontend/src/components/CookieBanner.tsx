import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/orca/i18n";
import { reviewCopy } from "@/lib/orca/review-copy";
import { trackEvent } from "@/lib/orca/analytics";

export interface CookieConsentPreferences {
  essential: boolean;
  telemetry: boolean;
  analytics: boolean;
  savedAt: string;
}

const STORAGE_KEY = "orca_cookie_consent";

export function CookieBanner() {
  const { lang, t } = useI18n();
  const copy = reviewCopy(lang);
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [telemetryAllowed, setTelemetryAllowed] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Delay showing banner slightly for smooth page entry
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(stored) as CookieConsentPreferences;
        setTelemetryAllowed(parsed.telemetry ?? false);
        setAnalyticsAllowed(parsed.analytics ?? false);
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
    window.dispatchEvent(new Event("orca:consent-changed"));
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

  const button = "min-h-11 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted";
  return <aside role="region" aria-label={copy.consentTitle} className="fixed bottom-20 lg:bottom-4 inset-x-4 z-50 mx-auto max-w-2xl rounded-lg border border-border bg-card p-5 text-card-foreground shadow-lg">
    <h2 className="font-semibold">{copy.consentTitle}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{copy.consentBody}</p>
    <p className="mt-2 flex gap-4 text-sm"><Link className="underline" to="/privacy">{t("footer.privacy")}</Link><Link className="underline" to="/terms">{t("footer.terms")}</Link></p>
    {showPreferences && <label className="mt-4 flex min-h-11 items-center gap-3"><input type="checkbox" checked={analyticsAllowed} onChange={e => { setAnalyticsAllowed(e.target.checked); setTelemetryAllowed(e.target.checked); }} />{copy.analytics}</label>}
    <div className="mt-4 flex flex-wrap gap-2">
      <button className={button} onClick={handleRejectNonEssential}>{copy.essential}</button>
      <button className={button} onClick={() => setShowPreferences(v => !v)} aria-expanded={showPreferences}>{copy.customize}</button>
      <button className={button} onClick={showPreferences ? handleSaveCustom : handleAcceptAll}>{showPreferences ? copy.save : copy.accept}</button>
    </div>
  </aside>;

}

export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orca:open-cookie-settings"));
  }
}
