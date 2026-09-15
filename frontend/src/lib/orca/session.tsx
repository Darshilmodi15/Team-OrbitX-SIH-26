import { clearMarineCaches } from "./marine-cache";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { logoutSession, getUserProfile, fetchSavedLocation, loginUser, registerUser, setAuthFailureHandler } from "@/services/api";
import type { LocationInfo, OrcaUser } from "./types";

const SESSION_TOKEN_KEY = "orca.auth.session";
type Credentials = { contact: string; password: string; remember: boolean };
type Registration = Credentials & { name: string; preferredLanguage?: string };
type SessionValue = { user: OrcaUser | null; location: LocationInfo | null; ready: boolean; locationReady: boolean; token: string | null;
  signIn: (input: Credentials) => Promise<OrcaUser>; register: (input: Registration) => Promise<OrcaUser>;
  signOut: (redirectUrl?: string) => Promise<void>; setLocation: (loc: LocationInfo | null) => void };
const SessionContext = createContext<SessionValue | null>(null);
function readToken() { try { return sessionStorage.getItem(SESSION_TOKEN_KEY); } catch { return null; } }
function mapUser(raw: any): OrcaUser { const role = raw.role === "GOVERNMENT" ? "government" : raw.role === "SUPER_ADMIN" ? "admin" : "user"; return { id: raw.id, name: raw.name, operationalRegion: raw.operational_region, contact: raw.email || raw.mobile_number || "", role }; }
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OrcaUser | null>(null); const [token, setToken] = useState<string | null>(null);
  const locationVersion = useRef(0);
  const authVersion = useRef(0);
  const [locationReady, setLocationReady] = useState(true);
  const [location, setLocationState] = useState<LocationInfo | null>(null); const [ready, setReady] = useState(false);
  const clearSession = useCallback(() => { clearMarineCaches(); authVersion.current++; locationVersion.current++; setLocationReady(true); setUser(null); setToken(null); setLocationState(null); sessionStorage.removeItem(SESSION_TOKEN_KEY); localStorage.removeItem("orca.user"); localStorage.removeItem("orca.auth.token"); localStorage.removeItem("orca.location"); localStorage.removeItem("orca.chat.threads.v2"); localStorage.removeItem("orca_assistant_threads_v1"); }, []);
  useEffect(() => {
    setAuthFailureHandler(clearSession);
    const savedToken = readToken();
    let cancelled = false;
    const version = authVersion.current;
    if (!savedToken) setReady(true);
    else getUserProfile(savedToken).then(raw => {
      if (cancelled || version !== authVersion.current) return;
      setToken(savedToken); setUser(mapUser(raw));
    }).catch(() => { if (!cancelled && version === authVersion.current) clearSession(); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; setAuthFailureHandler(null); };
  }, [clearSession]);
  const signOut = useCallback(async (redirectUrl?: string) => {
    const savedToken = readToken();
    clearSession();
    if (savedToken) await logoutSession(savedToken).catch(() => {});
    if (typeof window !== "undefined" && redirectUrl && window.location.pathname !== redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }, [clearSession]);
  const establish = useCallback((result: any, _remember: boolean) => { clearMarineCaches(); authVersion.current++; locationVersion.current++; setLocationReady(true); const next = mapUser(result.user); localStorage.removeItem("orca.auth.token"); localStorage.removeItem("orca.user"); localStorage.removeItem("orca.location"); sessionStorage.setItem(SESSION_TOKEN_KEY, result.access_token); localStorage.removeItem("orca_assistant_threads_v1"); setLocationState(null); setToken(result.access_token); setUser(next); return next; }, []);
  const signIn = useCallback(async ({ contact, password, remember }: Credentials) => establish(await loginUser(contact, password), remember), [establish]);
  const register = useCallback(async ({ contact, password, remember, name, preferredLanguage }: Registration) => { const isEmail = contact.includes("@"); return establish(await registerUser({ name, password, preferred_language: preferredLanguage || "en", ...(isEmail ? { email: contact } : { mobile_number: contact }) }), remember); }, [establish]);
  const setLocation = useCallback((loc: LocationInfo | null) => { locationVersion.current++; setLocationState(loc); setLocationReady(true); }, []);
  const value = useMemo(() => ({ user, token, location, ready, locationReady, signIn, register, signOut, setLocation }), [user, token, location, ready, locationReady, signIn, register, signOut, setLocation]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() { const ctx = useContext(SessionContext); if (!ctx) throw new Error("useSession must be used inside SessionProvider"); return ctx; }
