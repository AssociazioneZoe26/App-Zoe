import { Link } from "react-router-dom";
import { siteLinks } from "../content/siteNav";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
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
            {siteLinks
              .filter((link) =>
                ["Zoe Academy", "Squadra di robotica", "Chi siamo", "Contatti"].includes(
                  link.label,
                ),
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
            {siteLinks
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
          <p className="footer-legal">
            <Link to="/privacy">Privacy</Link>
            {" · "}
            <Link to="/termini">Termini</Link>
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
      </div>
    </footer>
  );
}
