import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { activityFilters } from "../data";
import { useAdminAuth } from "../admin/AuthContext";
import { useMemberAuth } from "../member/MemberAuthContext";
import { siteLinks } from "../content/siteNav";
import { DownloadAppLink } from "./DownloadAppLink";
import { SiteFooter } from "./SiteFooter";

type LayoutVariant = "site" | "academy";

const academyLinks = [
  { label: "Home", to: "/", tipo: undefined as string | undefined },
  ...activityFilters.map((filter) => ({
    label: filter.label,
    to: filter.id === "tutte" ? "/academy#catalogo" : `/academy?tipo=${filter.id}#catalogo`,
    tipo: filter.id as string | undefined,
  })),
];

export function Layout({
  children,
  variant = "site",
}: {
  children: ReactNode;
  variant?: LayoutVariant;
}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session: memberSession, ready: memberReady, logout: memberLogout } = useMemberAuth();
  const { session: adminSession, ready: adminReady, logout: adminLogout } = useAdminAuth();
  const tipo = params.get("tipo");
  const [open, setOpen] = useState(false);
  const [progettiOpen, setProgettiOpen] = useState(false);
  const isMemberLoggedIn = memberReady && Boolean(memberSession);
  const isAdminLoggedIn = adminReady && Boolean(adminSession);

  async function onMemberLogout() {
    await memberLogout();
    setOpen(false);
    navigate("/accedi/associati");
  }

  async function onAdminLogout() {
    const stayOnPage = !location.pathname.startsWith("/admin");
    await adminLogout();
    setOpen(false);
    if (!stayOnPage) {
      navigate("/admin/login");
    }
  }

  const authControl = isMemberLoggedIn ? (
    <div className="nav-auth">
      <Link className="nav-dashboard" to="/accedi/associati/area" onClick={() => setOpen(false)}>
        Dashboard
      </Link>
      <button type="button" className="nav-signin nav-signout" onClick={() => void onMemberLogout()}>
        Esci
      </button>
    </div>
  ) : isAdminLoggedIn ? (
    <div className="nav-auth">
      <Link className="nav-dashboard" to="/admin" onClick={() => setOpen(false)}>
        Dashboard
      </Link>
      <button type="button" className="nav-signin nav-signout" onClick={() => void onAdminLogout()}>
        Esci
      </button>
    </div>
  ) : (
    <Link className="nav-signin" to="/accedi">
      Accedi
    </Link>
  );
  const isAcademy = variant === "academy";

  useEffect(() => {
    setOpen(false);
    setProgettiOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const header = document.querySelector(".top");
    if (!header) return;
    const apply = () => {
      const offset = Math.ceil(header.getBoundingClientRect().height) + 12;
      document.documentElement.style.setProperty("--nav-offset", `${offset}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, [variant]);

  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const scrollToSection = () => {
      const target = document.getElementById(id);
      const header = document.querySelector(".top");
      if (!target || !header) return;
      const offset = Math.ceil(header.getBoundingClientRect().height) + 12;
      document.documentElement.style.setProperty("--nav-offset", `${offset}px`);
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    };

    scrollToSection();
    const frame = requestAnimationFrame(scrollToSection);
    const later = window.setTimeout(scrollToSection, 50);
    const pending = [...document.images].filter((image) => !image.complete);
    pending.forEach((image) => image.addEventListener("load", scrollToSection, { once: true }));
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(later);
      pending.forEach((image) => image.removeEventListener("load", scrollToSection));
    };
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setProgettiOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`shell shell-${variant}`}>
      <a className="skip" href="#contenuto">
        Vai al contenuto
      </a>

      {isAcademy ? (
        <header className="top top-academy">
          <div className="top-inner">
            <div className="brand-pair">
              <Link to="/" className="brand brand-zoe" aria-label="Zoe, torna al sito">
                <img src="/brand/zoe-logo.png" alt="Zoe" />
              </Link>
              <Link
                to="/academy"
                className="brand brand-academy"
                aria-label="Zoe Academy, vai alle attività"
              >
                <img src="/brand/academy-emblem.png" alt="Zoe Academy" />
              </Link>
            </div>
            <nav
              id="menu-principale"
              className={open ? "nav is-open" : "nav"}
              aria-label="Academy"
            >
              <div className="nav-links">
                {academyLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    aria-current={
                      link.tipo === "tutte"
                        ? location.pathname.startsWith("/academy") && !tipo
                          ? "page"
                          : undefined
                        : link.tipo && tipo === link.tipo
                          ? "page"
                          : undefined
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
            <div className="top-tools">
              {isAdminLoggedIn || isMemberLoggedIn ? null : <DownloadAppLink />}
              {authControl}
              <button
                className={open ? "menu-toggle is-open" : "menu-toggle"}
                type="button"
                aria-expanded={open}
                aria-controls="menu-principale"
                onClick={() => setOpen((value) => !value)}
              >
                <span className="menu-toggle-label">{open ? "Chiudi menu" : "Apri menu"}</span>
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </header>
      ) : (
        <header className="top top-site">
          <div className="top-inner">
            <div className="brand-pair">
              <Link to="/" className="brand brand-zoe" aria-label="Zoe, vai alla home del sito">
                <img src="/brand/zoe-logo.png" alt="Zoe" />
              </Link>
            </div>
            <nav id="menu-principale" className={open ? "nav is-open" : "nav"} aria-label="Sito">
              <div className="nav-links">
                {siteLinks.map((link) =>
                  link.children ? (
                    <div
                      key={link.label}
                      className={progettiOpen ? "nav-item has-sub is-open" : "nav-item has-sub"}
                    >
                      <button
                        type="button"
                        className="nav-subtoggle"
                        aria-expanded={progettiOpen}
                        aria-controls="menu-progetti"
                        onClick={() => setProgettiOpen((value) => !value)}
                      >
                        {link.label}
                      </button>
                      <div id="menu-progetti" className="nav-submenu" hidden={!progettiOpen}>
                        {link.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) => (isActive ? "is-current" : undefined)}
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) => {
                        const isNewsletter = link.to.includes("#newsletter");
                        const current = isNewsletter
                          ? location.pathname === "/contatti" && location.hash === "#newsletter"
                          : link.to === "/contatti"
                            ? location.pathname === "/contatti" && location.hash !== "#newsletter"
                            : isActive;
                        return (
                          [
                            link.logoSrc ? "nav-link-with-logo" : undefined,
                            current ? "is-current" : undefined,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        );
                      }}
                    >
                      {link.logoSrc ? (
                        <img
                          className="nav-link-logo"
                          src={link.logoSrc}
                          alt=""
                          aria-hidden="true"
                        />
                      ) : null}
                      <span>{link.label}</span>
                    </NavLink>
                  ),
                )}
              </div>
            </nav>
            <div className="top-tools">
              {isAdminLoggedIn || isMemberLoggedIn ? null : <DownloadAppLink />}
              {authControl}
              <button
                className={open ? "menu-toggle is-open" : "menu-toggle"}
                type="button"
                aria-expanded={open}
                aria-controls="menu-principale"
                onClick={() => setOpen((value) => !value)}
              >
                <span className="menu-toggle-label">{open ? "Chiudi menu" : "Apri menu"}</span>
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="page">
        <main id="contenuto">{children}</main>
      </div>
      <SiteFooter />
    </div>
  );
}
