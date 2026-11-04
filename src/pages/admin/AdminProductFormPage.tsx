import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getProduct, saveProduct } from "../../admin/catalogStore";
import {
  catalogKindOptions,
  type CatalogKind,
  type CatalogProduct,
} from "../../admin/catalogTypes";

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
  courseVideoUrl: "",
  courseDuration: "",
  pricePack5: "",
  pricePack10: "",
  priceMonthly: "",
  priceCourse: "",
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
      previewText: existing.previewText,
      fullText: existing.fullText,
      pointsText: existing.points.join("\n"),
      mantra: existing.mantra,
      schedule: existing.schedule || "",
      time: existing.time || "",
      sessions: existing.sessions || "",
      place: existing.place,
      teacher: existing.teacher || "",
      courseVideoUrl: existing.courseVideoUrl || "",
      courseDuration: existing.courseDuration || "",
      pricePack5: priceToField(existing.pricePack5),
      pricePack10: priceToField(existing.pricePack10),
      priceMonthly: priceToField(existing.priceMonthly),
      priceCourse: priceToField(existing.priceCourse),
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

  function save(mode: SaveMode) {
    const asDraft = mode === "draft";

    if (!form.title.trim()) {
      setError("Il titolo è obbligatorio.");
      return;
    }
    if (!asDraft && !form.previewText.trim()) {
      setError("Per pubblicare serve il sommario della scheda.");
      return;
    }
    if (!asDraft && form.kind === "online" && !form.courseVideoUrl.trim()) {
      setError("Per pubblicare un corso online serve l’URL del video.");
      return;
    }

    const saved = saveProduct(
      {
        title: form.title.trim(),
        eyebrow: form.eyebrow.trim(),
        age: form.age.trim(),
        kind: form.kind,
        audience: form.audience,
        accent: form.accent,
        published: !asDraft,
        previewImage: form.previewImage.trim(),
        previewText: form.previewText.trim(),
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
        courseVideoUrl: form.courseVideoUrl.trim(),
        courseDuration: form.courseDuration.trim(),
        pricePack5: fieldToPrice(form.pricePack5),
        pricePack10: fieldToPrice(form.pricePack10),
        priceMonthly: fieldToPrice(form.priceMonthly),
        priceCourse: fieldToPrice(form.priceCourse),
      },
      existing?.id,
    );

    setError("");
    setNotice(asDraft ? "Bozza salvata." : "Prodotto pubblicato.");
    setForm((prev) => ({ ...prev, published: !asDraft }));
    navigate(`/admin/catalogo/${saved.id}`, { replace: true });
  }

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
          save("draft");
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
            Sommario
            <textarea
              rows={4}
              value={form.previewText}
              onChange={(event) => update("previewText", event.target.value)}
              placeholder="Testo principale della scheda"
            />
          </label>
          {form.kind === "online" ? (
            <label>
              Video del corso completo (URL)
              <input
                value={form.courseVideoUrl}
                onChange={(event) => update("courseVideoUrl", event.target.value)}
                placeholder="https://… oppure /video/corso.mp4"
              />
            </label>
          ) : (
            <label>
              Descrizione completa
              <textarea
                rows={4}
                value={form.fullText}
                onChange={(event) => update("fullText", event.target.value)}
                placeholder="Testo aggiuntivo sotto il sommario"
              />
            </label>
          )}
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

        <fieldset>
          <legend>Dettagli (Età, Tipo, Quando…)</legend>
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
              Tipo
              <select
                value={form.kind}
                onChange={(event) => update("kind", event.target.value as CatalogKind)}
              >
                {catalogKindOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-form-row">
            <label>
              Quando
              <input
                value={form.schedule}
                onChange={(event) => update("schedule", event.target.value)}
                placeholder="Es. Da mercoledì 28 ottobre"
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
          <div className="admin-form-row">
            <label>
              Durata
              <input
                value={form.sessions}
                onChange={(event) => update("sessions", event.target.value)}
                placeholder="Es. 4 incontri · 10 ingressi"
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
          <div className="admin-form-row">
            <label>
              Conduce
              <input
                value={form.teacher}
                onChange={(event) => update("teacher", event.target.value)}
                placeholder="Nome docente"
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
        </fieldset>

        <fieldset>
          <legend>Prezzi (lascia vuoto se non offerto)</legend>
          <label>
            Durata del corso
            <input
              value={form.courseDuration}
              onChange={(event) => update("courseDuration", event.target.value)}
              placeholder="Es. Anno scolastico, 3 mesi…"
            />
          </label>
          <div className="admin-form-row">
            <label>
              Prezzo pacchetto 5 ingressi (€)
              <input
                type="number"
                min={0}
                step={1}
                value={form.pricePack5}
                onChange={(event) => update("pricePack5", event.target.value)}
                placeholder="Es. 55"
              />
            </label>
            <label>
              Prezzo pacchetto 10 ingressi (€)
              <input
                type="number"
                min={0}
                step={1}
                value={form.pricePack10}
                onChange={(event) => update("pricePack10", event.target.value)}
                placeholder="Es. 100"
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label>
              Prezzo canone mensile (€)
              <input
                type="number"
                min={0}
                step={1}
                value={form.priceMonthly}
                onChange={(event) => update("priceMonthly", event.target.value)}
                placeholder="Es. 45 — rinnovabile area socio"
              />
            </label>
            <label>
              Prezzo costo del corso (€)
              <input
                type="number"
                min={0}
                step={1}
                value={form.priceCourse}
                onChange={(event) => update("priceCourse", event.target.value)}
                placeholder="Es. 280"
              />
            </label>
          </div>
        </fieldset>

        {error ? <p className="admin-form-error">{error}</p> : null}
        {notice ? <p className="admin-form-note">{notice}</p> : null}

        <div className="admin-save-actions">
          <button type="submit" className="admin-secondary admin-save-draft">
            Salva bozza
          </button>
          <button type="button" className="admin-submit" onClick={() => save("publish")}>
            Pubblica
          </button>
        </div>
      </form>
    </section>
  );
}
