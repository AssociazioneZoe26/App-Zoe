import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

const CREDENTIALS_KEY = "zoe-member-remembered";

export type MemberStatus = "pending" | "approved" | "rejected" | "suspended";

export type MemberSession = {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  memberStatus: MemberStatus;
  emailVerified: boolean;
  /** Accesso completo area soci: email verificata + approved */
  canAccessMemberArea: boolean;
};

type LoginResult = { ok: true } | { ok: false; error: string };
type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  privacyAccepted: boolean;
  marketingConsent: boolean;
};
type RegisterResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

type MemberAuthContextValue = {
  session: MemberSession | null;
  ready: boolean;
  accessToken: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<LoginResult>;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  requestPasswordReset: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  getRememberedEmail: () => string | null;
};

const MemberAuthContext = createContext<MemberAuthContextValue | null>(null);

function readRememberedEmail(): string | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email?.trim() || null;
  } catch {
    localStorage.removeItem(CREDENTIALS_KEY);
    return null;
  }
}

function statusMessage(status: MemberStatus, emailVerified: boolean): string {
  if (!emailVerified) {
    return "Apri l’email di conferma e clicca il link. Poi Team Zoe valuterà la richiesta.";
  }
  if (status === "pending") {
    return "Email confermata. Team Zoe sta valutando la richiesta. Il numero tessera arriva dopo l’approvazione, in associazione.";
  }
  if (status === "rejected") {
    return "La richiesta di iscrizione non è stata accettata. Contatta Team Zoe.";
  }
  if (status === "suspended") {
    return "Account sospeso. Contatta Team Zoe per assistenza.";
  }
  return "";
}

async function profileToSession(user: User): Promise<MemberSession | null> {
  const supabase = getSupabase();
  const email = user.email ?? "";
  const emailVerified = Boolean(user.email_confirmed_at);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, first_name, last_name, role, member_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "team_zoe") {
    return null;
  }

  const memberStatus = (profile?.member_status as MemberStatus) || "pending";
  const firstName = profile?.first_name?.trim() || "";
  const lastName = profile?.last_name?.trim() || "";
  const name =
    profile?.full_name?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    email.split("@")[0] ||
    "Socio";

  return {
    id: user.id,
    name,
    email: profile?.email || email,
    firstName,
    lastName,
    memberStatus,
    emailVerified,
    canAccessMemberArea: emailVerified && memberStatus === "approved",
  };
}

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MemberSession | null>(null);
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
      const next = await profileToSession(authSession.user);
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

  const value = useMemo<MemberAuthContextValue>(
    () => ({
      session,
      ready,
      accessToken,
      getRememberedEmail: readRememberedEmail,
      async refreshProfile() {
        if (!isSupabaseConfigured()) return;
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          setSession(null);
          setAccessToken(null);
          return;
        }
        const next = await profileToSession(data.session.user);
        setSession(next);
        setAccessToken(next ? data.session.access_token : null);
      },
      async register(input) {
        if (!isSupabaseConfigured()) {
          return { ok: false, error: "Supabase non configurato. Contatta Team Zoe." };
        }
        if (!input.privacyAccepted) {
          return { ok: false, error: "Devi accettare l’informativa privacy." };
        }
        const firstName = input.firstName.trim();
        const lastName = input.lastName.trim();
        const email = input.email.trim().toLowerCase();
        if (!firstName || !lastName || !email || input.password.length < 8) {
          return {
            ok: false,
            error: "Compila tutti i campi. La password deve avere almeno 8 caratteri.",
          };
        }

        const supabase = getSupabase();
        const redirectTo = `${window.location.origin}/accedi/associati`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password: input.password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              privacy_accepted: "true",
              marketing_consent: input.marketingConsent ? "true" : "false",
            },
          },
        });

        if (error) {
          return {
            ok: false,
            error: error.message.includes("already")
              ? "Esiste già un account con questa email."
              : "Registrazione non riuscita. Riprova.",
          };
        }

        // Non passare mai role team_zoe da client (ignorato anche dal trigger).
        const needsEmailConfirmation = !data.session;
        return { ok: true, needsEmailConfirmation };
      },
      async login(email, password, remember = true) {
        if (!isSupabaseConfigured()) {
          return {
            ok: false,
            error: "Supabase non configurato. Contatta Team Zoe.",
          };
        }
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.user || !data.session) {
          return { ok: false, error: "Email o password non corretti." };
        }

        const next = await profileToSession(data.user);
        if (!next) {
          await supabase.auth.signOut();
          return { ok: false, error: "Questo account non è un accesso soci." };
        }

        if (remember) {
          localStorage.setItem(
            CREDENTIALS_KEY,
            JSON.stringify({ email: next.email }),
          );
        } else {
          localStorage.removeItem(CREDENTIALS_KEY);
        }

        setSession(next);
        setAccessToken(data.session.access_token);

        const gate = statusMessage(next.memberStatus, next.emailVerified);
        if (gate && !next.canAccessMemberArea) {
          // Login consentito: l’area mostrerà il messaggio informativo.
          return { ok: true };
        }
        return { ok: true };
      },
      async requestPasswordReset(email) {
        if (!isSupabaseConfigured()) {
          return { ok: false, error: "Supabase non configurato." };
        }
        const supabase = getSupabase();
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/accedi/associati/reimposta-password`,
        });
        if (error) {
          return { ok: false, error: "Invio non riuscito. Controlla l’email e riprova." };
        }
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

export function memberGateMessage(session: MemberSession | null): string {
  if (!session) return "";
  return statusMessage(session.memberStatus, session.emailVerified);
}
