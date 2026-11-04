export type MemberAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
};

/** Account socio di test (poi Supabase Auth). */
export const memberAccounts: MemberAccount[] = [
  {
    id: "member-marina",
    name: "Marina Canalis",
    email: "m.canalis@live.it",
    password: "Socio2026",
  },
];

export function findMemberByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return memberAccounts.find((account) => account.email.toLowerCase() === normalized);
}

export function listMembers() {
  return [...memberAccounts].sort((a, b) => a.name.localeCompare(b.name, "it"));
}
