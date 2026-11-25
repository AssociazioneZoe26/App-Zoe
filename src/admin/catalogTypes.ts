import type { CourseLesson } from "../lib/courseVideo";

export type CatalogKind = "laboratorio" | "corso" | "workshop" | "online";

/** packs = 4, 8 e/o mensile sulla stessa scheda laboratorio; corso resta a parte. */
export type ProductOffer = "packs" | "pack4" | "pack8" | "monthly" | "course";

export type { CourseLesson };

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  age: string;
  kind: CatalogKind;
  audience: "Bambini" | "Tutti";
  accent: "blue" | "yellow" | "teal" | "pink";
  /** Visibile nel catalogo pubblico */
  published: boolean;
  /** Locandina scheda */
  previewImage: string;
  /** @deprecated Non più usato in UI; tenuto vuoto per compatibilità cloud */
  previewText: string;
  /** Descrizione scheda prodotto */
  fullText: string;
  points: string[];
  mantra: string;
  schedule?: string;
  time?: string;
  sessions?: string;
  place: string;
  teacher?: string;
  /** Solo online: video anteprima pubblico */
  coursePreviewVideoUrl?: string;
  /** Secondi di anteprima (default 15) */
  coursePreviewSeconds?: number;
  /** Solo online: un unico video completo (alternativa alle lezioni) */
  courseVideoUrl?: string;
  /** Solo online: fino a 10 lezioni con video completo */
  courseLessons?: CourseLesson[];
  /** Scadenza del corso (es. 30 giugno 2027) */
  courseDuration?: string;
  /** Inizio corso, YYYY-MM-DD */
  startsOn?: string;
  /** Fine corso, YYYY-MM-DD. Dal giorno dopo risulta scaduto. */
  endsOn?: string;
  /** Costo pacchetto 4 ingressi (€) */
  pricePack5?: number;
  /** Costo pacchetto 8 ingressi (€) */
  pricePack10?: number;
  /** Canone mensile rinnovabile dall’area socio (€) */
  priceMonthly?: number;
  /** Costo del corso intero (€) */
  priceCourse?: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivationSource = "manual" | "stripe";
export type PaymentChannel = "sede" | "online";

export type ActivationPlan = "pack" | "monthly";

export type ProductActivation = {
  id: string;
  productId: string;
  memberName: string;
  memberEmail: string;
  source: ActivationSource;
  status: "active" | "expired";
  /** Per laboratori / pacchetti ingressi */
  entriesTotal: number;
  entriesUsed: number;
  /** pack = ingressi 4/8; monthly = abbonamento 30 giorni */
  plan?: ActivationPlan;
  /** Per corsi a quota fissa (€) */
  amountPaid?: number;
  paymentChannel?: PaymentChannel;
  note?: string;
  participantId?: string | null;
  /** Nome del figlio a cui è associato il pacchetto */
  participantName?: string | null;
  /** Inizio corso, YYYY-MM-DD */
  startsOn?: string;
  /** Fine corso, YYYY-MM-DD */
  endsOn?: string;
  createdAt: string;
  updatedAt: string;
};

export function inferProductOffer(source: {
  kind?: string;
  online?: boolean;
  pricePack5?: number;
  pricePack10?: number;
  priceMonthly?: number;
  priceCourse?: number;
}): ProductOffer {
  if (source.kind === "corso" || source.kind === "online" || source.online) {
    return "course";
  }
  const pack4 = typeof source.pricePack5 === "number";
  const pack8 = typeof source.pricePack10 === "number";
  const monthly = typeof source.priceMonthly === "number";
  const course = typeof source.priceCourse === "number";
  if (pack4 || pack8) return "packs";
  if (monthly) return "monthly";
  if (course) return "course";
  if (source.kind === "laboratorio" || source.kind === "workshop") return "packs";
  return "course";
}

export function priceForOffer(
  source: {
    pricePack5?: number;
    pricePack10?: number;
    priceMonthly?: number;
    priceCourse?: number;
  },
  offer: ProductOffer = inferProductOffer(source),
) {
  if (offer === "packs" || offer === "pack4") return source.pricePack5 ?? source.pricePack10;
  if (offer === "pack8") return source.pricePack10;
  if (offer === "monthly") return source.priceMonthly;
  return source.priceCourse;
}

export function pricesForOffer(
  offer: ProductOffer,
  price: number | undefined,
  extra?: { pack4?: number; pack8?: number; monthly?: number },
) {
  if (offer === "packs") {
    return {
      pricePack5: extra?.pack4,
      pricePack10: extra?.pack8,
      priceMonthly: extra?.monthly,
      priceCourse: undefined,
    };
  }
  return {
    pricePack5: offer === "pack4" ? price : undefined,
    pricePack10: offer === "pack8" ? price : undefined,
    priceMonthly: offer === "monthly" ? price : undefined,
    priceCourse: offer === "course" ? price : undefined,
  };
}

export function offerLabel(offer: ProductOffer) {
  if (offer === "packs") return "4, 8 ingressi o abbonamento mensile";
  if (offer === "pack4") return "Pacchetto 4 ingressi";
  if (offer === "pack8") return "Pacchetto 8 ingressi";
  if (offer === "monthly") return "Abbonamento mensile";
  return "Costo corso";
}

export function offerEntries(offer: ProductOffer, packSize: 4 | 8 = 4) {
  if (offer === "pack8") return 8;
  if (offer === "pack4") return 4;
  if (offer === "packs") return packSize;
  return 1;
}

export function productUsesEntries(product: CatalogProduct) {
  return typeof product.pricePack5 === "number" || typeof product.pricePack10 === "number";
}

export function productHasMonthlyPrice(product: CatalogProduct) {
  return typeof product.priceMonthly === "number";
}

export function productUsesMonthly(product: CatalogProduct) {
  return productHasMonthlyPrice(product) && !productUsesEntries(product);
}

export function productUsesCourseFee(product: CatalogProduct) {
  return inferProductOffer(product) === "course";
}

export const accessOfferOptions: { id: ProductOffer; label: string }[] = [
  { id: "packs", label: "4, 8 ingressi e abbonamento mensile" },
];

export function paymentChannelLabel(channel: PaymentChannel | undefined) {
  if (channel === "online") return "Pagato online";
  return "Pagato in sede";
}

export const catalogKindOptions: { id: CatalogKind; label: string }[] = [
  { id: "laboratorio", label: "Laboratori" },
  { id: "corso", label: "Corsi" },
  { id: "workshop", label: "Workshop" },
  { id: "online", label: "Online" },
];

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
