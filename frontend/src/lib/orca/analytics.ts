/**
 * ORCA Marine AI — Privacy-Preserving Maritime Analytics & Telemetry Tracker
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface AnalyticsEvent {
  name: string;
  category?: string;
  label?: string;
  value?: number;
  params?: Record<string, unknown>;
  timestamp: string;
}

const STORAGE_KEY = "orca_analytics_events";
const MAX_STORED_EVENTS = 100;

function isAnalyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consent = localStorage.getItem("orca_cookie_consent");
    if (!consent) return true; // Default to basic telemetry
    const parsed = JSON.parse(consent);
    return parsed.analytics !== false;
  } catch {
    return true;
  }
}

export function trackPageView(path: string, title?: string) {
  if (!isAnalyticsAllowed()) return;
  const event: AnalyticsEvent = {
    name: "page_view",
    params: {
      path,
      title: title || document.title,
      referrer: document.referrer || "direct",
    },
    timestamp: new Date().toISOString(),
  };

  logEvent(event);
}

export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
  category?: string,
  label?: string,
  value?: number
) {
  if (!isAnalyticsAllowed()) return;
  const event: AnalyticsEvent = {
    name,
    category,
    label,
    value,
    params,
    timestamp: new Date().toISOString(),
  };

  logEvent(event);
}

export function trackSOS(latitude?: number, longitude?: number, source: string = "ui_button") {
  trackEvent("emergency_sos_triggered", {
    latitude,
    longitude,
    source,
    helpline: "1554",
  }, "Emergency", "SOS_Triggered", 1);
}

export function trackVoiceQuery(lang: string, mode: "mic" | "text" = "mic") {
  trackEvent("marine_assistant_query", {
    language: lang,
    input_mode: mode,
  }, "Assistant", "User_Query");
}

export function trackPFZExplore(portName?: string, zoneId?: string) {
  trackEvent("pfz_zone_explored", {
    port: portName,
    zone: zoneId,
  }, "GIS", "PFZ_Exploration");
}

function logEvent(event: AnalyticsEvent) {
  // In development, log friendly output
  if (import.meta.env.DEV) {
    console.debug(`[ORCA Analytics] 📊 ${event.name}:`, event);
  }

  // Store in local ring buffer for audit / telemetry export
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = [event, ...existing].slice(0, MAX_STORED_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }

  // Dispatch custom window event for integrations / extensions
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orca:analytics", { detail: event }));
  }
}

/**
 * Route tracker hook / component to automatically record navigation changes
 */
export function RouteAnalyticsListener() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
