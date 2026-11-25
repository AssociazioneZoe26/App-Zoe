import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function MemberResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.title = "Imposta password · Zoe";
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    let mounted = true;

    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      if (mounted) setReady(Boolean(data.session));
    }

    void syncSession();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setReady(Boolean(session));
      }
      if (event === "SIGNED_OUT") setReady(false);
    });

    // Token in hash: lascia un attimo a detectSessionInUrl
    const t = window.setTimeout(() => {
      void syncSession();
    }, 400);

    return () => {
      mounted = false;
      window.clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase non configurato.");
      return;
    }
    setBusy(true);
    const supabase = getSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError("Aggiornamento non riuscito. Richiedi un nuovo link.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    let goAdmin = false;
    if (auth.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();
      goAdmin = profile?.role === "team_zoe";
    }
    setBusy(false);
    navigate(goAdmin ? "/admin/login" : "/accedi/associati", { replace: true });
  }

  return (
    <Layout variant="site">
      <section className="access-page member-login-page">
        <p className="eyebrow eyebrow-red">Account Zoe</p>
        <h1>Imposta password</h1>
        {!ready ? (
          <p className="lede">
            Apri il link ricevuto via email per continuare. Se sei già sulla app
            locale, attendi un momento o richiedi un nuovo link.
          </p>
        ) : (
          <>
            <p className="lede">Scegli una password per il tuo account.</p>
            <form className="admin-form member-login-form" onSubmit={onSubmit}>
              <label>
                Nuova password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label>
                Conferma password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              {error ? <p className="admin-form-error">{error}</p> : null}
              <button type="submit" className="admin-submit" disabled={busy}>
                {busy ? "Salvataggio…" : "Salva password"}
              </button>
            </form>
          </>
        )}
        <p className="member-login-back">
          <Link to="/admin/login">Accesso Team Zoe</Link>
          {" · "}
          <Link to="/accedi/associati">Accesso Associati</Link>
        </p>
      </section>
    </Layout>
  );
}
