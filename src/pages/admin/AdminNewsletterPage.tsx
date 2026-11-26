import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
  age: string | null;
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

function courseMeta(course: ProductMini) {
  const when = [course.schedule, course.time_label].filter(Boolean).join(" · ");
  return [kindLabel(course.kind), course.age, when, course.place].filter(Boolean).join(" · ");
}

function digestWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 13);
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

function buildGeneratedLetter(courses: ProductMini[]) {
  const { periodStart, periodEnd } = digestWindow();
  const origin = window.location.origin;
  const lines = courses.flatMap((course) => [
    course.title,
    courseMeta(course),
    `${origin}/attivita/${course.slug}`,
    "",
  ]);
  return {
    subject: `Zoe · corsi attivi ${periodStart} – ${periodEnd}`,
    text: [
      "Ciao,",
      "",
      "ecco i corsi e i laboratori attivi di Associazione Zoe per le prossime due settimane:",
      "",
      ...lines,
      "A presto,",
      "Team Zoe",
      "info@associazionezoe.org",
    ].join("\n"),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type DraftImage = {
  id: string;
  name: string;
  dataUrl: string;
};

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Lettura immagine non riuscita."));
    reader.readAsDataURL(file);
  });
}

async function uploadNewsletterImage(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Formato immagine non riconosciuto.");
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : "jpg";
  const path = `newsletter/${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("site-media").upload(path, bytes, {
    contentType: mime,
  });
  if (error) throw new Error(error.message);
  const url = supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
  if (!url) throw new Error("Indirizzo immagine non disponibile.");
  return url;
}

export function AdminNewsletterPage() {
  const { accessToken } = useAdminAuth();
  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [courses, setCourses] = useState<ProductMini[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeMode, setComposeMode] = useState<"images" | "courses">("images");
  const [composeImages, setComposeImages] = useState<DraftImage[]>([]);
  const [pickedCourseIds, setPickedCourseIds] = useState<string[]>([]);

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
        .select("id, title, kind, slug, age, schedule, time_label, place, preview_image, published")
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

  const localLetter = useMemo(() => buildGeneratedLetter(courses), [courses]);

  const loadPreview = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${getSupabaseFunctionsUrl()}/newsletter-digest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "preview" }),
      });
      const body = await res.json();
      if (res.ok && typeof body.text === "string" && body.text.trim()) {
        setGeneratedSubject(typeof body.subject === "string" ? body.subject : "");
        setGeneratedText(body.text);
      }
    } catch {
      // Il testo locale resta visibile.
    }
  }, [accessToken]);

  useEffect(() => {
    document.title = "Newsletter · Admin Zoe";
    void load();
  }, [load]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

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
        if (typeof body.text === "string") setGeneratedText(body.text);
        if (typeof body.subject === "string") setGeneratedSubject(body.subject);
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

  function toggleCourse(id: string) {
    setPickedCourseIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onPickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: DraftImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await readImageFile(file);
      next.push({ id: crypto.randomUUID(), name: file.name, dataUrl });
    }
    setComposeImages((current) => [...current, ...next]);
  }

  async function saveNewsletter(event: FormEvent) {
    event.preventDefault();
    const subject = composeTitle.trim();
    const content = composeBody.trim();
    if (subject.length < 2) {
      setError("Scrivi un titolo o un oggetto.");
      return;
    }
    if (content.length < 2) {
      setError("Scrivi il contenuto della newsletter.");
      return;
    }
    const picked = courses.filter((course) => pickedCourseIds.includes(course.id));
    if (composeMode === "courses" && picked.length === 0) {
      setError("Seleziona almeno un corso attivo, oppure passa al caricamento immagini.");
      return;
    }
    if (composeMode === "images" && composeImages.length === 0) {
      setError("Carica almeno un’immagine, oppure seleziona i corsi attivi.");
      return;
    }

    setBusy("compose");
    setError("");
    setNote("");
    try {
      const imageUrls =
        composeMode === "images"
          ? await Promise.all(composeImages.map((image) => uploadNewsletterImage(image.dataUrl)))
          : [];
      const origin = window.location.origin;
      const courseLines =
        composeMode === "courses"
          ? picked.flatMap((course) => [
              course.title,
              courseMeta(course),
              `${origin}/attivita/${course.slug}`,
              "",
            ])
          : [];
      const text = [content, "", ...courseLines, ...imageUrls.map((url) => url)].join("\n").trim();
      const courseHtml =
        composeMode === "courses"
          ? picked
              .map((course) => {
                const poster = course.preview_image
                  ? `<img src="${escapeHtml(course.preview_image)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:14px;margin:0 0 8px;" />`
                  : "";
                return `<div style="margin:16px 0 0;">${poster}<p style="margin:0;"><strong>${escapeHtml(course.title)}</strong><br/>${escapeHtml(courseMeta(course))}<br/><a href="${escapeHtml(`${origin}/attivita/${course.slug}`)}">Scheda</a></p></div>`;
              })
              .join("")
          : "";
      const imageHtml = imageUrls
        .map(
          (url) =>
            `<img src="${escapeHtml(url)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:14px;margin:16px 0 0;" />`,
        )
        .join("");
      const html = `<h1>${escapeHtml(subject)}</h1>${content
        .split(/\n{2,}/)
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
        .join("")}${courseHtml}${imageHtml}`;
      const today = new Date().toISOString().slice(0, 10);
      const { error: saveError } = await getSupabase().from("newsletter_issues").insert({
        period_start: today,
        period_end: today,
        subject,
        html,
        text_body: text,
        product_ids: composeMode === "courses" ? picked.map((course) => course.id) : [],
        recipient_count: mailing.length,
        status: "draft",
        send_enabled: false,
      });
      if (saveError) {
        setError(saveError.message);
        return;
      }
      setComposeTitle("");
      setComposeBody("");
      setComposeImages([]);
      setPickedCourseIds([]);
      setNote("Newsletter salvata. In Bozze salvate puoi inviare un test e poi mandarla alla lista.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(null);
    }
  }

  function mailError(code: string) {
    if (code === "mail_not_configured") return "Invio email non ancora configurato.";
    if (code === "already_sent") return "Questa newsletter è già stata inviata.";
    if (code === "no_recipients") return "Nessun iscritto confermato a cui inviarla.";
    if (code === "email_required") return "Inserisci un’email valida per il test.";
    return "Invio non riuscito. Riprova tra poco.";
  }

  async function sendSavedIssue(issue: IssueRow, mode: "test" | "list") {
    if (!accessToken) {
      setError("Sessione admin non valida.");
      return;
    }
    const email = testEmail.trim().toLowerCase();
    if (mode === "test" && !emailLooksValid(email)) {
      setError("Inserisci un’email valida per il test, nel campo accanto a Invia test.");
      return;
    }
    if (mode === "list") {
      const confirmed = window.confirm(
        `Inviare «${issue.subject}» a ${mailing.length} iscritti confermati?`,
      );
      if (!confirmed) return;
    }
    setBusy(mode === "test" ? `test:${issue.id}` : `send:${issue.id}`);
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
        body: JSON.stringify({
          action: mode === "test" ? "send_issue_test" : "send_issue",
          issueId: issue.id,
          toEmail: email,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(mailError(String(body.error || "")));
        return;
      }
      if (mode === "test") {
        setNote(`Test di «${issue.subject}» inviato a ${email}. Controlla anche Spam.`);
      } else {
        const failed = Array.isArray(body.failed) ? body.failed.length : 0;
        setNote(
          failed
            ? `Inviata a ${body.sentCount ?? 0} iscritti. ${failed} indirizzi non sono partiti.`
            : `Newsletter inviata a ${body.sentCount ?? mailing.length} iscritti.`,
        );
        await load();
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
        <label className="admin-newsletter-generated">
          <span>Testo generato</span>
          <small>Oggetto: {generatedSubject || localLetter.subject}</small>
          <textarea
            readOnly
            rows={12}
            value={generatedText || localLetter.text}
            aria-label="Testo generato della newsletter"
          />
        </label>
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
              {busy === "test" ? "Invio…" : "Invia test riepilogo"}
            </button>
          </form>
        </div>
      </section>

      <section className="admin-newsletter-block">
        <h2 className="admin-subhead">Nuova newsletter</h2>
        <p className="admin-newsletter-hint">
          Scrivi titolo e contenuto. Poi carica delle immagini, oppure scegli i corsi attivi da
          includere.
        </p>
        <form className="admin-form admin-newsletter-compose" onSubmit={(event) => void saveNewsletter(event)}>
          <label>
            Titolo / oggetto
            <input
              type="text"
              value={composeTitle}
              onChange={(event) => setComposeTitle(event.target.value)}
              placeholder="Es. Novità di novembre"
              required
            />
          </label>
          <label>
            Contenuto
            <textarea
              rows={8}
              value={composeBody}
              onChange={(event) => setComposeBody(event.target.value)}
              placeholder="Il testo della newsletter"
              required
            />
          </label>
          <fieldset className="admin-newsletter-material">
            <legend>Aggiungi</legend>
            <div className="admin-newsletter-choice">
              <label>
                <input
                  type="radio"
                  name="newsletter-material"
                  checked={composeMode === "images"}
                  onChange={() => setComposeMode("images")}
                />
                Carica immagini
              </label>
              <label>
                <input
                  type="radio"
                  name="newsletter-material"
                  checked={composeMode === "courses"}
                  onChange={() => setComposeMode("courses")}
                />
                Seleziona corsi attivi
              </label>
            </div>
            {composeMode === "images" ? (
              <div className="admin-newsletter-uploads">
                <label className="admin-newsletter-file">
                  Immagini
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void onPickImages(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                {composeImages.length > 0 ? (
                  <ul>
                    {composeImages.map((image) => (
                      <li key={image.id}>
                        <img src={image.dataUrl} alt="" />
                        <span>{image.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setComposeImages((current) =>
                              current.filter((item) => item.id !== image.id),
                            )
                          }
                        >
                          Rimuovi
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Nessuna immagine caricata.</p>
                )}
              </div>
            ) : courses.length === 0 ? (
              <p>Nessun corso pubblicato da selezionare.</p>
            ) : (
              <ul className="admin-newsletter-picks">
                {courses.map((course) => (
                  <li key={course.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={pickedCourseIds.includes(course.id)}
                        onChange={() => toggleCourse(course.id)}
                      />
                      {course.preview_image ? (
                        <img src={course.preview_image} alt="" />
                      ) : (
                        <span className="admin-newsletter-locandina is-empty" aria-hidden="true" />
                      )}
                      <span>
                        <strong>{course.title}</strong>
                        <small>{courseMeta(course)}</small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          <button type="submit" className="admin-submit" disabled={busy !== null}>
            {busy === "compose" ? "Salvataggio…" : "Salva newsletter"}
          </button>
        </form>
      </section>

      {issues.length > 0 ? (
        <section className="admin-newsletter-block">
          <h2 className="admin-subhead">Bozze salvate</h2>
          <p className="admin-newsletter-hint">
            Prima «Invia test» alla tua email. Se il messaggio va bene, «Invia alla lista» la manda
            agli iscritti confermati.
          </p>
          <label className="admin-newsletter-test-field">
            <span>Email per il test</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="es. info@associazionezoe.org"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
            />
          </label>
          <ul className="admin-table">
            {issues.map((issue) => (
              <li key={issue.id} className="admin-newsletter-issue">
                <div className="admin-table-main">
                  <strong>{issue.subject}</strong>
                  <span>
                    {issue.period_start} – {issue.period_end} ·{" "}
                    {issue.status === "sent" ? "inviata" : "bozza"} · {issue.recipient_count}{" "}
                    destinatari
                  </span>
                </div>
                <div className="admin-newsletter-issue-actions">
                  <button
                    type="button"
                    className="admin-secondary"
                    disabled={busy !== null}
                    onClick={() => void sendSavedIssue(issue, "test")}
                  >
                    {busy === `test:${issue.id}` ? "Invio…" : "Invia test"}
                  </button>
                  {issue.status === "sent" ? null : (
                    <button
                      type="button"
                      className="admin-submit"
                      disabled={busy !== null}
                      onClick={() => void sendSavedIssue(issue, "list")}
                    >
                      {busy === `send:${issue.id}` ? "Invio…" : "Invia alla lista"}
                    </button>
                  )}
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
