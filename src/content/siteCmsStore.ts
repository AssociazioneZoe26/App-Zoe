import { getSitePage, type SitePage } from "./pages";

/**
 * CMS delle sole pagine informative del sito (home, Chi siamo, Progetti, …).
 * Resta separato dal catalogo Academy: Academy diventerà anche app mobile
 * (Play Store / App Store) e non condivide questo store.
 */
const STORAGE_KEY = "zoe-site-cms-pages";

function readOverrides(): Record<string, SitePage> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SitePage>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(pages: Record<string, SitePage>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export function getResolvedSitePage(slug: string): SitePage | undefined {
  const seed = getSitePage(slug);
  if (!seed) return undefined;
  const override = readOverrides()[slug];
  if (!override) return structuredClone(seed);
  return {
    ...structuredClone(seed),
    ...structuredClone(override),
    slug: seed.slug,
  };
}

export function saveSitePage(page: SitePage) {
  const pages = readOverrides();
  pages[page.slug] = structuredClone(page);
  writeOverrides(pages);
  return pages[page.slug];
}

export function resetSitePage(slug: string) {
  const pages = readOverrides();
  delete pages[slug];
  writeOverrides(pages);
  return getResolvedSitePage(slug);
}

export function hasSitePageOverride(slug: string) {
  return Boolean(readOverrides()[slug]);
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Lettura immagine non valida"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Errore lettura file"));
    reader.readAsDataURL(file);
  });
}
