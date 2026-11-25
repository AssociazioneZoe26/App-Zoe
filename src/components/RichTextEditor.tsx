import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { sanitizeHref, sanitizeHtml, toRichHtml } from "../lib/richText";

function run(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function applyBlock(tag: "h2" | "p") {
  run("formatBlock", tag);
  if (!document.queryCommandValue("formatBlock").toLowerCase().includes(tag)) {
    run("formatBlock", `<${tag}>`);
  }
}

function escapeInsert(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function Tool({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="site-rich-tool"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RichBody({ html }: { html: string }) {
  const safe = toRichHtml(html);
  if (!safe) return null;
  return <div className="site-rich-body" dangerouslySetInnerHTML={{ __html: safe }} />;
}

export function RichTextEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const lastHtml = useRef("");
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkHref, setLinkHref] = useState("");

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || focused.current) return;
    const html = toRichHtml(value) || "<p></p>";
    if (html !== lastHtml.current) {
      el.innerHTML = html;
      lastHtml.current = html;
    }
  }, [value]);

  function emit() {
    const el = surfaceRef.current;
    if (!el) return;
    const html = sanitizeHtml(el.innerHTML);
    lastHtml.current = html;
    onChange(html);
  }

  function rememberRange() {
    const sel = document.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreRange() {
    const el = surfaceRef.current;
    const range = savedRange.current;
    if (!el || !range) {
      el?.focus();
      return;
    }
    el.focus();
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function openLinkForm(title: string, href: string) {
    rememberRange();
    setLinkTitle(title);
    setLinkHref(href);
    setLinkOpen(true);
  }

  function addLink() {
    const selected = document.getSelection()?.toString().trim() ?? "";
    let existingHref = "";
    const sel = document.getSelection();
    if (sel?.anchorNode) {
      const node =
        sel.anchorNode.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as Element)
          : sel.anchorNode.parentElement;
      const current = node?.closest("a");
      if (current) existingHref = current.getAttribute("href") || "";
    }
    const selectedIsUrl = /^(https?:|mailto:|tel:|\/|#)/i.test(selected);
    openLinkForm(selectedIsUrl ? "" : selected, existingHref || (selectedIsUrl ? selected : ""));
  }

  function applyLink() {
    const href = sanitizeHref(linkHref);
    const title = linkTitle.trim() || href || "";
    if (!href || !title) return;
    restoreRange();
    const range = savedRange.current;
    if (range && !range.collapsed) range.deleteContents();
    run("insertHTML", sanitizeHtml(`<a href="${href}">${escapeInsert(title)}</a>`));
    setLinkOpen(false);
    setLinkTitle("");
    setLinkHref("");
    emit();
  }

  function insertFromClipboard(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain").trim();
    if (html) {
      run("insertHTML", sanitizeHtml(html) || toRichHtml(text));
      emit();
      return;
    }
    if (sanitizeHref(text) && !/\s/.test(text)) {
      const selected = document.getSelection()?.toString().trim() ?? "";
      if (selected) {
        run("createLink", text);
        emit();
        return;
      }
      openLinkForm("", text);
      return;
    }
    run("insertHTML", toRichHtml(text) || escapeInsert(text));
    emit();
  }

  return (
    <div className="site-edit-field">
      <span className="site-edit-label">{label}</span>
      <div className="site-rich">
        <div className="site-rich-toolbar" role="toolbar" aria-label="Formattazione paragrafo">
          <Tool
            onClick={() => {
              run("bold");
              emit();
            }}
          >
            Grassetto
          </Tool>
          <Tool
            onClick={() => {
              applyBlock("h2");
              emit();
            }}
          >
            Titolo
          </Tool>
          <Tool
            onClick={() => {
              applyBlock("p");
              emit();
            }}
          >
            Paragrafo
          </Tool>
          <Tool onClick={addLink}>Link</Tool>
        </div>
        {linkOpen ? (
          <div className="site-rich-link">
            <label className="site-edit-field">
              <span className="site-edit-label">Titolo del link</span>
              <input
                className="site-edit-input"
                value={linkTitle}
                placeholder="Es. Scopri di più"
                onChange={(event) => setLinkTitle(event.target.value)}
              />
            </label>
            <label className="site-edit-field">
              <span className="site-edit-label">Indirizzo</span>
              <input
                className="site-edit-input"
                value={linkHref}
                placeholder="https:// oppure /pagina"
                onChange={(event) => setLinkHref(event.target.value)}
              />
            </label>
            <div className="site-rich-link-actions">
              <button type="button" className="site-rich-tool" onClick={applyLink}>
                Inserisci
              </button>
              <button
                type="button"
                className="site-rich-tool"
                onClick={() => setLinkOpen(false)}
              >
                Annulla
              </button>
            </div>
          </div>
        ) : null}
        <div
          ref={surfaceRef}
          className="site-edit-input site-edit-lede site-rich-surface"
          contentEditable
          role="textbox"
          aria-label={label}
          suppressContentEditableWarning
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            emit();
          }}
          onInput={emit}
          onPaste={insertFromClipboard}
        />
      </div>
    </div>
  );
}
