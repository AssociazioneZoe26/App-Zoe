import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../admin/AuthContext";
import { syncAllLocalToCloud } from "../lib/cloudSync";
import { SiteFooter } from "./SiteFooter";

export function AdminLayout() {
  const { session, ready, logout } = useAdminAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const syncedOnce = useRef(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!session || syncedOnce.current) return;
    syncedOnce.current = true;
    void syncAllLocalToCloud({ activations: false });
  }, [session]);

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
          <div className="brand-pair admin-brand-pair">
            <Link to="/" className="brand brand-zoe" aria-label="Zoe, vai al sito">
              <img src="/brand/zoe-logo.png" alt="Zoe" />
            </Link>
          </div>

          <nav className="admin-nav admin-nav-desktop" aria-label="Admin">
            <NavLink to="/admin/registrazioni">Registrazioni</NavLink>
            <NavLink to="/admin/newsletter">Newsletter</NavLink>
            <NavLink to="/admin/catalogo">Catalogo</NavLink>
            <NavLink to="/admin/attivazioni">Attivazioni</NavLink>
            <NavLink to="/admin/ingressi">Ingressi</NavLink>
            <NavLink to="/admin/ingressi/scansiona">Scansiona ingresso</NavLink>
          </nav>

          <div className="admin-user">
            <Link className="admin-text-link admin-academy-link" to="/academy" aria-label="Zoe Academy">
              <span className="admin-academy-link-text">Zoe Academy</span>
              <img
                className="admin-academy-link-logo"
                src="/brand/academy-emblem.png"
                alt=""
              />
            </Link>
            <Link className="admin-dashboard-link" to="/admin">
              Dashboard
            </Link>
            <button type="button" className="admin-logout" onClick={() => void logout()}>
              Esci
            </button>
            <button
              className={open ? "menu-toggle is-open" : "menu-toggle"}
              type="button"
              aria-expanded={open}
              aria-controls="admin-menu"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="menu-toggle-label">{open ? "Chiudi menu" : "Apri menu"}</span>
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <nav
          id="admin-menu"
          className={open ? "admin-nav-mobile is-open" : "admin-nav-mobile"}
          aria-label="Menu admin"
          hidden={!open}
        >
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/registrazioni">Registrazioni</NavLink>
          <NavLink to="/admin/newsletter">Newsletter</NavLink>
          <NavLink to="/admin/catalogo">Catalogo</NavLink>
          <NavLink to="/admin/attivazioni">Attivazioni</NavLink>
          <NavLink to="/admin/ingressi">Ingressi</NavLink>
          <NavLink to="/admin/ingressi/scansiona">Scansiona ingresso</NavLink>
        </nav>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
