import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { getSitePage, type SitePage } from "./pages";

/**
 * CMS delle sole pagine informative del sito (home, Chi siamo, Progetti, …).
 * Sorgente primaria: Supabase (tutti i dispositivi).
 * Cache locale solo come backup offline / migrazione — mai con data URL base64
 * (superano facilmente la quota ~5MB di localStorage).
 */
const STORAGE_KEY = "zoe-site-cms-pages";

function isDataImageUrl(value: string | undefined): boolean {
  return Boolean(value?.startsWith("data:image"));
}

/** Rimuove base64 dalla copia destinata a localStorage. */
function forLocalCache(page: SitePage): SitePage {
  const next = structuredClone(page);
  if (isDataImageUrl(next.heroImage)) next.heroImage = "";
  next.sections = next.sections.map((section) => ({
    ...section,
    image: isDataImageUrl(section.image) ? undefined : section.image,
  }));
  if (next.previews) {
    next.previews = next.previews.map((preview) => ({
      ...preview,
      image: isDataImageUrl(preview.image) ? undefined : preview.image,
    }));
  }
  next.videos = next.videos.map((video) => ({
    ...video,
    poster: isDataImageUrl(video.poster) ? undefined : video.poster,
  }));
  return next;
}

function pageHasDataImages(page: SitePage): boolean {
  return (
    isDataImageUrl(page.heroImage) ||
    page.sections.some((s) => isDataImageUrl(s.image)) ||
    (page.previews?.some((p) => isDataImageUrl(p.image)) ?? false) ||
    page.videos.some((v) => isDataImageUrl(v.poster))
  );
}

function readLocalOverrides(): Record<string, SitePage> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SitePage>;
    if (!parsed || typeof parsed !== "object") return {};

    // Cache gonfia da foto in base64: ripulisci subito la quota del browser.
    let dirty = false;
    const cleaned: Record<string, SitePage> = {};
    for (const [slug, page] of Object.entries(parsed)) {
      if (!page || typeof page !== "object") continue;
      if (pageHasDataImages(page)) {
        cleaned[slug] = forLocalCache(page);
        dirty = true;
      } else {
        cleaned[slug] = page;
      }
    }
    if (dirty || raw.length > 1_500_000) {
      writeLocalOverrides(cleaned);
    }
    return cleaned;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return {};
  }
}

/** Cache best-effort: non deve mai far fallire un salvataggio sul cloud. */
function writeLocalOverrides(pages: Record<string, SitePage>) {
  const slim: Record<string, SitePage> = {};
  for (const [slug, page] of Object.entries(pages)) {
    slim[slug] = forLocalCache(page);
  }

  const payload = JSON.stringify(slim);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    return;
  } catch {
    // Quota: tieni solo l’ultima pagina utile, poi abbandona la cache.
  }

  try {
    const slugs = Object.keys(slim);
    const lastSlug = slugs[slugs.length - 1];
    if (lastSlug && slim[lastSlug]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ [lastSlug]: slim[lastSlug] }));
      return;
    }
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function mergePage(seed: SitePage, override?: SitePage | null): SitePage {
  if (!override) return structuredClone(seed);
  return {
    ...structuredClone(seed),
    ...structuredClone(override),
    slug: seed.slug,
  };
}

/** Sincrono: seed + eventuale cache locale (usato come fallback immediato). */
export function getResolvedSitePage(slug: string): SitePage | undefined {
  const seed = getSitePage(slug);
  if (!seed) return undefined;
  return mergePage(seed, readLocalOverrides()[slug]);
}

export async function loadSitePage(slug: string): Promise<SitePage | undefined> {
  const seed = getSitePage(slug);
  if (!seed) return undefined;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase()
        .from("site_pages")
        .select("content")
        .eq("slug", slug)
        .maybeSingle();
      if (!error && data?.content && typeof data.content === "object") {
        const remote = data.content as SitePage;
        // Cloud = verità per Team Zoe. Il seed del codice non sovrascrive foto/testi.
        const resolved = { ...structuredClone(seed), ...structuredClone(remote), slug: seed.slug };
        const local = readLocalOverrides();
        local[slug] = resolved;
        writeLocalOverrides(local);
        return resolved;
      }
    } catch {
      // fallback locale
    }
  }

  return mergePage(seed, readLocalOverrides()[slug]);
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext =
    mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
  return { blob: new Blob([bytes], { type: mime }), ext };
}

async function uploadDataUrlIfNeeded(
  value: string | undefined,
  pathPrefix: string,
): Promise<string | undefined> {
  if (!value) return value;
  if (!value.startsWith("data:image")) return value;
  if (!isSupabaseConfigured()) return value;

  const parsed = dataUrlToBlob(value);
  if (!parsed) return value;

  const supabase = getSupabase();
  const path = `${pathPrefix}-${Date.now()}.${parsed.ext}`;
  const { error } = await supabase.storage.from("site-media").upload(path, parsed.blob, {
    upsert: true,
    contentType: parsed.blob.type,
  });
  if (error) {
    console.error("site image upload failed", error.message);
    return value;
  }
  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return data.publicUrl || value;
}

async function persistPageImages(page: SitePage): Promise<SitePage> {
  const next = structuredClone(page);
  const base = `pages/${page.slug}`;

  next.heroImage =
    (await uploadDataUrlIfNeeded(next.heroImage, `${base}/hero`)) || next.heroImage;

  next.sections = await Promise.all(
    next.sections.map(async (section, index) => ({
      ...section,
      image: await uploadDataUrlIfNeeded(section.image, `${base}/section-${index}`),
    })),
  );

  if (next.previews) {
    next.previews = await Promise.all(
      next.previews.map(async (preview, index) => ({
        ...preview,
        image: await uploadDataUrlIfNeeded(preview.image, `${base}/preview-${index}`),
      })),
    );
  }

  next.videos = await Promise.all(
    next.videos.map(async (video, index) => ({
      ...video,
      poster: await uploadDataUrlIfNeeded(video.poster, `${base}/video-poster-${index}`),
    })),
  );

  return next;
}

export async function saveSitePageRemote(page: SitePage): Promise<SitePage> {
  const withUrls = await persistPageImages(page);

  if (!isSupabaseConfigured()) {
    // Senza cloud restiamo in locale, ma senza base64 (altrimenti quota).
    const local = readLocalOverrides();
    local[withUrls.slug] = withUrls;
    writeLocalOverrides(local);
    if (isDataImageUrl(withUrls.heroImage) || withUrls.sections.some((s) => isDataImageUrl(s.image))) {
      throw new Error(
        "Immagine troppo grande per il salvataggio locale. Configura Supabase o usa foto più leggere.",
      );
    }
    return withUrls;
  }

  const stillHasDataUrl =
    isDataImageUrl(withUrls.heroImage) ||
    withUrls.sections.some((s) => isDataImageUrl(s.image)) ||
    (withUrls.previews?.some((p) => isDataImageUrl(p.image)) ?? false) ||
    withUrls.videos.some((v) => isDataImageUrl(v.poster));

  if (stillHasDataUrl) {
    throw new Error(
      "Upload immagine non riuscito. Riprova con una foto più leggera (consigliato sotto 2 MB) o in formato JPG/WebP.",
    );
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("site_pages").upsert({
    slug: withUrls.slug,
    content: withUrls,
    updated_by: user?.id ?? null,
  });

  if (error) {
    console.error("site_pages upsert failed", error.message);
    throw new Error(error.message);
  }

  // Cache locale solo dopo successo cloud, e senza bloccare se la quota è piena.
  const local = readLocalOverrides();
  local[withUrls.slug] = withUrls;
  writeLocalOverrides(local);

  return withUrls;
}

/** Compat: salvataggio sync locale (evitare per nuove chiamate). */
export function saveSitePage(page: SitePage) {
  const pages = readLocalOverrides();
  pages[page.slug] = structuredClone(page);
  writeLocalOverrides(pages);
  return pages[page.slug];
}

export async function resetSitePageRemote(slug: string): Promise<SitePage | undefined> {
  const local = readLocalOverrides();
  delete local[slug];
  writeLocalOverrides(local);

  if (isSupabaseConfigured()) {
    await getSupabase().from("site_pages").delete().eq("slug", slug);
  }

  return getResolvedSitePage(slug);
}

export function resetSitePage(slug: string) {
  const pages = readLocalOverrides();
  delete pages[slug];
  writeLocalOverrides(pages);
  return getResolvedSitePage(slug);
}

export function hasSitePageOverride(slug: string) {
  return Boolean(readLocalOverrides()[slug]);
}

export async function hasRemoteSitePage(slug: string) {
  if (!isSupabaseConfigured()) return false;
  const { data } = await getSupabase()
    .from("site_pages")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  return Boolean(data?.slug);
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
