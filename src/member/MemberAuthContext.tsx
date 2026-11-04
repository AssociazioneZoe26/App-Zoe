import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { findMemberByEmail, type MemberAccount } from "./accounts";

const STORAGE_KEY = "zoe-member-session";
const CREDENTIALS_KEY = "zoe-member-remembered";

export type MemberSession = {
  id: string;
  name: string;
  email: string;
};

type MemberAuthContextValue = {
  session: MemberSession | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    remember?: boolean,
  ) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  getRememberedCredentials: () => { email: string; password: string } | null;
};

const MemberAuthContext = createContext<MemberAuthContextValue | null>(null);

function toSession(account: MemberAccount): MemberSession {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
  };
}

function parseSession(raw: string | null): MemberSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MemberSession;
    if (!parsed?.email || !parsed?.id || !parsed?.name) return null;
    const account = findMemberByEmail(parsed.email);
    if (!account || account.id !== parsed.id) return null;
    return toSession(account);
  } catch {
    return null;
  }
}

function readStoredSession(): MemberSession | null {
  return (
    parseSession(localStorage.getItem(STORAGE_KEY)) ||
    parseSession(sessionStorage.getItem(STORAGE_KEY))
  );
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

function readRememberedCredentials(): { email: string; password: string } | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; password?: string };
    if (!parsed.email || !parsed.password) return null;
    return { email: parsed.email, password: parsed.password };
  } catch {
    return null;
  }
}

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MemberSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
    setReady(true);
  }, []);

  const value = useMemo<MemberAuthContextValue>(
    () => ({
      session,
      ready,
      getRememberedCredentials: readRememberedCredentials,
      login(email, password, remember = true) {
        const account = findMemberByEmail(email);
        if (!account || account.password !== password) {
          return { ok: false, error: "Email o password non corretti." };
        }
        const next = toSession(account);
        clearStoredSession();
        const store = remember ? localStorage : sessionStorage;
        store.setItem(STORAGE_KEY, JSON.stringify(next));

        if (remember) {
          localStorage.setItem(
            CREDENTIALS_KEY,
            JSON.stringify({ email: account.email, password }),
          );
        } else {
          localStorage.removeItem(CREDENTIALS_KEY);
        }

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

  return (
    <MemberAuthContext.Provider value={value}>{children}</MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) {
    throw new Error("useMemberAuth va usato dentro MemberAuthProvider");
  }
  return ctx;
}
