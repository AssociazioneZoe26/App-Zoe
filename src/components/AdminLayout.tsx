import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../admin/AuthContext";

export function AdminLayout() {
  const { session, ready, logout } = useAdminAuth();

  if (!ready) {
    return (
      <div className="admin-shell">
        <p className="admin-loading">Caricamento…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="admin-top-inner">
          <Link to="/admin" className="admin-brand">
            <img src="/brand/zoe-logo.png" alt="" />
            <span>Admin Zoe</span>
          </Link>
          <nav className="admin-nav" aria-label="Admin">
            <NavLink to="/admin" end>
              Dashboard
            </NavLink>
            <NavLink to="/admin/catalogo">Catalogo</NavLink>
            <NavLink to="/admin/attivazioni">Attivazioni</NavLink>
            <NavLink to="/admin/ingressi">Ingressi</NavLink>
          </nav>
          <div className="admin-user">
            <p>
              <strong>{session.name}</strong>
              <span>{session.email}</span>
            </p>
            <Link className="admin-academy-link" to="/academy">
              Zoe Academy
            </Link>
            <button type="button" className="admin-logout" onClick={logout}>
              Esci
            </button>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
