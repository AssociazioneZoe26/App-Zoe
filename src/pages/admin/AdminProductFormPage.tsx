import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getProduct, saveProductAndSync } from "../../admin/catalogStore";
import {
  catalogKindOptions,
  inferProductOffer,
  priceForOffer,
  pricesForOffer,
  type CatalogKind,
  type CatalogProduct,
  type CourseLesson,
  type ProductOffer,
} from "../../admin/catalogTypes";
import {
  DEFAULT_PREVIEW_SECONDS,
  MAX_COURSE_LESSONS,
  normalizeLessons,
} from "../../lib/courseVideo";

const emptyLesson = (): CourseLesson => ({ title: "", url: "" });

const emptyForm = {
  title: "",
  eyebrow: "",
  age: "",
  kind: "corso" as CatalogKind,
  audience: "Bambini" as CatalogProduct["audience"],
  accent: "blue" as CatalogProduct["accent"],
  published: false,
  previewImage: "",
  previewText: "",
  fullText: "",
  pointsText: "",
  mantra: "",
  schedule: "",
  time: "",
  sessions: "",
  place: "Via Li Punti 12, Sassari",
  teacher: "",
  coursePreviewVideoUrl: "",
  coursePreviewSeconds: String(DEFAULT_PREVIEW_SECONDS),
  courseVideoUrl: "",
  courseLessons: [emptyLesson(), emptyLesson()] as CourseLesson[],
  courseDuration: "",
  startsOn: "",
  endsOn: "",
  offer: "packs" as ProductOffer,
  price: "",
  pricePack4: "",
  pricePack8: "",
  priceMonthly: "",
};

function priceToField(value: number | undefined) {
  return value != null && !Number.isNaN(value) ? String(value) : "";
}

function fieldToPrice(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

type SaveMode = "draft" | "publish";

export function AdminProductFormPage() {
  const { id } = useParams();
  const isNew = !id || id === "nuovo";
  const existing = useMemo(() => (isNew || !id ? null : getProduct(id)), [id, isNew]);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    document.title = isNew ? "Nuovo prodotto · Admin Zoe" : "Modifica prodotto · Admin Zoe";
  }, [isNew]);

  useEffect(() => {
    if (!existing) {
      setForm(emptyForm);
      return;
    }
    setForm({
      title: existing.title,
      eyebrow: existing.eyebrow,
      age: existing.age,
      kind: existing.kind,
      audience: existing.audience,
      accent: existing.accent,
      published: existing.published,
      previewImage: existing.previewImage,
      previewText: "",
      // Migra l’ex sommario nella descrizione se la completa è vuota
      fullText: existing.fullText.trim() || existing.previewText.trim(),
      pointsText: existing.points.join("\n"),
      mantra: existing.mantra,
      schedule: existing.schedule || "",
      time: existing.time || "",
      sessions: existing.sessions || "",
      place: existing.place,
      teacher: existing.teacher || "",
      coursePreviewVideoUrl: existing.coursePreviewVideoUrl || "",
      coursePreviewSeconds: String(
        existing.coursePreviewSeconds && existing.coursePreviewSeconds > 0
          ? existing.coursePreviewSeconds
          : DEFAULT_PREVIEW_SECONDS,
      ),
      courseVideoUrl: existing.courseVideoUrl || "",
      courseLessons: (() => {
        const lessons = normalizeLessons(existing.courseLessons);
        if (lessons.length >= 2) return lessons;
        if (lessons.length === 1) return [...lessons, emptyLesson()];
        return [emptyLesson(), emptyLesson()];
      })(),
      courseDuration: existing.courseDuration || "",
      startsOn: existing.startsOn || "",
      endsOn: existing.endsOn || "",
      offer: inferProductOffer(existing),
      price: priceToField(priceForOffer(existing)),
      pricePack4: priceToField(existing.pricePack5),
      pricePack8: priceToField(existing.pricePack10),
      priceMonthly: priceToField(existing.priceMonthly),
    });
  }, [existing]);

  if (!isNew && !existing) {
    return <Navigate to="/admin/catalogo" replace />;
  }

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Carica un file immagine (JPG, PNG, WebP…).");
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setError("Immagine troppo grande: massimo circa 2,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError("Non riesco a leggere l’immagine.");
        return;
      }
      setError("");
      update("previewImage", result);
      setNotice("Locandina caricata.");
    };
    reader.onerror = () => setError("Errore nel caricamento dell’immagine.");
    reader.readAsDataURL(file);
  }

  async function save(mode: SaveMode) {
    const asDraft = mode === "draft";

    if (!form.title.trim()) {
      setError("Il titolo è obbligatorio.");
      return;
    }
    if (!asDraft && !form.fullText.trim()) {
      setError("Per pubblicare serve la descrizione della scheda.");
      return;
    }
    const accessOffer =
      form.kind === "corso" || form.kind === "online" ? "course" : "packs";
    if (
      !asDraft &&
      accessOffer === "packs" &&
      fieldToPrice(form.pricePack4) == null &&
      fieldToPrice(form.pricePack8) == null &&
      fieldToPrice(form.priceMonthly) == null
    ) {
      setError("Inserisci almeno un prezzo: 4 ingressi, 8 ingressi o abbonamento mensile.");
      return;
    }
    if (!asDraft && (form.kind === "corso" || form.kind === "online")) {
      if (!form.startsOn || !form.endsOn) {
        setError("Per un corso servono la data di inizio e la data di fine.");
        return;
      }
      if (form.endsOn < form.startsOn) {
        setError("La data di fine non può precedere l’inizio.");
        return;
      }
    }

    const lessons = normalizeLessons(form.courseLessons);
    const previewSeconds = Math.min(
      120,
      Math.max(5, Number(form.coursePreviewSeconds) || DEFAULT_PREVIEW_SECONDS),
    );

    if (!asDraft && form.kind === "online") {
      if (!form.coursePreviewVideoUrl.trim()) {
        setError("Per pubblicare un corso online serve l’URL del video anteprima.");
        return;
      }
      if (!form.courseVideoUrl.trim() && lessons.length === 0) {
        setError(
          "Inserisci il video completo oppure almeno una lezione con URL (massimo 10).",
        );
        return;
      }
    }

    setNotice(asDraft ? "Salvataggio online…" : "Pubblicazione online…");
    const { product: saved, syncOk, syncError } = await saveProductAndSync(
      {
        title: form.title.trim(),
        eyebrow: form.eyebrow.trim(),
        age: form.age.trim(),
        kind: form.kind,
        audience: form.audience,
        accent: form.accent,
        published: !asDraft,
        previewImage: form.previewImage.trim(),
        previewText: "",
        fullText: form.fullText.trim(),
        points: form.pointsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        mantra: form.mantra.trim(),
        schedule: form.schedule.trim(),
        time: form.time.trim(),
        sessions: form.sessions.trim(),
        place:
          form.kind === "online"
            ? form.place.trim() || "Online"
            : form.place.trim() || "Via Li Punti 12, Sassari",
        teacher: form.teacher.trim(),
        coursePreviewVideoUrl: form.coursePreviewVideoUrl.trim(),
        coursePreviewSeconds: previewSeconds,
        courseVideoUrl: form.courseVideoUrl.trim(),
        courseLessons: lessons,
        courseDuration: form.courseDuration.trim(),
        startsOn: form.startsOn || undefined,
        endsOn: form.endsOn || undefined,
        ...pricesForOffer(accessOffer, fieldToPrice(form.price), {
          pack4: fieldToPrice(form.pricePack4),
          pack8: fieldToPrice(form.pricePack8),
          monthly: fieldToPrice(form.priceMonthly),
        }),
      },
      existing?.id,
    );

    setError("");
    if (!syncOk) {
      setNotice(
        `Salvato su questo dispositivo, ma non online: ${syncError || "errore sync"}. Riprova.`,
      );
    } else {
      setNotice(
        asDraft
          ? "Bozza salvata e sincronizzata online."
          : "Prodotto pubblicato online: visibile anche da cellulare.",
      );
    }
    setForm((prev) => ({ ...prev, published: !asDraft }));
    navigate(`/admin/catalogo/${saved.id}`, { replace: true });
  }

  const isCourseKind = form.kind === "corso" || form.kind === "online";

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Catalogo</p>
          <h1>{isNew ? "Nuovo prodotto" : "Modifica prodotto"}</h1>
          <p className="lede">
            Compila i campi come nella scheda pubblica. Stato:{" "}
            {form.published ? "Pubblicato" : "Bozza"}
            {existing?.published ? (
              <>
                {" "}
                ·{" "}
                <Link to={`/attivita/${existing.slug}`} target="_blank" rel="noreferrer">
                  Vedi scheda
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <Link className="admin-secondary" to="/admin/catalogo">
          Torna al catalogo
        </Link>
      </div>

      <form
        className="admin-form admin-product-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save("draft");
        }}
      >
        <fieldset>
          <legend>Locandina</legend>
          <label>
            Carica immagine (come in scheda)
            <input type="file" accept="image/*" onChange={onImageUpload} />
          </label>
          {form.previewImage ? (
            <div className="admin-image-preview">
              <img src={form.previewImage} alt="Locandina" />
              <button
                type="button"
                className="admin-secondary"
                onClick={() => update("previewImage", "")}
              >
                Rimuovi locandina
              </button>
            </div>
          ) : null}
          <label>
            Colore scheda / card
            <select
              value={form.accent}
              onChange={(event) =>
                update("accent", event.target.value as CatalogProduct["accent"])
              }
            >
              <option value="blue">Blu</option>
              <option value="yellow">Giallo</option>
              <option value="teal">Teal</option>
              <option value="pink">Rosa</option>
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>Testi in scheda</legend>
          <label>
            Tipo prodotto
            <select
              value={form.kind}
              onChange={(event) => {
                const kind = event.target.value as CatalogKind;
                setForm((prev) => ({
                  ...prev,
                  kind,
                  offer:
                    kind === "corso" || kind === "online"
                      ? "course"
                      : prev.offer === "course"
                        ? "packs"
                        : prev.offer,
                }));
              }}
            >
              {catalogKindOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etichetta (sopra il titolo)
            <input
              value={form.eyebrow}
              onChange={(event) => update("eyebrow", event.target.value)}
              placeholder="Es. Costruzioni, Spike Essential…"
            />
          </label>
          <label>
            Titolo
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              required
              placeholder="Es. Laboratori LEGO 5–12 anni"
            />
          </label>
          <label>
            Mantra
            <input
              value={form.mantra}
              onChange={(event) => update("mantra", event.target.value)}
              placeholder="Es. Costruisci, immagina, impara"
            />
          </label>
          <label>
            Descrizione
            <textarea
              rows={6}
              value={form.fullText}
              onChange={(event) => update("fullText", event.target.value)}
              placeholder="Testo principale della scheda prodotto"
            />
          </label>
          {form.kind !== "online" ? (
            <p className="admin-form-note">
              Per anteprima e lezioni video imposta <strong>Tipo = Online</strong> qui sopra.
            </p>
          ) : null}
          <label>
            Punti (uno per riga, come elenco in scheda)
            <textarea
              rows={4}
              value={form.pointsText}
              onChange={(event) => update("pointsText", event.target.value)}
              placeholder={"Creatività, logica e collaborazione\nAttività in sede a Li Punti"}
            />
          </label>
        </fieldset>

        {form.kind === "online" ? (
          <fieldset className="admin-online-video-fieldset">
            <legend>Video corso online</legend>
            <p className="lede">
              Anteprima visibile a tutti. Video completo e/o lezioni (max {MAX_COURSE_LESSONS})
              solo dopo acquisto.
            </p>
            <label>
              URL video anteprima (pubblico)
              <input
                value={form.coursePreviewVideoUrl}
                onChange={(event) => update("coursePreviewVideoUrl", event.target.value)}
                placeholder="https://… oppure /video/anteprima.mp4"
              />
            </label>
            <label>
              Secondi di anteprima
              <input
                type="number"
                min={5}
                max={120}
                step={1}
                value={form.coursePreviewSeconds}
                onChange={(event) => update("coursePreviewSeconds", event.target.value)}
              />
            </label>
            <label>
              URL video corso completo (opzionale se usi le lezioni)
              <input
                value={form.courseVideoUrl}
                onChange={(event) => update("courseVideoUrl", event.target.value)}
                placeholder="https://… oppure /video/corso.mp4"
              />
            </label>
            <div className="admin-lessons">
              <p className="eyebrow eyebrow-red">Lezioni (1–{MAX_COURSE_LESSONS})</p>
              {form.courseLessons.map((lesson, index) => (
                <div key={`lesson-${index}`} className="admin-lesson-row">
                  <label>
                    Lezione {index + 1} · titolo
                    <input
                      value={lesson.title}
                      onChange={(event) => {
                        const next = [...form.courseLessons];
                        next[index] = { ...next[index], title: event.target.value };
                        update("courseLessons", next);
                      }}
                      placeholder={`Lezione ${index + 1}`}
                    />
                  </label>
                  <label>
                    URL video lezione
                    <input
                      value={lesson.url}
                      onChange={(event) => {
                        const next = [...form.courseLessons];
                        next[index] = { ...next[index], url: event.target.value };
                        update("courseLessons", next);
                      }}
                      placeholder="https://… oppure /video/lezione.mp4"
                    />
                  </label>
                  {form.courseLessons.length > 1 ? (
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() =>
                        update(
                          "courseLessons",
                          form.courseLessons.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Rimuovi
                    </button>
                  ) : null}
                </div>
              ))}
              {form.courseLessons.length < MAX_COURSE_LESSONS ? (
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() =>
                    update("courseLessons", [...form.courseLessons, emptyLesson()])
                  }
                >
                  Aggiungi lezione
                </button>
              ) : (
                <p className="fine">Massimo {MAX_COURSE_LESSONS} lezioni.</p>
              )}
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend>
            {isCourseKind ? "Dettagli (Età, Inizio, Fine…)" : "Dettagli (Età, Tipo, Quando…)"}
          </legend>
          <div className="admin-form-row">
            <label>
              Età
              <input
                value={form.age}
                onChange={(event) => update("age", event.target.value)}
                placeholder="Es. 5–12 anni"
              />
            </label>
            <label>
              Destinatari
              <select
                value={form.audience}
                onChange={(event) =>
                  update("audience", event.target.value as CatalogProduct["audience"])
                }
              >
                <option value="Bambini">Bambini</option>
                <option value="Tutti">Tutti</option>
              </select>
            </label>
          </div>
          {isCourseKind ? (
            <>
              <div className="admin-form-row">
                <label>
                  Inizio
                  <input
                    type="date"
                    value={form.startsOn}
                    onChange={(event) => update("startsOn", event.target.value)}
                  />
                </label>
                <label>
                  Fine
                  <input
                    type="date"
                    value={form.endsOn}
                    min={form.startsOn || undefined}
                    onChange={(event) => update("endsOn", event.target.value)}
                  />
                </label>
              </div>
              <p className="admin-form-note">
                Il corso ha un inizio e una fine. Dal giorno dopo la data di fine risulta scaduto
                per il bambino a cui è associato. «Quando» resta solo per i laboratori, per esempio
                tutti i sabati.
              </p>
              {form.kind === "corso" ? (
                <div className="admin-form-row">
                  <label>
                    Numero di incontri
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.sessions.replace(/\D/g, "")}
                      onChange={(event) => update("sessions", event.target.value)}
                      placeholder="Es. 8"
                    />
                  </label>
                  <label>
                    Orario
                    <input
                      value={form.time}
                      onChange={(event) => update("time", event.target.value)}
                      placeholder="Es. 18:15–19:15"
                    />
                  </label>
                </div>
              ) : null}
            </>
          ) : (
            <div className="admin-form-row">
              <label>
                Quando
                <input
                  value={form.schedule}
                  onChange={(event) => update("schedule", event.target.value)}
                  placeholder="Es. Tutti i sabati"
                />
              </label>
              <label>
                Orario
                <input
                  value={form.time}
                  onChange={(event) => update("time", event.target.value)}
                  placeholder="Es. 18:15–19:15"
                />
              </label>
            </div>
          )}
          {form.kind === "online" ? (
            <p className="admin-form-note">
              Nelle schede online non compaiono Dove e Incontri: il numero di{" "}
              <strong>Lezioni</strong> si aggiorna da quante ne inserisci sopra
              {normalizeLessons(form.courseLessons).length > 0
                ? ` (ora ${normalizeLessons(form.courseLessons).length})`
                : ""}
              .
            </p>
          ) : isCourseKind ? (
            <label>
              Dove
              <input
                value={form.place}
                onChange={(event) => update("place", event.target.value)}
                placeholder="Via Li Punti 12, Sassari"
              />
            </label>
          ) : (
            <div className="admin-form-row">
              <label>
                Durata / incontri
                <input
                  value={form.sessions}
                  onChange={(event) => update("sessions", event.target.value)}
                  placeholder="Es. 4 incontri · 8 ingressi"
                />
              </label>
              <label>
                Dove
                <input
                  value={form.place}
                  onChange={(event) => update("place", event.target.value)}
                  placeholder="Via Li Punti 12, Sassari"
                />
              </label>
            </div>
          )}
          <label>
            Conduce
            <input
              value={form.teacher}
              onChange={(event) => update("teacher", event.target.value)}
              placeholder="Nome docente"
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Offerta e prezzo</legend>
          <p className="admin-form-note">
            {isCourseKind
              ? "Il corso ha un prezzo unico. Inizio e fine si impostano nei dettagli sopra."
              : "Sulla scheda laboratorio puoi offrire 4 ingressi, 8 ingressi e l’abbonamento mensile. Lascia vuoto il prezzo che non vuoi mostrare."}
          </p>
          {form.kind === "corso" || form.kind === "online" || form.offer === "course" ? (
            <label>
              Prezzo costo del corso (€)
              <input
                type="number"
                min={0}
                step={1}
                value={form.price}
                onChange={(event) => update("price", event.target.value)}
                placeholder="Es. 280"
              />
            </label>
          ) : (
            <div className="admin-form-row">
              <label>
                Prezzo pacchetto 4 ingressi (€)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.pricePack4}
                  onChange={(event) => update("pricePack4", event.target.value)}
                  placeholder="Es. 55"
                />
              </label>
              <label>
                Prezzo pacchetto 8 ingressi (€)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.pricePack8}
                  onChange={(event) => update("pricePack8", event.target.value)}
                  placeholder="Es. 100"
                />
              </label>
              <label>
                Prezzo abbonamento mensile (€)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.priceMonthly}
                  onChange={(event) => update("priceMonthly", event.target.value)}
                  placeholder="Es. 45"
                />
              </label>
            </div>
          )}
        </fieldset>

        {error ? <p className="admin-form-error">{error}</p> : null}
        {notice ? <p className="admin-form-note">{notice}</p> : null}

        <div className="admin-save-actions">
          <button type="submit" className="admin-secondary admin-save-draft">
            Salva bozza
          </button>
          <button
            type="button"
            className="admin-submit"
            onClick={() => void save("publish")}
          >
            Pubblica
          </button>
        </div>
      </form>
    </section>
  );
}
