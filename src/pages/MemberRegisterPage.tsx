import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { LoginExitActions } from "../components/LoginExitActions";
import { useMemberAuth } from "../member/MemberAuthContext";
import { SignupPath } from "../member/SignupPath";

export function MemberRegisterPage() {
  const { session, ready, register } = useMemberAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Registrazione Associati · Zoe";
  }, []);

  if (ready && session?.canAccessMemberArea) {
    return <Navigate to="/accedi/associati/area" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }
    setBusy(true);
    const result = await register({
      firstName,
      lastName,
      email,
      password,
      privacyAccepted,
      marketingConsent,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNeedsEmail(result.needsEmailConfirmation);
    setDone(true);
  }

  return (
    <Layout variant="site">
      <section className="access-page member-login-page">
        <p className="eyebrow eyebrow-red">Associati</p>
        <h1>Richiedi l’iscrizione</h1>
        <p className="lede">
          Crea l’account. Team Zoe approva la richiesta; il numero tessera arriva dopo, in
          associazione.
        </p>
        {!done ? <SignupPath /> : null}

        {done ? (
          <div className="member-status-card">
            <h2>Richiesta inviata</h2>
            <p>
              {needsEmail
                ? "Ti abbiamo inviato un’email: apri il link per confermare l’indirizzo."
                : "Email già confermata."}
            </p>
            <SignupPath emailDone={!needsEmail} />
            <p>
              Quando Team Zoe approva, puoi usare l’area soci. Il numero tessera viene assegnato
              in un secondo momento.
            </p>
            <p className="member-login-back">
              <Link to="/accedi/associati">Vai all’accesso</Link>
            </p>
          </div>
        ) : (
          <form className="admin-form member-login-form" onSubmit={onSubmit}>
            <div className="admin-form-row">
              <label>
                Nome
                <input
                  name="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </label>
              <label>
                Cognome
                <input
                  name="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
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
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="admin-remember">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                required
              />
              <span>
                Accetto l’
                <Link to="/privacy" target="_blank" rel="noreferrer">
                  informativa privacy
                </Link>{" "}
                (obbligatorio)
              </span>
            </label>
            <label className="admin-remember">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              <span>
                Voglio ricevere la newsletter Zoe (stesso elenco del sito: riepilogo corsi ogni due
                settimane)
              </span>
            </label>
            {error ? <p className="admin-form-error">{error}</p> : null}
            <button type="submit" className="admin-submit" disabled={busy}>
              {busy ? "Invio…" : "Invia richiesta"}
            </button>
          </form>
        )}

        <p className="member-login-back">
          <Link to="/accedi/associati">Hai già un account? Accedi</Link>
        </p>
        <LoginExitActions />
      </section>
    </Layout>
  );
}
