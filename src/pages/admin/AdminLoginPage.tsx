import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../admin/AuthContext";
import { LoginExitActions } from "../../components/LoginExitActions";

export function AdminLoginPage() {
  const { session, ready, login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Admin · Zoe";
  }, []);

  if (ready && session) {
    return <Navigate to="/admin" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = await login(email, password, remember);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/admin", { replace: true });
  }

  return (
    <div className="admin-shell admin-login-shell">
      <div className="admin-login-stack">
      <div className="admin-login">
        <div className="brand-pair admin-login-brand">
          <Link to="/" className="brand brand-zoe" aria-label="Zoe, vai al sito">
            <img src="/brand/zoe-logo.png" alt="Zoe" />
          </Link>
          <Link to="/academy" className="brand brand-academy" aria-label="Zoe Academy">
            <img src="/brand/academy-emblem.png" alt="Zoe Academy" />
          </Link>
        </div>
        <p className="eyebrow eyebrow-red">Area admin</p>
        <h1>Accedi</h1>
        <p className="lede">Accesso Team Zoe.</p>

        <form className="admin-form" onSubmit={onSubmit}>
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
            <span>Rimani loggato</span>
          </label>
          {error ? <p className="admin-form-error">{error}</p> : null}
          <button type="submit" className="admin-submit">
            Entra
          </button>
        </form>

        <p className="admin-login-back">
          <Link to="/accedi/associati/recupero-password">
            Prima volta o password dimenticata? Imposta password
          </Link>
        </p>
      </div>
      <LoginExitActions />
      </div>
    </div>
  );
}
