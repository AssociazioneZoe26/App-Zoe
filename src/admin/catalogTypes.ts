export type CatalogKind = "laboratorio" | "corso" | "workshop" | "online";

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
  /** Anteprima (scheda catalogo / teaser) */
  previewImage: string;
  previewText: string;
  /** Corso completo: testo + punti; se online, anche video */
  fullText: string;
  points: string[];
  mantra: string;
  schedule?: string;
  time?: string;
  sessions?: string;
  place: string;
  teacher?: string;
  /** Solo per kind === "online": URL del video del corso */
  courseVideoUrl?: string;
  /** Durata complessiva del corso (es. 3 mesi, anno scolastico) */
  courseDuration?: string;
  /** Costo pacchetto 5 ingressi (€) */
  pricePack5?: number;
  /** Costo pacchetto 10 ingressi (€) */
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
  /** Per corsi a quota fissa (€) */
  amountPaid?: number;
  paymentChannel?: PaymentChannel;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export function productUsesEntries(product: CatalogProduct) {
  return product.kind === "laboratorio" || product.kind === "workshop";
}

export function productUsesCourseFee(product: CatalogProduct) {
  return product.kind === "corso" || product.kind === "online";
}

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
