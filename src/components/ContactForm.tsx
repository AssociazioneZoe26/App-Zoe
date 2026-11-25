import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fullName = name.trim();
    const mail = email.trim().toLowerCase();
    const body = message.trim();
    if (fullName.length < 2) {
      setError("Inserisci il tuo nome.");
      return;
    }
    if (!mail.includes("@")) {
      setError("Inserisci un’email valida.");
      return;
    }
    if (body.length < 10) {
      setError("Scrivi un messaggio un po’ più lungo.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Invio non disponibile al momento.");
      return;
    }

    setBusy(true);
    const { error: insertError } = await getSupabase().from("contact_messages").insert({
      full_name: fullName,
      email: mail,
      message: body,
    });
    setBusy(false);

    if (insertError) {
      setError("Invio non riuscito. Riprova tra poco o scrivici via email.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="contact-form-thanks" role="status">
        Messaggio inviato. Ti risponderemo al più presto.
      </p>
    );
  }

  return (
    <form className="contact-form" onSubmit={(event) => void onSubmit(event)}>
      <label>
        Nome
        <input
          name="name"
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
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Messaggio
        <textarea
          name="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </label>
      <p className="contact-form-privacy">
        Inviando accetti l’
        <Link to="/privacy">informativa privacy</Link>.
      </p>
      {error ? <p className="newsletter-error">{error}</p> : null}
      <button type="submit" className="newsletter-submit" disabled={busy}>
        {busy ? "Invio…" : "Invia messaggio"}
      </button>
    </form>
  );
}
