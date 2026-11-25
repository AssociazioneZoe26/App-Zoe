import {
  deleteProductFromSupabase,
  fetchAllProductsFromSupabase,
  fetchPublishedProductsFromSupabase,
  syncProductToSupabase,
} from "../lib/commerce";
import { isSupabaseConfigured } from "../lib/supabase";
import { normalizeLessons } from "../lib/courseVideo";
import {
  reconcilePassActivationStatus,
  removePassByActivationId,
  removePassesForProduct,
  updatePassesForProduct,
  upsertPassFromActivation,
} from "../member/passesStore";
import {
  inferProductOffer,
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

/** Sostituisce la cache locale con i prodotti cloud (sorgente primaria). */
export function replaceLocalProducts(remote: CatalogProduct[]) {
  const sorted = [...remote].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  writeJson(PRODUCTS_KEY, sorted);
  return sorted;
}

/**
 * Unisce i prodotti remoti nella cache locale (per slug).
 * Usato solo come fallback offline / migrazione; preferire replaceLocalProducts.
 */
export function mergeRemoteProducts(remote: CatalogProduct[], preferLocalIfNewer = true) {
  if (remote.length === 0) return listProducts();
  const local = listProducts();
  const bySlug = new Map(local.map((product) => [product.slug, product]));
  for (const product of remote) {
    const previous = bySlug.get(product.slug);
    if (!previous) {
      bySlug.set(product.slug, product);
      continue;
    }
    const localIsNewer =
      preferLocalIfNewer && previous.updatedAt.localeCompare(product.updatedAt) > 0;
    bySlug.set(
      product.slug,
      localIsNewer
        ? { ...previous, id: product.id || previous.id }
        : { ...previous, ...product, id: product.id },
    );
  }
  const merged = [...bySlug.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  writeJson(PRODUCTS_KEY, merged);
  return merged;
}

export async function hydratePublishedCatalog() {
  const remote = await fetchPublishedProductsFromSupabase();
  if (remote && remote.length > 0) {
    // Pubblico: aggiorna solo le schede pubblicate dal cloud, senza cancellare bozze locali.
    mergeRemoteProducts(remote, false);
  }
  return listPublishedProducts();
}

/** Pubblica sul cloud tutti i prodotti già presenti solo in locale. */
export async function pushLocalProductsToRemote() {
  const products = listProducts();
  let ok = 0;
  for (const product of products) {
    const result = await syncProductToSupabase(product);
    if (result.ok) ok += 1;
  }
  return ok;
}

export async function hydrateAdminCatalog() {
  // Prima eventuali prodotti solo-locali, poi il cloud diventa fonte di verità.
  if (isSupabaseConfigured() && listProducts().length > 0) {
    await pushLocalProductsToRemote();
  }
  const remote = await fetchAllProductsFromSupabase();
  if (remote) {
    replaceLocalProducts(remote);
  }
  return listProducts();
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
      slug: input.slug?.trim()
        ? uniqueSlug(input.slug, current.id)
        : current.slug,
      coursePreviewVideoUrl:
        input.kind === "online" ? input.coursePreviewVideoUrl?.trim() || "" : "",
      coursePreviewSeconds:
        input.kind === "online" ? input.coursePreviewSeconds : undefined,
      courseVideoUrl: input.kind === "online" ? input.courseVideoUrl?.trim() || "" : "",
      courseLessons: input.kind === "online" ? normalizeLessons(input.courseLessons) : [],
      updatedAt: now,
    };
    products[index] = next;
    writeJson(PRODUCTS_KEY, products);
    updatePassesForProduct(next.id, {
      activitySlug: next.slug,
      activityTitle: next.title,
    });
    return next;
  }

  const created: CatalogProduct = {
    ...input,
    id: makeId("prod"),
    slug: uniqueSlug(input.slug || input.title),
    coursePreviewVideoUrl:
      input.kind === "online" ? input.coursePreviewVideoUrl?.trim() || "" : "",
    coursePreviewSeconds: input.kind === "online" ? input.coursePreviewSeconds : undefined,
    courseVideoUrl: input.kind === "online" ? input.courseVideoUrl?.trim() || "" : "",
    courseLessons: input.kind === "online" ? normalizeLessons(input.courseLessons) : [],
    createdAt: now,
    updatedAt: now,
  };
  products.unshift(created);
  writeJson(PRODUCTS_KEY, products);
  return created;
}

/** Salva in locale e pubblica subito su Supabase. */
export async function saveProductAndSync(
  input: ProductInput,
  id?: string,
): Promise<{ product: CatalogProduct; syncOk: boolean; syncError?: string }> {
  const product = saveProduct(input, id);
  const result = await syncProductToSupabase(product);
  if (!result.ok) {
    return { product, syncOk: false, syncError: result.error };
  }

  // Allinea l’id locale all’UUID Supabase e ricarica dal cloud.
  if (result.id && result.id !== product.id) {
    const products = listProducts().map((item) =>
      item.id === product.id ? { ...item, id: result.id } : item,
    );
    writeJson(PRODUCTS_KEY, products);
  }
  await hydrateAdminCatalog();
  const refreshed = getProductBySlug(product.slug) || getProduct(result.id) || product;
  return { product: refreshed, syncOk: true };
}

export function deleteProduct(id: string) {
  const product = getProduct(id);
  writeJson(
    PRODUCTS_KEY,
    listProducts().filter((item) => item.id !== id && item.slug !== product?.slug),
  );
  writeJson(
    ACTIVATIONS_KEY,
    listActivations().filter(
      (activation) =>
        activation.productId !== id &&
        !(product && activation.productId === product.id),
    ),
  );
  removePassesForProduct(id, product?.slug);
}

/** Mette il prodotto in bozza (non pubblico) su Supabase e in cache. */
export async function archiveProductAndSync(id: string) {
  const product = getProduct(id);
  if (!product) return { ok: false as const, error: "Prodotto non trovato." };

  const next = { ...product, published: false, updatedAt: new Date().toISOString() };
  const products = listProducts().map((item) => (item.id === id ? next : item));
  writeJson(PRODUCTS_KEY, products);

  if (isSupabaseConfigured()) {
    const result = await syncProductToSupabase(next);
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    await hydrateAdminCatalog();
  }

  return { ok: true as const, product: getProduct(id) || next };
}

/** Elimina su Supabase e poi dalla cache locale. */
export async function deleteProductAndSync(id: string) {
  const product = getProduct(id);
  if (!product) return { ok: false as const, error: "Prodotto non trovato.", code: "not_found" as const };

  if (isSupabaseConfigured()) {
    const remote = await deleteProductFromSupabase(product);
    if (!remote.ok) {
      const blocked = /iscrizioni o ordini|foreign key/i.test(remote.error);
      return {
        ok: false as const,
        error: remote.error,
        code: blocked ? ("fk_blocked" as const) : ("remote_error" as const),
      };
    }
  }

  deleteProduct(product.id);
  return { ok: true as const };
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
  plan?: "pack" | "monthly";
  participantId?: string | null;
  participantName?: string | null;
  startsOn?: string;
  endsOn?: string;
};

export function activateManually(input: ActivationInput): ProductActivation {
  const now = new Date().toISOString();
  const channel = input.paymentChannel ?? "sede";
  const plan = input.plan ?? "pack";
  const activation: ProductActivation = {
    id: makeId("act"),
    productId: input.productId,
    memberName: input.memberName.trim(),
    memberEmail: input.memberEmail.trim().toLowerCase(),
    source: channel === "online" ? "stripe" : "manual",
    status: "active",
    entriesTotal:
      plan === "monthly" ? 1 : Math.max(1, Math.floor(input.entriesTotal ?? 1) || 1),
    entriesUsed: 0,
    plan,
    amountPaid:
      typeof input.amountPaid === "number" && !Number.isNaN(input.amountPaid)
        ? input.amountPaid
        : undefined,
    paymentChannel: channel,
    note: input.note?.trim() || "",
    participantId: input.participantId || null,
    participantName: input.participantName?.trim() || null,
    startsOn: input.startsOn || undefined,
    endsOn: input.endsOn || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const activations = listActivations();
  activations.unshift(activation);
  writeJson(ACTIVATIONS_KEY, activations);

  const product = getProduct(activation.productId);
  if (product) {
    const isCourse = inferProductOffer(product) === "course";
    upsertPassFromActivation({
      activationId: activation.id,
      productId: product.id,
      memberEmail: activation.memberEmail,
      memberName: activation.memberName,
      activitySlug: product.slug,
      activityTitle: product.title,
      entriesTotal: isCourse || plan === "monthly" ? 1 : activation.entriesTotal,
      entriesUsed: activation.entriesUsed,
      amountPaid: activation.amountPaid,
      paymentChannel: activation.paymentChannel,
      passKind: isCourse ? "course" : "entries",
      plan: isCourse ? "course" : plan,
      startsAt: activation.startsOn || activation.createdAt,
      endsAt: activation.endsOn,
      participantId: activation.participantId,
      participantName: activation.participantName,
    });
  }

  return activation;
}

/** Attiva in locale e sincronizza subito su Supabase (visibile dal cellulare). */
export async function activateManuallyAndSync(input: ActivationInput) {
  const activation = activateManually(input);
  const { syncActivationToSupabase } = await import("../lib/cloudSync");
  const sync = await syncActivationToSupabase(activation.id);
  return { activation, syncOk: sync.ok, syncError: sync.ok ? undefined : sync.error };
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
  reconcilePassActivationStatus(activations);
}

/** Elimina un’attivazione locale (utile per doppioni stesso socio + prodotto). */
export function deleteActivation(id: string) {
  const activations = listActivations();
  const target = activations.find((activation) => activation.id === id);
  if (!target) return null;
  const remaining = activations.filter((activation) => activation.id !== id);
  writeJson(ACTIVATIONS_KEY, remaining);
  removePassByActivationId(id);
  reconcilePassActivationStatus(remaining);
  return target;
}

export async function deleteActivationAndSync(id: string) {
  const target = deleteActivation(id);
  if (!target) return { ok: false as const, error: "not_found" };

  const { syncMemberPassesFromActivations } = await import("../member/syncMemberPasses");
  syncMemberPassesFromActivations();

  const stillActive = listActivations().some(
    (activation) =>
      activation.status === "active" &&
      activation.productId === target.productId &&
      activation.memberEmail.trim().toLowerCase() ===
        target.memberEmail.trim().toLowerCase(),
  );
  if (stillActive) {
    return { ok: true as const, revokedRemote: false };
  }

  const { revokeActivationAccessOnSupabase } = await import("../lib/cloudSync");
  const remote = await revokeActivationAccessOnSupabase(target);
  return {
    ok: remote.ok,
    revokedRemote: remote.ok,
    error: remote.ok ? undefined : remote.error,
  };
}

export function setActivationEntriesUsed(id: string, entriesUsed: number) {
  const activations = listActivations();
  const index = activations.findIndex((activation) => activation.id === id);
  if (index === -1) return;
  const total = Math.max(1, activations[index].entriesTotal);
  activations[index] = {
    ...activations[index],
    entriesUsed: Math.min(Math.max(0, entriesUsed), total),
    updatedAt: new Date().toISOString(),
  };
  writeJson(ACTIVATIONS_KEY, activations);
}

export function setActivationEntriesTotal(
  id: string,
  entriesTotal: number,
  entriesUsed: number,
) {
  const activations = listActivations();
  const index = activations.findIndex((activation) => activation.id === id);
  if (index === -1) return;
  const total = Math.max(1, Math.floor(entriesTotal) || 1);
  activations[index] = {
    ...activations[index],
    entriesTotal: total,
    entriesUsed: Math.min(Math.max(0, entriesUsed), total),
    updatedAt: new Date().toISOString(),
  };
  writeJson(ACTIVATIONS_KEY, activations);
}
