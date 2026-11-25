import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export type ApprovedMember = {
  id: string;
  name: string;
  email: string;
};

/** Soci approvati da Supabase (fonte primaria per attivazioni in sede). */
export async function fetchApprovedMembers(): Promise<ApprovedMember[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, email, full_name, role, member_status")
    .eq("role", "member")
    .eq("member_status", "approved")
    .order("full_name", { ascending: true });

  if (error || !data) {
    console.error("fetchApprovedMembers failed", error?.message);
    return [];
  }

  return data
    .map((row) => ({
      id: row.id as string,
      name: (row.full_name as string)?.trim() || (row.email as string) || "Socio",
      email: ((row.email as string) || "").trim().toLowerCase(),
    }))
    .filter((member) => Boolean(member.email))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}
