import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { whatsappChannel } from "../data";
import { subscribeToNewsletter } from "../lib/newsletter";

export function NewsletterSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!privacyAccepted) {
      setError("Per iscriverti accetta l’informativa privacy.");
      return;
    }
    setBusy(true);
    const result = await subscribeToNewsletter({
      fullName: name,
      email,
      source: "contacts_page",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <section className="newsletter-page-block" id="newsletter">
      <p className="eyebrow eyebrow-red">Newsletter</p>
      <h2>
        Iscriviti alla <span className="newsletter-title-accent">Newsletter</span> Zoe
      </h2>
      <p className="lede">Ogni due settimane novità, laboratori e iniziative dell’associazione.</p>

      {done ? (
        <div className="newsletter-page-done">
          <p className="contact-form-thanks" role="status">
            Ti abbiamo inviato un’email da info@associazionezoe.org. Apri il link per confermare.
          </p>
          <a
            className="newsletter-whatsapp-btn"
            href={whatsappChannel}
            target="_blank"
            rel="noreferrer"
          >
            Canale WhatsApp
          </a>
        </div>
      ) : (
        <form className="contact-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Nome
            <input
              name="newsletter-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="newsletter-email"
              autoComplete="email"
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
    </section>
  );
}
