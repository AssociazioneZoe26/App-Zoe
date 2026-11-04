import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { findAdminByEmail, type AdminAccount, type AdminRole } from "./accounts";

const STORAGE_KEY = "zoe-admin-session";

export type AdminSession = {
  id: AdminRole;
  name: string;
  email: string;
};

type AuthContextValue = {
  session: AdminSession | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    remember?: boolean,
  ) => { ok: true } | { ok: false; error: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(account: AdminAccount): AdminSession {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
  };
}

function parseSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.email || !parsed?.id || !parsed?.name) return null;
    const account = findAdminByEmail(parsed.email);
    if (!account || account.id !== parsed.id) return null;
    return toSession(account);
  } catch {
    return null;
  }
}

function readStoredSession(): AdminSession | null {
  return parseSession(localStorage.getItem(STORAGE_KEY)) || parseSession(sessionStorage.getItem(STORAGE_KEY));
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      login(email, password, remember = true) {
        const account = findAdminByEmail(email);
        if (!account || account.password !== password) {
          return { ok: false, error: "Email o password non corretti." };
        }
        const next = toSession(account);
        clearStoredSession();
        const store = remember ? localStorage : sessionStorage;
        store.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
        return { ok: true };
      },
      logout() {
        clearStoredSession();
        setSession(null);
      },
    }),
    [session, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth va usato dentro AdminAuthProvider");
  }
  return ctx;
}
