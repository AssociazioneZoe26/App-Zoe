import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../admin/AuthContext";
import type { HomePreview, SitePage } from "../content/pages";
import {
  hasSitePageOverride,
  readImageAsDataUrl,
  resetSitePage,
  saveSitePage,
} from "../content/siteCmsStore";
import { Layout } from "./Layout";

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

export function ContentPage({ page: initialPage }: { page: SitePage }) {
  const { session, ready } = useAdminAuth();
  const canEdit = ready && Boolean(session);
  const [draft, setDraft] = useState<SitePage>(() => structuredClone(initialPage));
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(structuredClone(initialPage));
    setDirty(false);
    setNote("");
  }, [initialPage]);

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

  function save() {
    saveSitePage(draft);
    setDirty(false);
    setNote("Modifiche salvate. Visibili a tutti su questo dispositivo.");
  }

  function restore() {
    const restored = resetSitePage(draft.slug);
    if (!restored) return;
    setDraft(structuredClone(restored));
    setDirty(false);
    setNote("Pagina ripristinata ai testi originali.");
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
            {hasSitePageOverride(draft.slug) || dirty ? (
              <button type="button" className="site-edit-secondary" onClick={restore}>
                Ripristina originale
              </button>
            ) : null}
            <button type="button" className="site-edit-save" onClick={save} disabled={!dirty}>
              Salva
            </button>
          </div>
          {note ? <p className="site-edit-note">{note}</p> : null}
        </div>
      ) : null}

      <article className={canEdit ? "site-page is-editing" : "site-page"}>
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
              <div className="site-block-copy">
                {canEdit ? (
                  <>
                    <EditableText
                      label="Titolo sezione"
                      className="site-edit-input site-edit-h2"
                      value={preview.title}
                      onChange={(title) => updatePreview(index, { title })}
                    />
                    <EditableText
                      label="Testo"
                      className="site-edit-input site-edit-lede"
                      value={preview.body}
                      multiline
                      onChange={(body) => updatePreview(index, { body })}
                    />
                    <EditableText
                      label="Testo pulsante"
                      className="site-edit-input"
                      value={preview.cta}
                      onChange={(cta) => updatePreview(index, { cta })}
                    />
                    <Link className="site-preview-cta" to={preview.to}>
                      {preview.cta}
                    </Link>
                  </>
                ) : (
                  <>
                    <h2>{preview.title}</h2>
                    {preview.body
                      .split(/\n+/)
                      .filter(Boolean)
                      .map((paragraph, paragraphIndex) => (
                        <p key={`${preview.to}-p-${paragraphIndex}`} className="lede">
                          {paragraph}
                        </p>
                      ))}
                    <Link className="site-preview-cta" to={preview.to}>
                      {preview.cta}
                    </Link>
                  </>
                )}
              </div>
            </section>
          ))}

          {draft.sections.map((section, index) => (
            <section
              key={`${draft.slug}-section-${index}`}
              className={
                section.image
                  ? index % 2 === 1
                    ? "site-block site-block-media is-flip"
                    : "site-block site-block-media"
                  : "site-block"
              }
            >
              {section.image ? (
                <div className="site-block-art">
                  <img src={section.image} alt={section.imageAlt || ""} />
                  {canEdit ? (
                    <div className="site-edit-on-media">
                      <ImagePicker
                        onPick={(image) =>
                          patch((current) => {
                            const sections = [...current.sections];
                            sections[index] = { ...sections[index], image };
                            return { ...current, sections };
                          })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : canEdit ? (
                <div className="site-block-art site-preview-art">
                  <ImagePicker
                    label="Aggiungi foto"
                    onPick={(image) =>
                      patch((current) => {
                        const sections = [...current.sections];
                        sections[index] = { ...sections[index], image };
                        return { ...current, sections };
                      })
                    }
                  />
                </div>
              ) : null}
              <div className="site-block-copy">
                {canEdit ? (
                  <>
                    <EditableText
                      label="Titolo"
                      className="site-edit-input site-edit-h2"
                      value={section.title || ""}
                      onChange={(title) =>
                        patch((current) => {
                          const sections = [...current.sections];
                          sections[index] = { ...sections[index], title };
                          return { ...current, sections };
                        })
                      }
                    />
                    <EditableText
                      label="Testo"
                      className="site-edit-input site-edit-lede"
                      value={section.body}
                      multiline
                      onChange={(body) =>
                        patch((current) => {
                          const sections = [...current.sections];
                          sections[index] = { ...sections[index], body };
                          return { ...current, sections };
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    {section.title ? <h2>{section.title}</h2> : null}
                    {section.body
                      .split(/\n+/)
                      .filter(Boolean)
                      .map((paragraph, paragraphIndex) => (
                        <p
                          key={`${draft.slug}-s${index}-p${paragraphIndex}`}
                          className="lede"
                        >
                          {paragraph}
                        </p>
                      ))}
                  </>
                )}
              </div>
            </section>
          ))}

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
    </Layout>
  );
}
