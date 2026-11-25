import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useMemberAuth } from "../member/MemberAuthContext";

export function MemberForgotPasswordPage() {
  const { requestPasswordReset } = useMemberAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Recupero password · Zoe";
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <Layout variant="site">
      <section className="access-page member-login-page">
        <p className="eyebrow eyebrow-red">Associati</p>
        <h1>Recupero password</h1>
        <p className="lede">Ti invieremo un link sicuro a scadenza via email.</p>

        {sent ? (
          <div className="member-status-card">
            <p>Se l’indirizzo è registrato, riceverai a breve le istruzioni per reimpostare la password.</p>
          </div>
        ) : (
          <form className="admin-form member-login-form" onSubmit={onSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {error ? <p className="admin-form-error">{error}</p> : null}
            <button type="submit" className="admin-submit" disabled={busy}>
              {busy ? "Invio…" : "Invia link"}
            </button>
          </form>
        )}

        <p className="member-login-back">
          <Link to="/accedi/associati">← Torna all’accesso</Link>
        </p>
      </section>
    </Layout>
  );
}
