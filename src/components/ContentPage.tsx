import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../admin/AuthContext";
import type { ContentSection, HomePreview, SitePage } from "../content/pages";
import {
  hasSitePageOverride,
  readImageAsDataUrl,
  resetSitePageRemote,
  saveSitePageRemote,
} from "../content/siteCmsStore";
import { generalWhatsapp } from "../data";
import { ContactsSection } from "./ContactsSection";
import { DownloadAppLink } from "./DownloadAppLink";
import { Layout } from "./Layout";
import { NewsletterBanner } from "./NewsletterBanner";
import { RichBody, RichTextEditor } from "./RichTextEditor";
import { StoreDownloadButtons } from "./StoreDownloadButtons";

const EMPTY_SECTION: ContentSection = {
  title: "Nuova sezione",
  body: "Scrivi qui il paragrafo.",
  cta: "Contattaci",
  ctaTo: "/contatti",
};

const CUSTOM_TARGET = "__custom__";

const PAGE_TARGETS = [
  { label: "Home", value: "/" },
  { label: "Chi siamo", value: "/chi-siamo" },
  { label: "Zoe Academy", value: "/academy" },
  { label: "Squadra di robotica", value: "/squadra-robotica" },
  { label: "Progetti scuole", value: "/progetti/scuole" },
  { label: "Progetti comuni", value: "/progetti/comuni" },
  { label: "Viaggi di istruzione", value: "/progetti/gite" },
  { label: "Attività estive", value: "/progetti/attivita-estive" },
  { label: "Carta docente", value: "/carta-docente" },
  { label: "Contatti", value: "/contatti" },
  { label: "Newsletter (in Contatti)", value: "/contatti#newsletter" },
  { label: "Form scrivici", value: "/contatti#scrivi" },
  { label: "Scarica l’app", value: "/scarica-app" },
  { label: "Accedi", value: "/accedi" },
  { label: "WhatsApp", value: generalWhatsapp },
  { label: "Chiama", value: "tel:+393473814081" },
  { label: "Email", value: "mailto:info@associazionezoe.org" },
];

function isAppPath(to: string) {
  return to.startsWith("/") && !to.startsWith("//");
}

function SectionCta({
  to,
  className,
  children,
}: {
  to: string;
  className: string;
  children: ReactNode;
}) {
  if (isAppPath(to)) {
    return (
      <Link className={className} to={to}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//i.test(to);
  return (
    <a
      className={className}
      href={to}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function CtaTargetField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const known = PAGE_TARGETS.some((target) => target.value === value);
  const selectValue = known ? value : CUSTOM_TARGET;

  return (
    <label className="site-edit-field">
      <span className="site-edit-label">Il pulsante porta a</span>
      <select
        className="site-edit-input"
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (next === CUSTOM_TARGET) {
            onChange(known ? "" : value);
            return;
          }
          onChange(next);
        }}
      >
        {PAGE_TARGETS.map((target) => (
          <option key={target.value} value={target.value}>
            {target.label}
          </option>
        ))}
        <option value={CUSTOM_TARGET}>Altro link…</option>
      </select>
      {selectValue === CUSTOM_TARGET ? (
        <input
          className="site-edit-input"
          value={value}
          placeholder="/pagina o https://…"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
    </label>
  );
}

function splitLines(value: string) {
  return value.split("\n").filter(Boolean);
}

function EditableText({
  value,
  onChange,
  multiline = false,
  className,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
  label: string;
}) {
  if (multiline) {
    return (
      <label className="site-edit-field">
        <span className="site-edit-label">{label}</span>
        <textarea
          className={className}
          value={value}
          rows={Math.max(3, splitLines(value).length + 1)}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className="site-edit-field">
      <span className="site-edit-label">{label}</span>
      <input
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ImagePicker({
  onPick,
  label = "Cambia foto",
}: {
  onPick: (dataUrl: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const dataUrl = await readImageAsDataUrl(file);
    onPick(dataUrl);
  }

  return (
    <>
      <button
        type="button"
        className="site-edit-image-btn"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />
    </>
  );
}

export function ContentPage({
  page: initialPage,
  pageKey,
}: {
  page: SitePage;
  pageKey?: string;
}) {
  const { session, ready } = useAdminAuth();
  const canEdit = ready && Boolean(session);
  const [draft, setDraft] = useState<SitePage>(() => structuredClone(initialPage));
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasOverride, setHasOverride] = useState(
    () => hasSitePageOverride(initialPage.slug),
  );

  useEffect(() => {
    setDraft(structuredClone(initialPage));
    setDirty(false);
    setNote("");
    setHasOverride(hasSitePageOverride(initialPage.slug));
  }, [initialPage, pageKey]);

  useEffect(() => {
    document.title = draft.documentTitle;
  }, [draft.documentTitle]);

  const previews = draft.previews ?? [];
  const previewAccents = ["accent-blue", "accent-sun", "accent-red", "accent-deep", "accent-sun"] as const;

  function patch(updater: (current: SitePage) => SitePage) {
    setDraft((current) => updater(structuredClone(current)));
    setDirty(true);
    setNote("");
  }

  function updatePreview(index: number, patchPreview: Partial<HomePreview>) {
    patch((current) => {
      const list = [...(current.previews ?? [])];
      list[index] = { ...list[index], ...patchPreview };
      return { ...current, previews: list };
    });
  }

  function updateSection(index: number, patchSection: Partial<ContentSection>) {
    patch((current) => {
      const sections = [...current.sections];
      sections[index] = { ...sections[index], ...patchSection };
      return { ...current, sections };
    });
  }

  function addSection() {
    patch((current) => ({
      ...current,
      sections: [...current.sections, structuredClone(EMPTY_SECTION)],
    }));
  }

  function removeSection(index: number) {
    patch((current) => ({
      ...current,
      sections: current.sections.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    patch((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.sections.length) return current;
      const sections = [...current.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(nextIndex, 0, item);
      return { ...current, sections };
    });
  }

  async function save() {
    setSaving(true);
    setNote("Salvataggio online…");
    try {
      const saved = await saveSitePageRemote(draft);
      setDraft(structuredClone(saved));
      setDirty(false);
      setHasOverride(true);
      setNote("Modifiche pubblicate online: visibili anche da cellulare e altri dispositivi.");
    } catch (error) {
      setNote(
        `Salvataggio non riuscito: ${error instanceof Error ? error.message : "errore sconosciuto"}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    setSaving(true);
    const restored = await resetSitePageRemote(draft.slug);
    setSaving(false);
    if (!restored) return;
    setDraft(structuredClone(restored));
    setDirty(false);
    setHasOverride(false);
    setNote("Pagina ripristinata ai testi originali (anche online).");
  }

  return (
    <Layout variant="site">
      {canEdit ? (
        <div className="site-edit-bar" role="region" aria-label="Modifica pagina sito">
          <div>
            <p className="site-edit-bar-title">Modifica sito · Team Zoe</p>
            <p className="site-edit-bar-copy">
              Solo pagine informative (non Academy). Academy resta separata per la futura app.
            </p>
          </div>
          <div className="site-edit-bar-actions">
            {hasOverride || dirty ? (
              <button
                type="button"
                className="site-edit-secondary"
                onClick={() => void restore()}
                disabled={saving}
              >
                Ripristina originale
              </button>
            ) : null}
            <button
              type="button"
              className="site-edit-save"
              onClick={() => void save()}
              disabled={!dirty || saving}
            >
              {saving ? "Salvo…" : "Salva online"}
            </button>
          </div>
          {note ? <p className="site-edit-note">{note}</p> : null}
        </div>
      ) : null}

      <article
        className={[
          "site-page",
          canEdit ? "is-editing" : "",
          draft.slug === "scarica-app" ? "site-page-scarica-app" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header
          className={[
            "site-hero",
            draft.heroImagePosition === "top"
              ? "is-pos-top"
              : draft.heroImagePosition === "bottom"
                ? "is-pos-bottom"
                : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ backgroundImage: `url(${draft.heroImage})` }}
        >
          {canEdit ? (
            <div className="site-edit-hero-tools">
              <ImagePicker
                label="Cambia foto hero"
                onPick={(heroImage) => patch((current) => ({ ...current, heroImage }))}
              />
            </div>
          ) : null}
          <div className="site-hero-shade">
            <p className="eyebrow eyebrow-red">{draft.title}</p>
            {canEdit ? (
              <>
                <EditableText
                  label="Titolo hero (usa Invio per andare a capo)"
                  className="site-edit-input site-edit-h1"
                  value={draft.heroTitle}
                  multiline
                  onChange={(heroTitle) => patch((current) => ({ ...current, heroTitle }))}
                />
                <EditableText
                  label="Testo hero"
                  className="site-edit-input site-edit-lede"
                  value={draft.heroText}
                  multiline
                  onChange={(heroText) => patch((current) => ({ ...current, heroText }))}
                />
              </>
            ) : (
              <>
                <h1>
                  {draft.heroTitle.split("\n").map((line, index, lines) => (
                    <span key={`${draft.slug}-hero-${index}`}>
                      {line}
                      {index < lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </h1>
                <p className="lede">{draft.heroText}</p>
              </>
            )}
          </div>
        </header>

        <div className="site-body">
          {draft.slug === "scarica-app" ? <StoreDownloadButtons /> : null}

          {previews.map((preview, index) => (
            <section
              key={`${draft.slug}-preview-${preview.to}-${index}`}
              className={[
                "site-block",
                "site-block-media",
                "site-preview",
                previewAccents[index % previewAccents.length],
                index % 2 === 1 ? "is-flip" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="site-block-copy">
                {preview.image ? (
                  <div
                    className={
                      preview.imageFit === "natural"
                        ? "site-block-art is-natural"
                        : "site-block-art"
                    }
                  >
                    <img
                      src={preview.image}
                      alt={preview.imageAlt || ""}
                      className={[
                        preview.imageFit === "natural" ? "is-fit-natural" : "",
                        preview.imagePosition === "top"
                          ? "is-pos-top"
                          : preview.imagePosition === "bottom"
                            ? "is-pos-bottom"
                            : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined}
                    />
                    {canEdit ? (
                      <div className="site-edit-on-media">
                        <ImagePicker
                          onPick={(image) => updatePreview(index, { image })}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="site-block-art site-preview-art" aria-hidden={!canEdit}>
                    {canEdit ? (
                      <ImagePicker
                        label="Aggiungi foto"
                        onPick={(image) => updatePreview(index, { image })}
                      />
                    ) : (
                      <span>Immagine</span>
                    )}
                  </div>
                )}
                {canEdit ? (
                  <>
                    <EditableText
                      label="Titolo sezione"
                      className="site-edit-input site-edit-h2"
                      value={preview.title}
                      onChange={(title) => updatePreview(index, { title })}
                    />
                    <RichTextEditor
                      label="Paragrafo"
                      value={preview.body}
                      onChange={(body) => updatePreview(index, { body })}
                    />
                    <EditableText
                      label="Testo pulsante"
                      className="site-edit-input"
                      value={preview.cta}
                      onChange={(cta) => updatePreview(index, { cta })}
                    />
                    <CtaTargetField
                      value={preview.to}
                      onChange={(to) => updatePreview(index, { to })}
                    />
                    <div className="site-preview-actions">
                      <SectionCta className="site-preview-cta" to={preview.to}>
                        {preview.cta}
                      </SectionCta>
                      {preview.to === "/academy" ? (
                        <DownloadAppLink className="nav-download-red" fullLabel />
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <h2>{preview.title}</h2>
                    <RichBody html={preview.body} />
                    <div className="site-preview-actions">
                      <SectionCta className="site-preview-cta" to={preview.to}>
                        {preview.cta}
                      </SectionCta>
                      {preview.to === "/academy" ? (
                        <DownloadAppLink className="nav-download-red" fullLabel />
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </section>
          ))}

          {draft.sections.map((section, index) => {
            const ctaLabel = section.cta?.trim() ?? "";
            const ctaTo = section.ctaTo?.trim() || "/contatti";
            const hasMedia = Boolean(section.image) || canEdit;
            return (
            <section
              key={`${draft.slug}-section-${index}`}
              className={
                hasMedia
                  ? index % 2 === 1
                    ? "site-block site-block-media is-flip"
                    : "site-block site-block-media"
                  : "site-block"
              }
            >
              <div className="site-block-copy">
                {section.image ? (
                  <div className="site-block-art">
                    <img src={section.image} alt={section.imageAlt || ""} />
                    {canEdit ? (
                      <div className="site-edit-on-media">
                        <ImagePicker onPick={(image) => updateSection(index, { image })} />
                      </div>
                    ) : null}
                  </div>
                ) : canEdit ? (
                  <div className="site-block-art site-preview-art">
                    <ImagePicker
                      label="Aggiungi foto"
                      onPick={(image) => updateSection(index, { image })}
                    />
                  </div>
                ) : null}
                {canEdit ? (
                  <>
                    <div className="site-section-tools">
                      <button
                        type="button"
                        className="site-edit-tool"
                        onClick={() => moveSection(index, -1)}
                        disabled={index === 0}
                      >
                        Su
                      </button>
                      <button
                        type="button"
                        className="site-edit-tool"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === draft.sections.length - 1}
                      >
                        Giù
                      </button>
                      <button
                        type="button"
                        className="site-edit-tool is-danger"
                        onClick={() => removeSection(index)}
                      >
                        Rimuovi sezione
                      </button>
                    </div>
                    <EditableText
                      label="Titolo"
                      className="site-edit-input site-edit-h2"
                      value={section.title || ""}
                      onChange={(title) => updateSection(index, { title })}
                    />
                    <RichTextEditor
                      label="Paragrafo"
                      value={section.body}
                      onChange={(body) => updateSection(index, { body })}
                    />
                    <EditableText
                      label="Testo pulsante (vuoto = nascosto)"
                      className="site-edit-input"
                      value={section.cta || ""}
                      onChange={(cta) => updateSection(index, { cta })}
                    />
                    {ctaLabel ? (
                      <>
                        <CtaTargetField
                          value={section.ctaTo || "/contatti"}
                          onChange={(ctaTo) => updateSection(index, { ctaTo })}
                        />
                        <SectionCta className="site-section-cta" to={ctaTo}>
                          {ctaLabel}
                        </SectionCta>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    {section.title ? <h2>{section.title}</h2> : null}
                    <RichBody html={section.body} />
                    {ctaLabel ? (
                      <SectionCta className="site-section-cta" to={ctaTo}>
                        {ctaLabel}
                      </SectionCta>
                    ) : null}
                  </>
                )}
              </div>
            </section>
            );
          })}

          {canEdit ? (
            <div className="site-add-section">
              <button type="button" className="site-edit-add" onClick={addSection}>
                Aggiungi sezione
              </button>
              <p className="site-add-section-hint">
                Foto, titolo, paragrafo, testo del pulsante e dove porta. Poi Salva
                online.
              </p>
            </div>
          ) : null}

          {draft.videos.length > 0 ? (
            <section className="site-videos">
              <p className="eyebrow eyebrow-red">Video</p>
              <h2>Guarda le attività.</h2>
              <ul className="site-video-grid">
                {draft.videos.map((video) => (
                  <li key={video.src}>
                    <p className="card-kicker">{video.title}</p>
                    <video controls preload="metadata" poster={video.poster}>
                      <source src={video.src} />
                    </video>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

        </div>
      </article>
      {draft.slug === "home" ? (
        <>
          <NewsletterBanner />
          <ContactsSection />
        </>
      ) : null}
    </Layout>
  );
}
