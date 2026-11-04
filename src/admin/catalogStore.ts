import { upsertPassFromActivation } from "../member/passesStore";
import {
  makeId,
  slugify,
  type CatalogProduct,
  type ProductActivation,
} from "./catalogTypes";

const PRODUCTS_KEY = "zoe-admin-catalog-products";
const ACTIVATIONS_KEY = "zoe-admin-catalog-activations";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function listProducts(): CatalogProduct[] {
  return readJson<CatalogProduct[]>(PRODUCTS_KEY, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getProduct(id: string) {
  return listProducts().find((product) => product.id === id);
}

export function getProductBySlug(slug: string) {
  return listProducts().find((product) => product.slug === slug);
}

export function listPublishedProducts(): CatalogProduct[] {
  return listProducts().filter((product) => product.published);
}

function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || "prodotto";
  const existing = listProducts().filter((product) => product.id !== exceptId);
  let candidate = root;
  let n = 2;
  while (existing.some((product) => product.slug === candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

export type ProductInput = Omit<CatalogProduct, "id" | "slug" | "createdAt" | "updatedAt"> & {
  slug?: string;
  pricePack5?: number;
  pricePack10?: number;
  priceMonthly?: number;
  priceCourse?: number;
};

export function saveProduct(input: ProductInput, id?: string): CatalogProduct {
  const now = new Date().toISOString();
  const products = listProducts();
  if (id) {
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) throw new Error("Prodotto non trovato");
    const current = products[index];
    const next: CatalogProduct = {
      ...current,
      ...input,
      id: current.id,
      slug: uniqueSlug(input.slug || input.title, current.id),
      courseVideoUrl: input.kind === "online" ? input.courseVideoUrl?.trim() || "" : "",
      updatedAt: now,
    };
    products[index] = next;
    writeJson(PRODUCTS_KEY, products);
    return next;
  }

  const created: CatalogProduct = {
    ...input,
    id: makeId("prod"),
    slug: uniqueSlug(input.slug || input.title),
    courseVideoUrl: input.kind === "online" ? input.courseVideoUrl?.trim() || "" : "",
    createdAt: now,
    updatedAt: now,
  };
  products.unshift(created);
  writeJson(PRODUCTS_KEY, products);
  return created;
}

export function deleteProduct(id: string) {
  writeJson(
    PRODUCTS_KEY,
    listProducts().filter((product) => product.id !== id),
  );
  writeJson(
    ACTIVATIONS_KEY,
    listActivations().filter((activation) => activation.productId !== id),
  );
}

export function listActivations(): ProductActivation[] {
  return readJson<ProductActivation[]>(ACTIVATIONS_KEY, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function listActivationsForProduct(productId: string) {
  return listActivations().filter((activation) => activation.productId === productId);
}

export type ActivationInput = {
  productId: string;
  memberName: string;
  memberEmail: string;
  entriesTotal?: number;
  amountPaid?: number;
  paymentChannel?: "sede" | "online";
  note?: string;
};

export function activateManually(input: ActivationInput): ProductActivation {
  const now = new Date().toISOString();
  const channel = input.paymentChannel ?? "sede";
  const activation: ProductActivation = {
    id: makeId("act"),
    productId: input.productId,
    memberName: input.memberName.trim(),
    memberEmail: input.memberEmail.trim().toLowerCase(),
    source: channel === "online" ? "stripe" : "manual",
    status: "active",
    entriesTotal: Math.max(1, Math.floor(input.entriesTotal ?? 1) || 1),
    entriesUsed: 0,
    amountPaid:
      typeof input.amountPaid === "number" && !Number.isNaN(input.amountPaid)
        ? input.amountPaid
        : undefined,
    paymentChannel: channel,
    note: input.note?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };
  const activations = listActivations();
  activations.unshift(activation);
  writeJson(ACTIVATIONS_KEY, activations);

  const product = getProduct(activation.productId);
  if (product) {
    const isCourse =
      product.kind === "corso" || product.kind === "online";
    upsertPassFromActivation({
      activationId: activation.id,
      productId: product.id,
      memberEmail: activation.memberEmail,
      memberName: activation.memberName,
      activitySlug: product.slug,
      activityTitle: product.title,
      entriesTotal: isCourse ? 1 : activation.entriesTotal,
      entriesUsed: activation.entriesUsed,
      amountPaid: activation.amountPaid,
      paymentChannel: activation.paymentChannel,
      passKind: isCourse ? "course" : "entries",
    });
  }

  return activation;
}

export function setActivationStatus(id: string, status: ProductActivation["status"]) {
  const activations = listActivations();
  const index = activations.findIndex((activation) => activation.id === id);
  if (index === -1) return;
  activations[index] = {
    ...activations[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  writeJson(ACTIVATIONS_KEY, activations);
}
