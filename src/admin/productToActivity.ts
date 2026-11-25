import { activities as seedActivities, getActivity as getSeedActivity, type Activity } from "../data";
import { normalizeLessons } from "../lib/courseVideo";
import { hydratePublishedCatalog, listPublishedProducts } from "./catalogStore";
import {
  inferProductOffer,
  priceForOffer,
  pricesForOffer,
  type CatalogProduct,
} from "./catalogTypes";

export function productToActivity(product: CatalogProduct): Activity {
  const online = product.kind === "online";
  const offer = inferProductOffer(product);
  const prices =
    offer === "packs"
      ? {
          pricePack5: product.pricePack5,
          pricePack10: product.pricePack10,
          priceMonthly: product.priceMonthly,
          priceCourse: undefined,
        }
      : pricesForOffer(offer, priceForOffer(product, offer));
  return {
    slug: product.slug,
    title: product.title,
    eyebrow: product.eyebrow || productKindLabel(product),
    age: product.age || "Tutte le età",
    category: product.kind === "laboratorio" ? "Laboratorio" : "Corso",
    workshop: product.kind === "workshop",
    audience: product.audience,
    online,
    summary: "",
    points: product.points.filter(Boolean),
    mantra: product.mantra || "Costruisci, immagina, impara",
    schedule: product.schedule || undefined,
    time: product.time || undefined,
    sessions: product.sessions || undefined,
    place: product.place || (online ? "Online" : "Via Li Punti 12, Sassari"),
    phone: online ? "393515054315" : "393473814081",
    phoneLabel: online ? "351 5054315" : "347 3814081",
    image: product.previewImage || undefined,
    accent: product.accent,
    teacher: product.teacher || undefined,
    coursePreviewVideoUrl: online ? product.coursePreviewVideoUrl || undefined : undefined,
    coursePreviewSeconds: online ? product.coursePreviewSeconds : undefined,
    courseVideoUrl: online ? product.courseVideoUrl || undefined : undefined,
    courseLessons: online ? normalizeLessons(product.courseLessons) : undefined,
    fullText: product.fullText.trim() || product.previewText.trim() || undefined,
    courseDuration: product.courseDuration || undefined,
    courseStartsOn: product.startsOn || undefined,
    courseEndsOn: product.endsOn || undefined,
    offer,
    ...prices,
  };
}

function productKindLabel(product: CatalogProduct) {
  if (product.kind === "laboratorio") return "Laboratorio";
  if (product.kind === "workshop") return "Workshop";
  if (product.kind === "online") return "Online";
  return "Corso";
}

function catalogDedupeKey(activity: Pick<Activity, "title" | "category" | "offer">) {
  const normalized = activity.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\d+\s*[–-]\s*\d+\s*anni/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const offer = activity.offer === "pack4" || activity.offer === "pack8" ? "packs" : activity.offer || "packs";

  // Unifica le varianti "Laboratorio/i LEGO" nello stesso tipo di offerta.
  if (activity.category === "Laboratorio" && normalized.includes("lego")) {
    return `laboratorio-lego:${offer}`;
  }

  return `${activity.category}:${normalized.split(/\s+/).slice(0, 2).join(" ")}:${offer}`;
}

export function getCatalogActivities(
  seed: Activity[] = seedActivities,
  published: CatalogProduct[] = listPublishedProducts(),
): Activity[] {
  const fromAdmin = published.map(productToActivity);
  const adminSlugs = new Set(fromAdmin.map((item) => item.slug));
  const adminKeys = new Set(fromAdmin.map((item) => catalogDedupeKey(item)));

  // Evita doppioni e lascia i corsi solo a quelli creati/pubblicati da Team Zoe.
  const fromSeed = seed.filter(
    (item) =>
      item.category !== "Corso" &&
      !adminSlugs.has(item.slug) &&
      !adminKeys.has(catalogDedupeKey(item)),
  );

  return [...fromAdmin, ...fromSeed];
}

export function resolveActivity(slug: string | undefined) {
  if (!slug) return undefined;
  const published = listPublishedProducts().find((product) => product.slug === slug);
  if (published) return productToActivity(published);
  return getSeedActivity(slug);
}

export async function loadCatalogActivities(): Promise<Activity[]> {
  const published = await hydratePublishedCatalog();
  return getCatalogActivities(seedActivities, published);
}

export async function loadActivity(slug: string | undefined) {
  if (!slug) return undefined;
  await hydratePublishedCatalog();
  return resolveActivity(slug);
}
