import { clearMarineCaches } from "./marine-cache";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { logoutSession, getUserProfile, fetchSavedLocation, loginUser, registerUser, setAuthFailureHandler } from "@/services/api";
import type { LocationInfo, OrcaUser } from "./types";

const SESSION_TOKEN_KEY = "orca.auth.session";
type Credentials = { contact: string; password: string; remember: boolean };
type Registration = Credentials & { name: string; preferredLanguage?: string };
type SessionValue = { user: OrcaUser | null; location: LocationInfo | null; ready: boolean; sessionError: boolean; retrySession: () => void; locationReady: boolean; token: string | null;
  signIn: (input: Credentials) => Promise<OrcaUser>; register: (input: Registration) => Promise<OrcaUser>;
  signOut: (redirectUrl?: string) => Promise<void>; setLocation: (loc: LocationInfo | null) => void };
const SessionContext = createContext<SessionValue | null>(null);
function readToken() {
  try {
    const s = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (s) return s;
    const l = localStorage.getItem(SESSION_TOKEN_KEY);
    if (l) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, l);
      return l;
    }
  } catch {
    return null;
  }
  return null;
}
function mapUser(raw: any): OrcaUser { const role = raw.role === "GOVERNMENT" ? "government" : raw.role === "SUPER_ADMIN" ? "admin" : "user"; return { id: raw.id, name: raw.name, operationalRegion: raw.operational_region, contact: raw.email || raw.mobile_number || "", role }; }
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionError, setSessionError] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const retrySession = useCallback(() => { setSessionError(false); setRetryVersion(v => v + 1); }, []);
  const [user, setUser] = useState<OrcaUser | null>(null); const [token, setToken] = useState<string | null>(null);
  const locationVersion = useRef(0);
  const authVersion = useRef(0);
  const [locationReady, setLocationReady] = useState(false);
  const [location, setLocationState] = useState<LocationInfo | null>(null); const [ready, setReady] = useState(false);
  const clearSession = useCallback(() => {
    clearMarineCaches();
    authVersion.current++;
    locationVersion.current++;
    setLocationReady(true);
    setUser(null);
    setToken(null);
    setLocationState(null);
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem("orca.user");
      localStorage.removeItem("orca.auth.token");
      localStorage.removeItem("orca.location");
      localStorage.removeItem("orca.chat.threads.v2");
      localStorage.removeItem("orca_assistant_threads_v1");
    } catch {
      /* ignore storage errors */
    }
  }, []);
  useEffect(() => {
    setAuthFailureHandler(clearSession);
    const savedToken = readToken();
    let cancelled = false;
    const version = authVersion.current;
    if (!savedToken) setReady(true);
    else getUserProfile(savedToken).then(raw => {
      if (cancelled || version !== authVersion.current) return;
      setLocationReady(false); setToken(savedToken); setUser(mapUser(raw));
    }).catch((error) => { if (!cancelled && version === authVersion.current) { if (error?.status === 401) clearSession(); else setSessionError(true); } })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; setAuthFailureHandler(null); };
  }, [clearSession, retryVersion]);
  useEffect(() => {
    if (!user || !token) return;
    const version = ++locationVersion.current;
    let cancelled = false;
    setLocationReady(false);
    fetchSavedLocation().then(raw => {
      if (cancelled || version !== locationVersion.current) return;
      setLocationState(raw?.is_coastal_supported ? { coords: { lat: raw.lat, lon: raw.lon }, label: `${raw.lat}, ${raw.lon}`, admin: raw.coastal_region, distanceToCoastKm: raw.distance_to_coast_km, area: "coastal", source: "manual" } : null);
    }).catch(() => { if (!cancelled && version === locationVersion.current) setSessionError(true); })
      .finally(() => { if (!cancelled && version === locationVersion.current) setLocationReady(true); });
    return () => { cancelled = true; };
  }, [user?.id, token, retryVersion]);
  const signOut = useCallback(async (redirectUrl?: string) => {
    const savedToken = readToken();
    clearSession();
    if (savedToken) await logoutSession(savedToken).catch(() => {});
    if (typeof window !== "undefined" && redirectUrl && window.location.pathname !== redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }, [clearSession]);
  const establish = useCallback((result: any, remember: boolean) => {
    clearMarineCaches();
    authVersion.current++;
    locationVersion.current++;
    setLocationReady(false);
    const next = mapUser(result.user);
    try {
      localStorage.removeItem("orca.auth.token");
      localStorage.removeItem("orca.user");
      localStorage.removeItem("orca.location");
      localStorage.removeItem("orca_assistant_threads_v1");
      sessionStorage.setItem(SESSION_TOKEN_KEY, result.access_token);
      if (remember) {
        localStorage.setItem(SESSION_TOKEN_KEY, result.access_token);
      } else localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {
      /* ignore storage error */
    }
    setLocationState(null);
    setToken(result.access_token);
    setUser(next);
    return next;
  }, []);
  const signIn = useCallback(async ({ contact, password, remember }: Credentials) => establish(await loginUser(contact, password), remember), [establish]);
  const register = useCallback(async ({ contact, password, remember, name, preferredLanguage }: Registration) => { const isEmail = contact.includes("@"); return establish(await registerUser({ name, password, preferred_language: preferredLanguage || "en", ...(isEmail ? { email: contact } : { mobile_number: contact }) }), remember); }, [establish]);
  const setLocation = useCallback((loc: LocationInfo | null) => { locationVersion.current++; setLocationState(loc); setLocationReady(true); }, []);
  const value = useMemo(() => ({ user, token, location, ready, sessionError, retrySession, locationReady, signIn, register, signOut, setLocation }), [user, token, location, ready, sessionError, retrySession, locationReady, signIn, register, signOut, setLocation]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() { const ctx = useContext(SessionContext); if (!ctx) throw new Error("useSession must be used inside SessionProvider"); return ctx; }
