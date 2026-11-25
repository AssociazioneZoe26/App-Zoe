import type { CatalogKind, CatalogProduct, CourseLesson } from "../admin/catalogTypes";
import { normalizeLessons } from "./courseVideo";
import { getSupabase, getSupabaseFunctionsUrl, isSupabaseConfigured } from "./supabase";

export type PriceOption = "pack5" | "pack10" | "monthly" | "course" | "workshop" | "online";

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string | null;
  age: string | null;
  kind: string;
  audience: string | null;
  accent: string | null;
  published: boolean;
  preview_image: string | null;
  preview_text: string | null;
  full_text: string | null;
  points: string[] | null;
  mantra: string | null;
  schedule: string | null;
  time_label: string | null;
  sessions: string | null;
  place: string | null;
  teacher: string | null;
  course_preview_video_url: string | null;
  course_preview_seconds: number | null;
  course_video_url: string | null;
  course_lessons: CourseLesson[] | null;
  course_duration: string | null;
  starts_on: string | null;
  ends_on: string | null;
  price_pack5: number | null;
  price_pack10: number | null;
  price_monthly: number | null;
  price_course: number | null;
  created_at: string;
  updated_at: string;
};

function numOrUndef(value: number | null | undefined) {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

export function mapProductRowToCatalog(row: ProductRow): CatalogProduct {
  const kind = (["laboratorio", "corso", "workshop", "online"].includes(row.kind)
    ? row.kind
    : "corso") as CatalogKind;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eyebrow: row.eyebrow || "",
    age: row.age || "",
    kind,
    audience: row.audience === "Bambini" ? "Bambini" : "Tutti",
    accent:
      row.accent === "yellow" || row.accent === "teal" || row.accent === "pink"
        ? row.accent
        : "blue",
    published: Boolean(row.published),
    previewImage: row.preview_image || "",
    previewText: row.preview_text || "",
    fullText: row.full_text || "",
    points: Array.isArray(row.points) ? row.points : [],
    mantra: row.mantra || "",
    schedule: row.schedule || undefined,
    time: row.time_label || undefined,
    sessions: row.sessions || undefined,
    place: row.place || "",
    teacher: row.teacher || undefined,
    coursePreviewVideoUrl: row.course_preview_video_url || undefined,
    coursePreviewSeconds: row.course_preview_seconds ?? undefined,
    courseVideoUrl: row.course_video_url || undefined,
    courseLessons: normalizeLessons(row.course_lessons || undefined),
    courseDuration: row.course_duration || undefined,
    startsOn: row.starts_on || undefined,
    endsOn: row.ends_on || undefined,
    pricePack5: numOrUndef(row.price_pack5),
    pricePack10: numOrUndef(row.price_pack10),
    priceMonthly: numOrUndef(row.price_monthly),
    priceCourse: numOrUndef(row.price_course),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function uploadProductImageIfNeeded(
  value: string | undefined,
  pathPrefix: string,
): Promise<string | undefined> {
  if (!value || !value.startsWith("data:image") || !isSupabaseConfigured()) return value;
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(value);
  if (!match) return value;
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
  const path = `${pathPrefix}-${Date.now()}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("site-media").upload(path, bytes, {
    upsert: true,
    contentType: mime,
  });
  if (error) {
    console.error("product image upload failed", error.message);
    return value;
  }
  return supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl || value;
}

export async function fetchPublishedProductsFromSupabase(): Promise<CatalogProduct[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from("products")
    .select("*")
    .eq("published", true)
    .order("updated_at", { ascending: false });
  if (error || !data) {
    console.error("fetch products failed", error?.message);
    return null;
  }
  return (data as ProductRow[]).map(mapProductRowToCatalog);
}

export async function fetchAllProductsFromSupabase(): Promise<CatalogProduct[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error || !data) {
    console.error("fetch all products failed", error?.message);
    return null;
  }
  return (data as ProductRow[]).map(mapProductRowToCatalog);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function fkDeleteError(message: string) {
  if (/foreign key|violates foreign key/i.test(message)) {
    return "Impossibile eliminare: ci sono già iscrizioni o ordini collegati. Metti il prodotto in bozza.";
  }
  return message;
}

/** Elimina un prodotto dal catalogo Supabase (per id UUID o slug). */
export async function deleteProductFromSupabase(product: { id: string; slug: string }) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "not_configured" };
  const supabase = getSupabase();

  if (isUuid(product.id)) {
    const byId = await supabase.from("products").delete().eq("id", product.id).select("id");
    if (byId.error) {
      return { ok: false as const, error: fkDeleteError(byId.error.message) };
    }
    if (byId.data && byId.data.length > 0) {
      return { ok: true as const };
    }
  }

  const bySlug = await supabase.from("products").delete().eq("slug", product.slug).select("id");
  if (bySlug.error) {
    return { ok: false as const, error: fkDeleteError(bySlug.error.message) };
  }
  return { ok: true as const };
}

async function authHeader(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
}

export async function invokeFunction<T>(
  name: string,
  accessToken: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }
  const res = await fetch(`${getSupabaseFunctionsUrl()}/${name}`, {
    method: "POST",
    headers: await authHeader(accessToken),
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; detail?: string };
  if (!res.ok) {
    return {
      ok: false,
      error: json.error
        ? `${json.error}${json.detail ? `: ${json.detail}` : ""}`
        : `Errore ${res.status}`,
    };
  }
  return { ok: true, data: json as T };
}

export async function createOrder(
  accessToken: string,
  input: {
    productId?: string;
    productSlug?: string;
    priceOption: PriceOption;
    participantId?: string | null;
  },
) {
  return invokeFunction<{ orderId: string; totalCents: number; status: string }>(
    "create-order",
    accessToken,
    input,
  );
}

export async function mockConfirmPayment(accessToken: string, orderId: string) {
  return invokeFunction<{ orderId: string; status: string }>(
    "mock-confirm-payment",
    accessToken,
    { orderId },
  );
}

export async function mockFailPayment(accessToken: string, orderId: string) {
  return invokeFunction<{ orderId: string; status: string }>(
    "mock-fail-payment",
    accessToken,
    { orderId },
  );
}

export function isMockPaymentsUiEnabled() {
  return import.meta.env.DEV && isSupabaseConfigured();
}

/** Upsert prodotto catalogo locale su Supabase (id locale come slug key se non uuid). */
export async function syncProductToSupabase(product: {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  age: string;
  kind: string;
  audience: string;
  accent: string;
  published: boolean;
  previewImage: string;
  previewText: string;
  fullText: string;
  points: string[];
  mantra: string;
  schedule?: string;
  time?: string;
  sessions?: string;
  place: string;
  teacher?: string;
  coursePreviewVideoUrl?: string;
  coursePreviewSeconds?: number;
  courseVideoUrl?: string;
  courseLessons?: { title: string; url: string }[];
  courseDuration?: string;
  startsOn?: string;
  endsOn?: string;
  pricePack5?: number;
  pricePack10?: number;
  priceMonthly?: number;
  priceCourse?: number;
}) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "not_configured" };
  const supabase = getSupabase();

  const previewImage =
    (await uploadProductImageIfNeeded(
      product.previewImage,
      `products/${product.slug}/preview`,
    )) || product.previewImage;

  const row = {
    slug: product.slug,
    title: product.title,
    eyebrow: product.eyebrow,
    age: product.age,
    kind: product.kind,
    audience: product.audience,
    accent: product.accent,
    published: product.published,
    preview_image: previewImage,
    preview_text: product.previewText,
    full_text: product.fullText,
    points: product.points,
    mantra: product.mantra,
    schedule: product.schedule || null,
    time_label: product.time || null,
    sessions: product.sessions || null,
    place: product.place,
    teacher: product.teacher || null,
    course_preview_video_url: product.coursePreviewVideoUrl || null,
    course_preview_seconds: product.coursePreviewSeconds ?? 15,
    course_video_url: product.courseVideoUrl || null,
    course_lessons: product.courseLessons?.length ? product.courseLessons : [],
    course_duration: product.courseDuration || null,
    starts_on: product.startsOn || null,
    ends_on: product.endsOn || null,
    price_pack5: product.pricePack5 ?? null,
    price_pack10: product.pricePack10 ?? null,
    price_monthly: product.priceMonthly ?? null,
    price_course: product.priceCourse ?? null,
  };

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("slug", product.slug)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("products").update(row).eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: existing.id as string };
  }

  const { data, error } = await supabase.from("products").insert(row).select("id").single();
  if (error || !data) return { ok: false as const, error: error?.message || "insert_failed" };
  return { ok: true as const, id: data.id as string };
}

export async function resolveSupabaseProductIdBySlug(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabase()
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}
