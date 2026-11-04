export type AdminRole = "zoe-team";

export type AdminAccount = {
  id: AdminRole;
  name: string;
  email: string;
  password: string;
};

/** Account admin Zoe Team (poi si passa a Supabase Auth). */
export const adminAccounts: AdminAccount[] = [
  {
    id: "zoe-team",
    name: "Zoe Team",
    email: "info@associazionezoe.org",
    password: "ZoeTeam2026",
  },
];

export function findAdminByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return adminAccounts.find((account) => account.email.toLowerCase() === normalized);
}
