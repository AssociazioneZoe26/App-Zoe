import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../admin/AuthContext";
import { getSupabase, getSupabaseFunctionsUrl, isSupabaseConfigured } from "../../lib/supabase";

type SubscriberRow = {
  id: string;
  full_name: string;
  email: string;
  source: string;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
};

type ProductMini = {
  id: string;
  title: string;
  kind: string;
  slug: string;
  schedule: string | null;
  time_label: string | null;
  place: string | null;
  preview_image: string | null;
  published: boolean;
};

type IssueRow = {
  id: string;
  period_start: string;
  period_end: string;
  subject: string;
  status: string;
  recipient_count: number;
  created_at: string;
};

function sourceLabel(source: string) {
  if (source === "member_signup") return "Iscrizione socio";
  if (source === "contacts_page") return "Pagina contatti";
  return "Banner sito";
}

function kindLabel(kind: string) {
  if (kind === "laboratorio") return "Laboratorio";
  if (kind === "workshop") return "Workshop";
  if (kind === "online") return "Online";
  return "Corso";
}

function emailLooksValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AdminNewsletterPage() {
  const { accessToken } = useAdminAuth();
  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [courses, setCourses] = useState<ProductMini[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"draft" | "test" | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setError("");
    const supabase = getSupabase();
    const [subs, products, drafts] = await Promise.all([
      supabase
        .from("newsletter_subscribers")
        .select("id, full_name, email, source, created_at, confirmed_at, unsubscribed_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("id, title, kind, slug, schedule, time_label, place, preview_image, published")
        .eq("published", true)
        .order("title"),
      supabase
        .from("newsletter_issues")
        .select("id, period_start, period_end, subject, status, recipient_count, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    if (subs.error) {
      setError(subs.error.message);
      return;
    }
    setRows((subs.data as SubscriberRow[]) ?? []);
    setCourses((products.data as ProductMini[]) ?? []);
    setIssues((drafts.data as IssueRow[]) ?? []);
  }, []);

  useEffect(() => {
    document.title = "Newsletter · Admin Zoe";
    void load();
  }, [load]);

  const mailing = rows.filter((row) => row.confirmed_at && !row.unsubscribed_at);
  const pending = rows.filter((row) => !row.confirmed_at && !row.unsubscribed_at);

  async function saveDraft() {
    if (!accessToken) {
      setError("Sessione admin non valida.");
      return;
    }
    setBusy("draft");
    setError("");
    setNote("");
    try {
      const res = await fetch(`${getSupabaseFunctionsUrl()}/newsletter-digest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "save_draft" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Salvataggio bozza non riuscito.");
      } else {
        setNote(
          `Bozza salvata: ${body.recipientCount ?? 0} destinatari, ${
            body.courses?.length ?? 0
          } corsi. ${body.note ?? ""}`,
        );
        await load();
      }
    } catch {
      setError("Errore di rete.");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    if (!accessToken) {
      setError("Sessione admin non valida.");
      return;
    }
    const email = testEmail.trim().toLowerCase();
    if (!emailLooksValid(email)) {
      setError("Inserisci un’email valida per il test.");
      return;
    }
    setBusy("test");
    setError("");
    setNote("");
    try {
      const res = await fetch(`${getSupabaseFunctionsUrl()}/newsletter-digest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "send_test", toEmail: email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(
          body.error === "mail_not_configured"
            ? "Invio email non ancora configurato."
            : "Invio test non riuscito. Riprova tra poco.",
        );
      } else {
        setNote(`Test inviato a ${email}. Controlla anche Spam.`);
      }
    } catch {
      setError("Errore di rete.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="admin-panel admin-newsletter">
      <header className="admin-newsletter-intro">
        <p className="eyebrow eyebrow-red">Comunicazioni</p>
        <h1>Newsletter</h1>
        <p className="lede">
          Unica lista: iscrizioni dal sito e soci che in registrazione accettano la newsletter.
          L’email di conferma parte da info@associazionezoe.org. Il riepilogo corsi ogni due
          settimane si può salvare in bozza; l’invio automatico resta spento.
        </p>
      </header>

      {error ? <p className="admin-form-error">{error}</p> : null}
      {note ? <p className="admin-form-note">{note}</p> : null}

      <ul className="admin-cards admin-newsletter-stats">
        <li>
          <h2>{mailing.length} in lista</h2>
          <p>Confermati, pronti per il riepilogo bisettimanale.</p>
        </li>
        <li>
          <h2>{pending.length} in attesa</h2>
          <p>Hanno lasciato l’email ma non hanno ancora cliccato il link di conferma.</p>
        </li>
        <li>
          <h2>{courses.length} corsi attivi</h2>
          <p>Quelli pubblicati in catalogo entreranno nella prossima newsletter.</p>
        </li>
      </ul>

      <section className="admin-newsletter-block">
        <h2 className="admin-subhead">Prossimo riepilogo</h2>
        {courses.length === 0 ? (
          <p className="admin-empty">Nessun corso pubblicato. Pubblica dal catalogo per riempire la bozza.</p>
        ) : (
          <ul className="admin-table">
            {courses.map((course) => (
              <li key={course.id} className="admin-newsletter-course">
                {course.preview_image ? (
                  <img
                    className="admin-newsletter-locandina"
                    src={course.preview_image}
                    alt=""
                  />
                ) : (
                  <div className="admin-newsletter-locandina is-empty" aria-hidden="true" />
                )}
                <div className="admin-table-main">
                  <strong>{course.title}</strong>
                  <span>
                    {kindLabel(course.kind)}
                    {course.schedule ? ` · ${course.schedule}` : ""}
                    {course.time_label ? ` · ${course.time_label}` : ""}
                    {course.place ? ` · ${course.place}` : ""}
                  </span>
                </div>
                <div className="admin-table-actions">
                  <Link to={`/attivita/${course.slug}`}>Scheda</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="admin-newsletter-actions">
          <button
            type="button"
            className="admin-submit"
            disabled={busy !== null}
            onClick={() => void saveDraft()}
          >
            {busy === "draft" ? "Salvataggio…" : "Salva bozza riepilogo"}
          </button>
          <form
            className="admin-newsletter-test"
            onSubmit={(event) => {
              event.preventDefault();
              void sendTest();
            }}
          >
            <label className="admin-newsletter-test-field">
              <span>Invia test a</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="es. info@associazionezoe.org"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                required
              />
            </label>
            <button type="submit" className="admin-submit" disabled={busy !== null}>
              {busy === "test" ? "Invio…" : "Invia test"}
            </button>
          </form>
        </div>
      </section>

      {issues.length > 0 ? (
        <section className="admin-newsletter-block">
          <h2 className="admin-subhead">Bozze salvate</h2>
          <ul className="admin-table">
            {issues.map((issue) => (
              <li key={issue.id}>
                <div className="admin-table-main">
                  <strong>{issue.subject}</strong>
                  <span>
                    {issue.period_start} – {issue.period_end} · {issue.status} ·{" "}
                    {issue.recipient_count} destinatari
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="admin-newsletter-block">
        <h2 className="admin-subhead">Iscritti</h2>
        {rows.length === 0 ? (
          <p className="admin-empty">Ancora nessuna iscrizione.</p>
        ) : (
          <ul className="admin-table">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="admin-table-main">
                  <strong>{row.full_name}</strong>
                  <span>
                    {row.email}
                    {emailLooksValid(row.email) ? "" : " · email da verificare"} ·{" "}
                    {sourceLabel(row.source)} ·{" "}
                    {row.unsubscribed_at
                      ? "disiscritto"
                      : row.confirmed_at
                        ? "confermato"
                        : "in attesa di conferma"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
