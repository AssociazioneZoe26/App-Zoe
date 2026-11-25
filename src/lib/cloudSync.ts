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

/** Push prodotti e, se richiesto, attivazioni. Mai le pagine sito: le gestisce solo Team Zoe con Salva. */
export async function syncAllLocalToCloud(options?: {
  activations?: boolean;
}): Promise<CloudSyncResult> {
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

  if (options?.activations === false) return result;

  for (const activation of listActivations().filter((item) => item.status === "active")) {
    const synced = await syncActivationToSupabase(activation.id);
    if (synced.ok) result.activations += 1;
    else if (synced.error) result.errors.push(`${activation.memberEmail}: ${synced.error}`);
  }

  return result;
}

export type CloudActivation = {
  id: string;
  kind: "pack" | "course";
  memberName: string;
  memberEmail: string;
  productTitle: string;
  participantName: string | null;
  status: string;
  entriesTotal: number;
  entriesUsed: number;
  createdAt: string;
};

type CloudRow = {
  id: string;
  status: string;
  created_at: string;
  entries_total?: number;
  entries_used?: number;
  products: { title?: string } | { title?: string }[] | null;
  participants: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null;
  profiles: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapCloudRow(row: CloudRow, kind: CloudActivation["kind"]): CloudActivation {
  const profile = one(row.profiles);
  const participant = one(row.participants);
  const product = one(row.products);
  const child = [participant?.first_name, participant?.last_name].filter(Boolean).join(" ").trim();
  return {
    id: row.id,
    kind,
    memberName: profile?.full_name?.trim() || profile?.email || "Socio",
    memberEmail: profile?.email || "",
    productTitle: product?.title || "Attività",
    participantName: child || null,
    status: row.status,
    entriesTotal: Number(row.entries_total) || 0,
    entriesUsed: Number(row.entries_used) || 0,
    createdAt: row.created_at,
  };
}

/** Attivazioni di un socio, lette dal database e non dal browser. */
export async function fetchMemberCloudActivations(
  userId: string,
  member: { name: string; email: string },
): Promise<{ rows: CloudActivation[]; error?: string }> {
  if (!isSupabaseConfigured() || !userId) return { rows: [] };
  const supabase = getSupabase();
  const packSelect =
    "id, status, created_at, entries_total, entries_used, products(title), participants(first_name, last_name)";
  const courseSelect =
    "id, status, created_at, products(title), participants(first_name, last_name)";
  const [packs, courses] = await Promise.all([
    supabase
      .from("entry_packs")
      .select(packSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("entitlements")
      .select(courseSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  const error = packs.error?.message || courses.error?.message;
  if (error) return { rows: [], error };
  const withMember = (row: CloudRow): CloudRow => ({
    ...row,
    profiles: { full_name: member.name, email: member.email },
  });
  const rows = [
    ...((packs.data as CloudRow[] | null) ?? []).map((row) => mapCloudRow(withMember(row), "pack")),
    ...((courses.data as CloudRow[] | null) ?? []).map((row) => mapCloudRow(withMember(row), "course")),
  ];
  return { rows: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
}

export async function setCloudActivationStatus(
  item: Pick<CloudActivation, "id" | "kind">,
  active: boolean,
) {
  const supabase = getSupabase();
  const status = active ? "active" : "expired";
  const table = item.kind === "pack" ? "entry_packs" : "entitlements";
  const { error } = await supabase.from(table).update({ status }).eq("id", item.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteCloudActivation(item: Pick<CloudActivation, "id" | "kind">) {
  const supabase = getSupabase();
  const table = item.kind === "pack" ? "entry_packs" : "entitlements";
  const { error } = await supabase.from(table).delete().eq("id", item.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
