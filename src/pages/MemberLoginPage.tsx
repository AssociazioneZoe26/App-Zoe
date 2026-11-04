import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useMemberAuth } from "../member/MemberAuthContext";

export function MemberLoginPage() {
  const { session, ready, login, getRememberedCredentials } = useMemberAuth();
  const navigate = useNavigate();
  const remembered = getRememberedCredentials();
  const [email, setEmail] = useState(remembered?.email || "");
  const [password, setPassword] = useState(remembered?.password || "");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Accesso Associati · Zoe";
    const saved = getRememberedCredentials();
    if (saved) {
      setEmail(saved.email);
      setPassword(saved.password);
      setRemember(true);
    }
  }, [getRememberedCredentials]);

  if (ready && session) {
    return <Navigate to="/accedi/associati/area" replace />;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login(email, password, remember);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    navigate("/accedi/associati/area", { replace: true });
  }

  return (
    <Layout variant="site">
      <section className="access-page member-login-page">
        <p className="eyebrow eyebrow-red">Associati</p>
        <h1>Accesso Associati Zoe</h1>
        <p className="lede">Entra con la tua email di socio.</p>

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
            <span>Ricorda email e password</span>
          </label>
          {error ? <p className="admin-form-error">{error}</p> : null}
          <button type="submit" className="admin-submit">
            Entra
          </button>
        </form>

        <p className="member-login-back">
          <Link to="/accedi">← Torna alla scelta accesso</Link>
        </p>
      </section>
    </Layout>
  );
}
