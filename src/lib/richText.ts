const ALLOWED = new Set(["P", "H2", "H3", "STRONG", "EM", "A", "BR", "UL", "OL", "LI"]);

export function sanitizeHref(href: string) {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return null;
}

function tagName(el: HTMLElement) {
  const tag = el.tagName;
  if (tag === "B") return "STRONG";
  if (tag === "I") return "EM";
  if (tag === "H1") return "H2";
  return tag;
}

function sanitizeNode(node: Node): Node[] {
  if (node.nodeType === Node.TEXT_NODE) return [node];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "IFRAME") {
    return [];
  }
  const children = Array.from(el.childNodes).flatMap(sanitizeNode);
  const tag = tagName(el);
  if (!ALLOWED.has(tag)) return children;
  if (tag === "A") {
    const href = sanitizeHref(el.getAttribute("href") || "");
    if (!href) return children;
    const clean = el.ownerDocument.createElement("a");
    clean.setAttribute("href", href);
    if (/^https?:\/\//i.test(href)) {
      clean.setAttribute("target", "_blank");
      clean.setAttribute("rel", "noreferrer");
    }
    for (const child of children) clean.appendChild(child);
    return [clean];
  }
  const clean = el.ownerDocument.createElement(tag.toLowerCase());
  for (const child of children) clean.appendChild(child);
  return [clean];
}

export function looksLikeHtml(value: string) {
  return /<\/?(p|h[1-3]|strong|b|em|i|a|ul|ol|li|br)\b/i.test(value);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeHtml(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const wrap = doc.body.firstElementChild;
  if (!wrap) return "";
  const out = doc.createElement("div");
  for (const node of Array.from(wrap.childNodes).flatMap(sanitizeNode)) {
    out.appendChild(node);
  }
  return out.innerHTML;
}

export function toRichHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(value)) return sanitizeHtml(value);
  return sanitizeHtml(
    value
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join(""),
  );
}
