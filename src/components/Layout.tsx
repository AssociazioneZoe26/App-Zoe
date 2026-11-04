import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { activityFilters } from "../data";

type LayoutVariant = "site" | "academy";

type SiteLink = {
  label: string;
  to: string;
  children?: { label: string; to: string }[];
};

const siteLinks: SiteLink[] = [
  { label: "Chi siamo", to: "/chi-siamo" },
  { label: "Zoe Academy", to: "/academy" },
  { label: "Squadra Robotica", to: "/squadra-robotica" },
  {
    label: "Progetti",
    to: "/progetti/scuole",
    children: [
      { label: "Scuole", to: "/progetti/scuole" },
      { label: "Comuni", to: "/progetti/comuni" },
      { label: "Gite", to: "/progetti/gite" },
    ],
  },
  { label: "Carta docente", to: "/carta-docente" },
];

const academyLinks = [
  ...activityFilters.map((filter) => ({
    label: filter.label,
    to: filter.id === "tutte" ? "/academy#catalogo" : `/academy?tipo=${filter.id}#catalogo`,
    tipo: filter.id as string | undefined,
  })),
  { label: "Contatti", to: "/academy#contatti", tipo: undefined },
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
  const tipo = params.get("tipo");
  const [open, setOpen] = useState(false);
  const [progettiOpen, setProgettiOpen] = useState(false);
  const isAcademy = variant === "academy";
  const needsAnchorPad = isAcademy && location.pathname === "/academy";

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
              <Link className="nav-signin" to="/accedi">
                Accedi
              </Link>
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
              <Link
                to="/academy"
                className="brand brand-academy"
                aria-label="Zoe Academy, vai alle attività"
              >
                <img src="/brand/academy-emblem.png" alt="Zoe Academy" />
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
                      className={({ isActive }) => (isActive ? "is-current" : undefined)}
                    >
                      {link.label}
                    </NavLink>
                  ),
                )}
              </div>
            </nav>
            <div className="top-tools">
              <Link className="nav-download" to="/scarica-app">
                Scarica l’app
                <span className="nav-download-arrow" aria-hidden="true">
                  ↓
                </span>
              </Link>
              <Link className="nav-signin" to="/accedi">
                Accedi
              </Link>
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

      <div className={needsAnchorPad ? "page page-anchor" : "page"}>
        <main id="contenuto">{children}</main>
        <footer className="footer">
          <div className="footer-col footer-brand">
            <Link to="/" className="footer-logo footer-logo-zoe" aria-label="Zoe">
              <img src="/brand/zoe-logo-white.png" alt="Zoe" />
            </Link>
            <Link to="/academy" className="footer-logo footer-logo-academy" aria-label="Zoe Academy">
              <img src="/brand/academy-emblem.png" alt="Zoe Academy" />
            </Link>
          </div>

          <div className="footer-col footer-nav">
            <nav className="footer-links" aria-label="Link sito">
              {isAcademy
                ? academyLinks.slice(0, Math.ceil(academyLinks.length / 2)).map((link) => (
                    <Link key={link.label} to={link.to}>
                      {link.label}
                    </Link>
                  ))
                : siteLinks
                    .filter((link) =>
                      ["Chi siamo", "Zoe Academy", "Squadra Robotica"].includes(link.label),
                    )
                    .map((link) => (
                      <Link key={link.to} to={link.to}>
                        {link.label}
                      </Link>
                    ))}
            </nav>
          </div>

          <div className="footer-col footer-nav">
            <nav className="footer-links" aria-label="Link progetti">
              {isAcademy
                ? academyLinks.slice(Math.ceil(academyLinks.length / 2)).map((link) => (
                    <Link key={link.label} to={link.to}>
                      {link.label}
                    </Link>
                  ))
                : siteLinks
                    .filter((link) => ["Progetti", "Carta docente"].includes(link.label))
                    .flatMap((link) =>
                      link.children
                        ? [
                            <Link key={`footer-${link.label}`} to={link.to}>
                              {link.label}
                            </Link>,
                            ...link.children.map((child) => (
                              <Link key={`footer-${child.label}`} to={child.to}>
                                {child.label}
                              </Link>
                            )),
                          ]
                        : [
                            <Link key={`footer-${link.label}`} to={link.to}>
                              {link.label}
                            </Link>,
                          ],
                    )}
            </nav>
          </div>

          <div className="footer-col footer-contacts">
            <p>Via Li Punti 12, davanti alle Poste, strada interna</p>
            <p>
              <a href="mailto:info@associazionezoe.org">info@associazionezoe.org</a>
            </p>
            <p>
              <a href="tel:+393473814081">347 3814081</a>
            </p>
          </div>

          <div className="footer-col footer-social-col">
            <ul className="footer-social" aria-label="Social">
              <li>
                <a
                  href="https://www.facebook.com/Zoe.talenti.corsi.eventi.progetti"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 9h3V6h-3c-1.9 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.5l.5-3H14V9z" />
                  </svg>
                </a>
              </li>
              <li>
                <a href="#" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm6.2-.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1zM12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5z" />
                  </svg>
                </a>
              </li>
              <li>
                <a href="#" aria-label="YouTube">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22 12.2c0-2.2-.2-3.7-.5-4.6-.3-.9-.9-1.5-1.7-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4c-.8.3-1.4.9-1.7 1.8-.3.9-.5 2.4-.5 4.6s.2 3.7.5 4.6c.3.9.9 1.5 1.7 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.8-.3 1.4-.9 1.7-1.8.3-.9.5-2.4.5-4.6zM10 15.2V9.2l5.2 3-5.2 3z" />
                  </svg>
                </a>
              </li>
              <li>
                <a href="#" aria-label="TikTok">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14.5 3c.4 2.2 1.7 3.8 3.8 4.3v2.5c-1.3 0-2.5-.4-3.6-1.1v6.2c0 3.2-2.5 5.6-5.7 5.6S3.3 18.1 3.3 14.9s2.5-5.6 5.7-5.6c.3 0 .6 0 .9.1v2.7c-.3-.1-.5-.1-.8-.1-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.8-1.3 2.8-2.9V3h2.6z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
