import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export type AdminSession = {
  id: string;
  name: string;
  email: string;
};

type LoginResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  session: AdminSession | null;
  ready: boolean;
  accessToken: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function profileToAdminSession(
  userId: string,
  email: string,
): Promise<AdminSession | null> {
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "team_zoe") return null;

  return {
    id: profile.id,
    name: profile.full_name || "Team Zoe",
    email: profile.email || email,
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function syncFromSupabase(authSession: Session | null) {
      if (!authSession?.user) {
        if (mounted) {
          setSession(null);
          setAccessToken(null);
        }
        return;
      }
      const next = await profileToAdminSession(
        authSession.user.id,
        authSession.user.email ?? "",
      );
      if (!mounted) return;
      if (!next) {
        setSession(null);
        setAccessToken(null);
        return;
      }
      setSession(next);
      setAccessToken(authSession.access_token);
    }

    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      syncFromSupabase(data.session).finally(() => {
        if (mounted) setReady(true);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      void syncFromSupabase(authSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      accessToken,
      async login(email, password) {
        if (!isSupabaseConfigured()) {
          return { ok: false, error: "Supabase non configurato." };
        }
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.user || !data.session) {
          return { ok: false, error: "Email o password non corretti." };
        }

        const next = await profileToAdminSession(
          data.user.id,
          data.user.email ?? email,
        );
        if (!next) {
          await supabase.auth.signOut();
          return { ok: false, error: "Accesso riservato a Team Zoe." };
        }

        setSession(next);
        setAccessToken(data.session.access_token);
        return { ok: true };
      },
      async logout() {
        if (isSupabaseConfigured()) {
          await getSupabase().auth.signOut();
        }
        setSession(null);
        setAccessToken(null);
      },
    }),
    [session, ready, accessToken],
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
