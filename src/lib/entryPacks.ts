import { encodePackQr, parsePackQr, rpcErrorCode } from "./entryQr";
import { getSupabase } from "./supabase";

export type EntryPackPreview = {
  pack_id: string;
  scan_token: string;
  status: string;
  entries_total: number;
  entries_used: number;
  entries_left: number;
  product_id: string;
  product_title: string;
  participant_id: string | null;
  participant_name: string;
};

export type EntryConsumptionRow = {
  id: string;
  entry_pack_id: string;
  delta: number;
  reason: string;
  created_at: string;
  reversed_at: string | null;
  reverse_reason: string | null;
  recorded_by: string;
  operator_name?: string;
};

export type MemberEntryPack = {
  id: string;
  scan_token: string;
  status: string;
  entries_total: number;
  entries_used: number;
  product_title: string;
  product_slug: string;
  product_image: string;
  participant_id: string | null;
  participant_name: string;
};

function isCurrentEntryPack(pack: {
  status: string;
  entries_total: number;
  entries_used: number;
}) {
  if (pack.status !== "active") return false;
  if (pack.entries_total !== 4 && pack.entries_total !== 8) return false;
  return pack.entries_used < pack.entries_total;
}

function currentMemberPacks(packs: MemberEntryPack[]) {
  const assigned = packs.filter((pack) => pack.participant_id);
  const source = assigned.length > 0 ? assigned : packs;
  const byChild = new Map<string, MemberEntryPack>();
  for (const pack of source) {
    const key = `${pack.product_slug}::${pack.participant_id || "titolare"}`;
    if (!byChild.has(key)) byChild.set(key, pack);
  }
  return [...byChild.values()];
}

export async function lookupEntryPackQr(raw: string) {
  const token = parsePackQr(raw);
  if (!token) return { ok: false as const, code: "invalid_qr" };
  const { data, error } = await getSupabase().rpc("lookup_entry_pack_qr", {
    p_token: encodePackQr(token),
  });
  if (error) return { ok: false as const, code: rpcErrorCode(error.message) };
  return { ok: true as const, data: data as EntryPackPreview };
}

export async function consumeEntryPack(packId: string, clientRequestId: string) {
  const { data, error } = await getSupabase().rpc("consume_entry_pack", {
    p_entry_pack_id: packId,
    p_delta: 1,
    p_client_request_id: clientRequestId,
    p_reason: "attendance",
  });
  if (error) return { ok: false as const, code: rpcErrorCode(error.message) };
  return { ok: true as const, data };
}

export async function restoreEntryConsumption(consumptionId: string, reason = "correction") {
  const { error } = await getSupabase().rpc("restore_entry_consumption", {
    p_consumption_id: consumptionId,
    p_reason: reason,
  });
  if (error) return { ok: false as const, code: rpcErrorCode(error.message) };
  return { ok: true as const };
}

export async function fetchMemberEntryPacks(userId: string): Promise<MemberEntryPack[]> {
  const { data, error } = await getSupabase()
    .from("entry_packs")
    .select(
      "id, scan_token, status, entries_total, entries_used, participant_id, products(title, slug, preview_image), participants(first_name, last_name)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const mapped = data.map((row) => {
    const product = row.products as {
      title?: string;
      slug?: string;
      preview_image?: string;
    } | null;
    const participant = row.participants as { first_name?: string; last_name?: string } | null;
    const child = [participant?.first_name, participant?.last_name].filter(Boolean).join(" ").trim();
    return {
      id: row.id as string,
      scan_token: row.scan_token as string,
      status: row.status as string,
      entries_total: Number(row.entries_total) || 0,
      entries_used: Number(row.entries_used) || 0,
      product_title: product?.title || "Laboratorio",
      product_slug: product?.slug || "",
      product_image: product?.preview_image || "",
      participant_id: (row.participant_id as string | null) ?? null,
      participant_name: child || "Titolare",
    };
  });
  return currentMemberPacks(mapped.filter(isCurrentEntryPack));
}

export async function fetchPackConsumptions(packId: string): Promise<EntryConsumptionRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("entry_consumptions")
    .select("id, entry_pack_id, delta, reason, created_at, reversed_at, reverse_reason, recorded_by")
    .eq("entry_pack_id", packId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const operatorIds = [...new Set(data.map((row) => row.recorded_by as string).filter(Boolean))];
  const names = new Map<string, string>();
  if (operatorIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", operatorIds);
    for (const profile of profiles ?? []) {
      names.set(
        profile.id as string,
        (profile.full_name as string)?.trim() || (profile.email as string) || "Team Zoe",
      );
    }
  }
  return data.map((row) => ({
    id: row.id as string,
    entry_pack_id: row.entry_pack_id as string,
    delta: Number(row.delta) || 1,
    reason: row.reason as string,
    created_at: row.created_at as string,
    reversed_at: (row.reversed_at as string | null) ?? null,
    reverse_reason: (row.reverse_reason as string | null) ?? null,
    recorded_by: row.recorded_by as string,
    operator_name: names.get(row.recorded_by as string) || "Team Zoe",
  }));
}

export async function assignPackParticipant(packId: string, participantId: string | null) {
  const { error } = await getSupabase()
    .from("entry_packs")
    .update({ participant_id: participantId })
    .eq("id", packId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
