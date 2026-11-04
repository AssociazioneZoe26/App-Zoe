import { activities as seedActivities, getActivity as getSeedActivity, type Activity } from "../data";
import { listPublishedProducts } from "./catalogStore";
import type { CatalogProduct } from "./catalogTypes";

export function productToActivity(product: CatalogProduct): Activity {
  return {
    slug: product.slug,
    title: product.title,
    eyebrow: product.eyebrow || productKindLabel(product),
    age: product.age || "Tutte le età",
    category: product.kind === "laboratorio" ? "Laboratorio" : "Corso",
    workshop: product.kind === "workshop",
    audience: product.audience,
    online: product.kind === "online",
    summary: product.previewText,
    points: product.points.filter(Boolean),
    mantra: product.mantra || "Costruisci, immagina, impara",
    schedule: product.schedule || undefined,
    time: product.time || undefined,
    sessions: product.sessions || undefined,
    place: product.place || (product.kind === "online" ? "Online" : "Via Li Punti 12, Sassari"),
    phone: product.kind === "online" ? "393515054315" : "393473814081",
    phoneLabel: product.kind === "online" ? "351 5054315" : "347 3814081",
    image: product.previewImage || undefined,
    accent: product.accent,
    teacher: product.teacher || undefined,
    courseVideoUrl: product.kind === "online" ? product.courseVideoUrl || undefined : undefined,
    fullText: product.fullText || undefined,
    courseDuration: product.courseDuration || undefined,
    pricePack5: product.pricePack5,
    pricePack10: product.pricePack10,
    priceMonthly: product.priceMonthly,
    priceCourse: product.priceCourse,
  };
}

function productKindLabel(product: CatalogProduct) {
  if (product.kind === "laboratorio") return "Laboratorio";
  if (product.kind === "workshop") return "Workshop";
  if (product.kind === "online") return "Online";
  return "Corso";
}

function catalogDedupeKey(activity: Pick<Activity, "title" | "category">) {
  const normalized = activity.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\d+\s*[–-]\s*\d+\s*anni/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  // Unifica le varianti "Laboratorio/i LEGO" in un solo prodotto.
  if (activity.category === "Laboratorio" && normalized.includes("lego")) {
    return "laboratorio-lego";
  }

  return `${activity.category}:${normalized.split(/\s+/).slice(0, 2).join(" ")}`;
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
