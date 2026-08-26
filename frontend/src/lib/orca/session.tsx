import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LocationInfo, OrcaUser, UserRole } from "./types";

/**
 * Session + location state.
 * Accounts are currently persisted on the device. The shape matches
 * what a real account service will return, so swapping storage for
 * a backend does not change any UI code.
 */

const USER_KEY = "orca.user";
const LOC_KEY = "orca.location";

type SessionValue = {
  user: OrcaUser | null;
  location: LocationInfo | null;
  ready: boolean;
  signIn: (input: { contact: string; name?: string; role?: UserRole }) => OrcaUser;
  signOut: () => void;
  setLocation: (loc: LocationInfo | null) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OrcaUser | null>(null);
  const [location, setLocationState] = useState<LocationInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(read<OrcaUser>(USER_KEY));
    setLocationState(read<LocationInfo>(LOC_KEY));
    setReady(true);
  }, []);

  const signIn = useCallback<SessionValue["signIn"]>(({ contact, name, role }) => {
    const next: OrcaUser = {
      id: `local-${Date.now()}`,
      name: name?.trim() || contact.split("@")[0] || "ORCA user",
      contact,
      role: role ?? "user",
    };
    setUser(next);
    write(USER_KEY, next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    write(USER_KEY, null);
  }, []);

  const setLocation = useCallback((loc: LocationInfo | null) => {
    setLocationState(loc);
    write(LOC_KEY, loc);
  }, []);

  const value = useMemo(
    () => ({ user, location, ready, signIn, signOut, setLocation }),
    [user, location, ready, signIn, signOut, setLocation],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
