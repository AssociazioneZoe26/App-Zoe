import { useEffect, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { whatsappChannel } from "../data";
import {
  isNewsletterPopupDismissed,
  isNewsletterSubscribedLocally,
  markNewsletterPopupDismissed,
  subscribeToNewsletter,
} from "../lib/newsletter";

const MINIMIZED_KEY = "zoe-newsletter-minimized";

export function NewsletterBanner() {
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (isNewsletterSubscribedLocally() || isNewsletterPopupDismissed()) {
        setVisible(false);
        return;
      }
      setMinimized(sessionStorage.getItem(MINIMIZED_KEY) === "1");
    } catch {
      // ignore
    }
    setVisible(true);
  }, []);

  function setMinimizedState(next: boolean) {
    setMinimized(next);
    try {
      sessionStorage.setItem(MINIMIZED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function dismissPopup() {
    markNewsletterPopupDismissed();
    setVisible(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fullName = name.trim();
    const mail = email.trim().toLowerCase();
    if (fullName.length < 2) {
      setError("Inserisci il tuo nome.");
      return;
    }
    if (!mail.includes("@")) {
      setError("Inserisci un’email valida.");
      return;
    }
    if (!privacyAccepted) {
      setError("Per iscriverti accetta l’informativa privacy.");
      return;
    }

    setBusy(true);
    const result = await subscribeToNewsletter({
      fullName,
      email: mail,
      source: "home_banner",
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    markNewsletterPopupDismissed();
    setDone(true);
  }

  if (!visible) return null;

  if (minimized) {
    return (
      <div className="newsletter-dock newsletter-dock-min">
        <button
          type="button"
          className="newsletter-dock-tab"
          onClick={() => setMinimizedState(false)}
          aria-expanded={false}
        >
          Newsletter
        </button>
      </div>
    );
  }

  return (
    <aside
      className="newsletter-dock"
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="false"
    >
      <div className="newsletter-dock-panel">
        <div className="newsletter-dock-actions">
          <button
            type="button"
            className="newsletter-popup-close"
            aria-label="Minimizza"
            onClick={() => setMinimizedState(true)}
          >
            −
          </button>
          <button
            type="button"
            className="newsletter-popup-close"
            aria-label="Chiudi"
            onClick={dismissPopup}
          >
            ×
          </button>
        </div>

        <div className="newsletter-banner-copy">
          <h2 id={titleId}>
            Iscriviti alla{" "}
            <span className="newsletter-title-accent">Newsletter</span> Zoe
          </h2>
        </div>

        {done ? (
          <div className="newsletter-banner-thanks" role="status">
            <p>
              Ti abbiamo inviato un’email da info@associazionezoe.org. Apri il link per confermare.
            </p>
            <div className="newsletter-page-actions">
              <button type="button" className="newsletter-dismiss" onClick={dismissPopup}>
                Chiudi
              </button>
              <a
                className="newsletter-whatsapp-btn"
                href={whatsappChannel}
                target="_blank"
                rel="noreferrer"
              >
                Canale WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <form className="newsletter-banner-form" onSubmit={onSubmit}>
            <label className="newsletter-field">
              <span className="newsletter-field-label">Nome</span>
              <input
                name="name"
                autoComplete="name"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="newsletter-field">
              <span className="newsletter-field-label">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="newsletter-privacy">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                required
              />
              <span>
                Accetto la{" "}
                <Link to="/privacy" target="_blank" rel="noreferrer">
                  privacy
                </Link>
              </span>
            </label>
            {error ? <p className="newsletter-error">{error}</p> : null}
            <div className="newsletter-page-actions">
              <button type="submit" className="newsletter-submit" disabled={busy}>
                {busy ? "Invio…" : "Iscriviti"}
              </button>
              <a
                className="newsletter-whatsapp-btn"
                href={whatsappChannel}
                target="_blank"
                rel="noreferrer"
              >
                Canale WhatsApp
              </a>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}
