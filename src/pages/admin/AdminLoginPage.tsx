import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../admin/AuthContext";

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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login(email, password, remember);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    navigate("/admin", { replace: true });
  }

  return (
    <div className="admin-shell admin-login-shell">
      <div className="admin-login">
        <Link to="/" className="admin-login-brand">
          <img src="/brand/zoe-logo.png" alt="Zoe" />
        </Link>
        <p className="eyebrow eyebrow-red">Area admin</p>
        <h1>Accedi</h1>
        <p className="lede">Accesso Zoe Team.</p>

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
      </div>
    </div>
  );
}
