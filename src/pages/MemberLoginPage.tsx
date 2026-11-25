import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { LoginExitActions } from "../components/LoginExitActions";
import { useMemberAuth } from "../member/MemberAuthContext";

export function MemberLoginPage() {
  const { session, ready, login, getRememberedEmail } = useMemberAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => getRememberedEmail() || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Accesso Associati · Zoe";
    const saved = getRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, [getRememberedEmail]);

  if (ready && session) {
    return <Navigate to="/accedi/associati/area" replace />;
  }
  // pending/rejected/suspended: login consentito, area mostra messaggio informativo

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = await login(email, password, remember);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/accedi/associati/area", { replace: true });
  }

  return (
    <Layout variant="site">
      <section className="access-page member-login-page">
        <p className="eyebrow eyebrow-red">Associati</p>
        <h1>Accesso Associati Zoe</h1>
        <p className="lede">
          Entra con l’email usata in registrazione. Se sei in attesa di approvazione puoi comunque
          accedere e vedere lo stato della richiesta.
        </p>

        <form className="admin-form member-login-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="admin-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>Ricorda email</span>
          </label>
          {error ? <p className="admin-form-error">{error}</p> : null}
          <button type="submit" className="admin-submit">
            Entra
          </button>
        </form>

        <p className="member-login-back">
          <Link to="/accedi/associati/registrati">Iscriviti ora</Link>
          {" · "}
          <Link to="/accedi/associati/recupero-password">Password dimenticata?</Link>
        </p>
        <LoginExitActions />
      </section>
    </Layout>
  );
}
