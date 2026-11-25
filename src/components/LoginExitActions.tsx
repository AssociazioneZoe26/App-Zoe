import { Link } from "react-router-dom";

export function LoginExitActions() {
  return (
    <div className="login-exit-actions">
      <Link className="login-exit-btn login-exit-btn-yellow" to="/academy">
        Zoe Academy
      </Link>
      <Link className="login-exit-btn login-exit-btn-blue" to="/accedi">
        Scelta accesso
      </Link>
    </div>
  );
}
