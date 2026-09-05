import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUserProfile, loginUser, registerUser, setAuthFailureHandler } from "@/services/api";
import type { LocationInfo, OrcaUser } from "./types";

const SESSION_TOKEN_KEY = "orca.auth.session";
type Credentials = { contact: string; password: string; remember: boolean };
type Registration = Credentials & { name: string; preferredLanguage?: string };
type SessionValue = { user: OrcaUser | null; location: LocationInfo | null; ready: boolean; token: string | null;
  signIn: (input: Credentials) => Promise<OrcaUser>; register: (input: Registration) => Promise<OrcaUser>;
  signOut: () => void; setLocation: (loc: LocationInfo | null) => void };
const SessionContext = createContext<SessionValue | null>(null);
function readToken() { return sessionStorage.getItem(SESSION_TOKEN_KEY); }
function mapUser(raw: any): OrcaUser { const role = raw.role === "GOVERNMENT" ? "government" : raw.role === "SUPER_ADMIN" ? "admin" : "user"; return { id: raw.id, name: raw.name, contact: raw.email || raw.mobile_number || "", role }; }
const DEFAULT_LOCATION: LocationInfo = { coords: { lat: 21.1702, lon: 72.8311 }, label: "Surat", admin: "Gujarat", distanceToCoastKm: 16, area: "coastal", source: "manual" };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OrcaUser | null>(null); const [token, setToken] = useState<string | null>(null);
  const [location, setLocationState] = useState<LocationInfo | null>(DEFAULT_LOCATION); const [ready, setReady] = useState(false);
  const signOut = useCallback(() => { setUser(null); setToken(null); sessionStorage.removeItem(SESSION_TOKEN_KEY); localStorage.removeItem("orca.user"); localStorage.removeItem("orca.auth.token"); localStorage.removeItem("orca.location"); localStorage.removeItem("orca.chat.threads.v2"); localStorage.removeItem("orca_assistant_threads_v1"); }, []);
  useEffect(() => { setAuthFailureHandler(signOut); const savedToken = readToken(); if (!savedToken) { setReady(true); return () => setAuthFailureHandler(null); }
    getUserProfile(savedToken).then(raw => { const restored = mapUser(raw); setToken(savedToken); setUser(restored); }).catch(signOut).finally(() => setReady(true));
    return () => setAuthFailureHandler(null); }, [signOut]);
  const establish = useCallback((result: any, _remember: boolean) => { const next = mapUser(result.user); localStorage.removeItem("orca.auth.token"); localStorage.removeItem("orca.user"); localStorage.removeItem("orca.location"); sessionStorage.setItem(SESSION_TOKEN_KEY, result.access_token); localStorage.removeItem("orca_assistant_threads_v1"); setToken(result.access_token); setUser(next); return next; }, []);
  const signIn = useCallback(async ({ contact, password, remember }: Credentials) => establish(await loginUser(contact, password), remember), [establish]);
  const register = useCallback(async ({ contact, password, remember, name, preferredLanguage }: Registration) => { const isEmail = contact.includes("@"); return establish(await registerUser({ name, password, preferred_language: preferredLanguage || "en", ...(isEmail ? { email: contact } : { mobile_number: contact }) }), remember); }, [establish]);
  const setLocation = useCallback((loc: LocationInfo | null) => { setLocationState(loc); }, []);
  const value = useMemo(() => ({ user, token, location, ready, signIn, register, signOut, setLocation }), [user, token, location, ready, signIn, register, signOut, setLocation]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() { const ctx = useContext(SessionContext); if (!ctx) throw new Error("useSession must be used inside SessionProvider"); return ctx; }
