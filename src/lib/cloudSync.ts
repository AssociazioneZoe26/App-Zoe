import {
  listActivations,
  listProducts,
  pushLocalProductsToRemote,
} from "../admin/catalogStore";
import { productUsesCourseFee, productUsesMonthly } from "../admin/catalogTypes";
import { courseDateToTimestamp } from "./coursePeriod";
import { resolveSupabaseProductIdBySlug, syncProductToSupabase } from "./commerce";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export type CloudSyncResult = {
  products: number;
  pages: number;
  activations: number;
  errors: string[];
};

async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { data } = await getSupabase()
    .from("profiles")
    .select("id, email")
    .ilike("email", normalized)
    .maybeSingle();
  return data?.id ?? null;
}

function entitlementKind(kind: string) {
  if (kind === "online") return "online";
  if (kind === "workshop") return "workshop";
  if (kind === "corso") return "course";
  return null;
}

/** Sincronizza una singola attivazione locale su Supabase. */
export async function syncActivationToSupabase(activationId: string) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "not_configured" };

  const activation = listActivations().find((item) => item.id === activationId);
  if (!activation || activation.status !== "active") {
    return { ok: false as const, error: "activation_not_found" };
  }

  const product = listProducts().find((item) => item.id === activation.productId);
  if (!product) return { ok: false as const, error: "product_not_found" };

  // Assicura che il prodotto sia online
  const synced = await syncProductToSupabase(product);
  if (!synced.ok) return { ok: false as const, error: synced.error };

  const productId =
    (await resolveSupabaseProductIdBySlug(product.slug)) || synced.id;
  if (!productId) return { ok: false as const, error: "product_remote_missing" };

  const userId = await findUserIdByEmail(activation.memberEmail);
  if (!userId) {
    return {
      ok: false as const,
      error: `socio_non_trovato:${activation.memberEmail}`,
    };
  }

  const supabase = getSupabase();
  const monthly = activation.plan === "monthly" || productUsesMonthly(product);

  if (monthly || productUsesCourseFee(product)) {
    const entKind = monthly ? "monthly" : entitlementKind(product.kind) || "course";
    const isCourse = productUsesCourseFee(product) && !monthly;
    const courseDates = isCourse
      ? {
          starts_at: activation.startsOn ? courseDateToTimestamp(activation.startsOn) : undefined,
          ends_at: activation.endsOn ? courseDateToTimestamp(activation.endsOn) : undefined,
          participant_id: activation.participantId || null,
        }
      : {};
    let existingQuery = supabase
      .from("entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("status", "active");
    existingQuery = isCourse
      ? activation.participantId
        ? existingQuery.eq("participant_id", activation.participantId)
        : existingQuery.is("participant_id", null)
      : existingQuery;
    const { data: matched } = await existingQuery.maybeSingle();
    let existingId = matched?.id as string | undefined;
    if (!existingId && isCourse && activation.participantId) {
      const { data: unassigned } = await supabase
        .from("entitlements")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("status", "active")
        .is("participant_id", null)
        .maybeSingle();
      existingId = unassigned?.id as string | undefined;
    }
    if (existingId) {
      if (isCourse && (activation.startsOn || activation.endsOn || activation.participantId)) {
        const { error } = await supabase
          .from("entitlements")
          .update({
            participant_id: activation.participantId || null,
            ...(activation.startsOn
              ? { starts_at: courseDateToTimestamp(activation.startsOn) }
              : {}),
            ...(activation.endsOn ? { ends_at: courseDateToTimestamp(activation.endsOn) } : {}),
          })
          .eq("id", existingId);
        if (error) return { ok: false as const, error: error.message };
      }
      return { ok: true as const, id: existingId };
    }

    const { data, error } = await supabase
      .from("entitlements")
      .insert({
        user_id: userId,
        product_id: productId,
        kind: entKind,
        status: "active",
        source: "manual",
        ...(monthly
          ? { ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
          : courseDates),
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: data.id as string };
  }

  const packTotal = Math.max(1, activation.entriesTotal);
  let existingQuery = supabase
    .from("entry_packs")
    .select("id, entries_total, entries_used")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("status", "active")
    .eq("entries_total", packTotal);
  existingQuery = activation.participantId
    ? existingQuery.eq("participant_id", activation.participantId)
    : existingQuery.is("participant_id", null);
  const { data: existingPack } = await existingQuery.limit(1).maybeSingle();

  if (existingPack?.id) {
    return { ok: true as const, id: existingPack.id };
  }

  const { data, error } = await supabase
    .from("entry_packs")
    .insert({
      user_id: userId,
      product_id: productId,
      entries_total: Math.max(1, activation.entriesTotal),
      entries_used: Math.min(activation.entriesUsed, activation.entriesTotal),
      status: "active",
      source: "manual",
      participant_id: activation.participantId || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data.id as string };
}

/** Revoca entitlement/pack online se non restano altre attivazioni locali attive. */
export async function revokeActivationAccessOnSupabase(activation: {
  memberEmail: string;
  productId: string;
  plan?: "pack" | "monthly";
}) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "not_configured" };

  const product = listProducts().find((item) => item.id === activation.productId);
  if (!product) return { ok: false as const, error: "product_not_found" };

  const userId = await findUserIdByEmail(activation.memberEmail);
  if (!userId) return { ok: true as const }; // niente da revocare online

  const productId =
    (await resolveSupabaseProductIdBySlug(product.slug)) || product.id;
  const supabase = getSupabase();
  const monthly = activation.plan === "monthly" || productUsesMonthly(product);

  if (monthly || productUsesCourseFee(product)) {
    const { error } = await supabase
      .from("entitlements")
      .update({ status: "revoked" })
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("status", "active");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  }

  const { error } = await supabase
    .from("entry_packs")
    .update({ status: "revoked" })
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("status", "active");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Carica i pacchetti ingressi da Supabase nella cache locale (pagina admin Ingressi). */
export async function hydrateMemberPassesFromSupabase() {
  if (!isSupabaseConfigured()) return { ok: false as const, count: 0, error: "not_configured" };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("entry_packs")
    .select(
      "id, entries_total, entries_used, status, updated_at, user_id, products(id, title, slug)",
    )
    .eq("status", "active");

  if (error) return { ok: false as const, count: 0, error: error.message };

  const { upsertPassFromRemote } = await import("../member/passesStore");
  let count = 0;
  for (const row of data ?? []) {
    const product = row.products as { id?: string; title?: string; slug?: string } | null;
    if (!product?.slug) continue;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", row.user_id)
      .maybeSingle();
    if (!profile?.email) continue;
    upsertPassFromRemote({
      remoteId: row.id as string,
      memberEmail: profile.email,
      memberName: profile.full_name || profile.email,
      activitySlug: product.slug,
      activityTitle: product.title || product.slug,
      productId: product.id,
      entriesTotal: row.entries_total,
      entriesUsed: row.entries_used,
      updatedAt: row.updated_at,
    });
    count += 1;
  }
  return { ok: true as const, count };
}

/** Aggiorna entries_used di un pacchetto socio su Supabase (da pagina Ingressi admin). */
export async function syncMemberPassEntriesToSupabase(passId: string) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "not_configured" };

  const { getPass, passCounts } = await import("../member/passesStore");
  const pass = getPass(passId);
  if (!pass || pass.passKind === "course") {
    return { ok: false as const, error: "pass_not_found" };
  }

  const userId = await findUserIdByEmail(pass.memberEmail);
  if (!userId) return { ok: false as const, error: `socio_non_trovato:${pass.memberEmail}` };

  let productId = pass.productId || null;
  if (!productId) {
    productId = await resolveSupabaseProductIdBySlug(pass.activitySlug);
  } else {
    // id locale ≠ id remoto: risolvi sempre per slug se possibile
    const remoteId = await resolveSupabaseProductIdBySlug(pass.activitySlug);
    if (remoteId) productId = remoteId;
  }
  if (!productId) return { ok: false as const, error: "product_remote_missing" };

  const counts = passCounts(pass);
  const supabase = getSupabase();

  // Cerca per utente + slug prodotto (più affidabile dell'id locale)
  const { data: bySlug } = await supabase
    .from("entry_packs")
    .select("id, products!inner(slug)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("products.slug", pass.activitySlug)
    .maybeSingle();

  const packId =
    bySlug?.id ||
    (
      await supabase
        .from("entry_packs")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("status", "active")
        .maybeSingle()
    ).data?.id;

  if (packId) {
    const { error } = await supabase
      .from("entry_packs")
      .update({
        entries_total: Math.max(1, counts.purchased),
        entries_used: counts.used,
      })
      .eq("id", packId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: packId };
  }

  const { data, error } = await supabase
    .from("entry_packs")
    .insert({
      user_id: userId,
      product_id: productId,
      entries_total: Math.max(1, counts.purchased),
      entries_used: counts.used,
      status: "active",
      source: "manual",
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data.id as string };
}

/** Push prodotti e attivazioni. Mai le pagine sito: le gestisce solo Team Zoe con Salva. */
export async function syncAllLocalToCloud(): Promise<CloudSyncResult> {
  const result: CloudSyncResult = {
    products: 0,
    pages: 0,
    activations: 0,
    errors: [],
  };

  if (!isSupabaseConfigured()) {
    result.errors.push("Supabase non configurato");
    return result;
  }

  try {
    result.products = await pushLocalProductsToRemote();
  } catch (error) {
    result.errors.push(
      `prodotti: ${error instanceof Error ? error.message : "errore"}`,
    );
  }

  for (const activation of listActivations().filter((item) => item.status === "active")) {
    const synced = await syncActivationToSupabase(activation.id);
    if (synced.ok) result.activations += 1;
    else if (synced.error) result.errors.push(`${activation.memberEmail}: ${synced.error}`);
  }

  return result;
}
