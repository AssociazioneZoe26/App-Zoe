import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { menuTone, navMenu } from "../admin/adminMenu";
import { useAdminAuth } from "../admin/AuthContext";
import { syncAllLocalToCloud } from "../lib/cloudSync";
import { SiteFooter } from "./SiteFooter";

export function AdminLayout() {
  const { session, ready, logout } = useAdminAuth();
  const location = useLocation();
  const onDashboardHome = location.pathname === "/admin";
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
            <Link to="/academy" className="brand brand-academy" aria-label="Zoe Academy">
              <img src="/brand/academy-emblem.png" alt="" />
            </Link>
          </div>

          <nav className="admin-nav admin-nav-desktop" aria-label="Admin">
            {navMenu.map((item) => (
              <NavLink key={item.id} to={item.href} end={item.end} style={menuTone(item)}>
                <span className="admin-nav-glyph" aria-hidden="true">
                  {item.icon}
                </span>
                {item.navLabel || item.label}
              </NavLink>
            ))}
          </nav>

          <div className="admin-user">
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
          <NavLink
            to="/admin"
            end
            style={menuTone({ color: "#142c86", ink: "#fffdf9" })}
          >
            <span className="admin-nav-glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 11.2 12 4.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2H9V20.5H5.5A1.5 1.5 0 0 1 4 19z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Dashboard
          </NavLink>
          {navMenu.map((item) => (
            <NavLink key={item.id} to={item.href} end={item.end} style={menuTone(item)}>
              <span className="admin-nav-glyph" aria-hidden="true">
                {item.icon}
              </span>
              {item.navLabel || item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="admin-main">
        {onDashboardHome ? null : (
          <Link className="admin-back" to="/admin">
            <span className="admin-back-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M14.5 6.5 8.5 12l6 5.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Dashboard
          </Link>
        )}
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
