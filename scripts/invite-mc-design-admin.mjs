/**
 * Crea un secondo account ZOE Team via Auth Admin API (invito email).
 * Non stampa password, service role key né link di invito.
 *
 * Uso:
 *   INVITE_EMAIL=marina.canalis70@gmail.com node scripts/invite-mc-design-admin.mjs
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "eyyprcnbyhkygxiggais";
const URL = `https://${PROJECT_REF}.supabase.co`;
const EMAIL = (process.env.INVITE_EMAIL || "").trim().toLowerCase();
if (!EMAIL) {
  console.error("STOP: impostare INVITE_EMAIL");
  process.exit(2);
}
const REDIRECT_TO =
  process.env.INVITE_REDIRECT_URL ||
  "http://localhost:5173/accedi/associati/reimposta-password";

function getServiceRoleKey() {
  const raw = execFileSync(
    "npx",
    ["supabase", "projects", "api-keys", `--project-ref=${PROJECT_REF}`, "-o", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const startArr = raw.indexOf("[");
  const startObj = raw.indexOf('{"keys"');
  let keys = [];
  if (startArr !== -1 && (startObj === -1 || startArr < startObj)) {
    const end = raw.lastIndexOf("]");
    keys = JSON.parse(raw.slice(startArr, end + 1));
  } else if (startObj !== -1) {
    const start = raw.lastIndexOf("{", startObj);
    let depth = 0;
    let end = -1;
    for (let i = start; i < raw.length; i += 1) {
      if (raw[i] === "{") depth += 1;
      else if (raw[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const parsed = JSON.parse(raw.slice(start, end + 1));
    keys = Array.isArray(parsed.keys) ? parsed.keys : [];
  } else {
    throw new Error("api-keys JSON non trovato");
  }
  const service =
    keys.find((k) => k.id === "service_role") ||
    keys.find((k) => k.name === "service_role") ||
    keys.find((k) => k.type === "secret");
  const key = service?.api_key;
  if (!key) throw new Error("service_role key non trovata");
  return key;
}

function isEmailDeliveryError(message) {
  const m = (message || "").toLowerCase();
  return (
    m.includes("error sending") ||
    m.includes("smtp") ||
    m.includes("email") ||
    m.includes("mail") ||
    m.includes("rate limit") ||
    m.includes("confirmation email")
  );
}

const admin = createClient(URL, getServiceRoleKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: listed, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listError) {
  console.error("FAIL listUsers:", listError.message);
  process.exit(1);
}

const existing = listed?.users?.find(
  (u) => (u.email || "").toLowerCase() === EMAIL.toLowerCase(),
);
if (existing) {
  console.error("STOP: account già presente, nessuna modifica effettuata.");
  process.exit(2);
}

const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
  EMAIL,
  {
    redirectTo: REDIRECT_TO,
    data: {
      first_name: "Marina",
      last_name: "Canalis",
      full_name: "Marina Canalis",
    },
  },
);

if (inviteError) {
  // Se l'utente è stato creato parzialmente, rimuovilo per lasciare lo stato pulito.
  const { data: after } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const partial = after?.users?.find(
    (u) => (u.email || "").toLowerCase() === EMAIL.toLowerCase(),
  );
  if (partial) {
    await admin.auth.admin.deleteUser(partial.id);
  }

  if (isEmailDeliveryError(inviteError.message)) {
    console.error("STOP_EMAIL:", inviteError.message);
    process.exit(3);
  }
  console.error("FAIL invite:", inviteError.message);
  process.exit(1);
}

const userId = inviteData?.user?.id;
if (!userId) {
  console.error("FAIL: invite senza user id");
  process.exit(1);
}

// Promozione server-side: app_metadata + profiles (mai via registrazione pubblica)
const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
  app_metadata: { role: "team_zoe" },
  email_confirm: true,
});
if (metaError) {
  console.error("FAIL app_metadata:", metaError.message);
  process.exit(1);
}

const { error: profileError } = await admin
  .from("profiles")
  .update({
    role: "team_zoe",
    member_status: "approved",
    first_name: "Marina",
    last_name: "Canalis",
    full_name: "Marina Canalis",
    status_changed_at: new Date().toISOString(),
  })
  .eq("id", userId);
if (profileError) {
  console.error("FAIL profile promote:", profileError.message);
  process.exit(1);
}

const { data: profile, error: verifyError } = await admin
  .from("profiles")
  .select("email, role, member_status")
  .eq("id", userId)
  .maybeSingle();
if (verifyError || !profile) {
  console.error("FAIL verify profile:", verifyError?.message || "missing");
  process.exit(1);
}

const { data: info } = await admin
  .from("profiles")
  .select("email, role, member_status")
  .eq("email", "info@associazionezoe.org")
  .maybeSingle();

const { data: authUser } = await admin.auth.admin.getUserById(userId);

// Verifica destinazione del link senza stampare token/credenziali
let link_target = null;
const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  type: "invite",
  email: EMAIL,
  options: { redirectTo: REDIRECT_TO },
});
if (!linkError && linkData?.properties?.action_link) {
  const u = new URL(linkData.properties.action_link);
  link_target = {
    auth_host: u.origin,
    auth_path: u.pathname,
    redirect_to: u.searchParams.get("redirect_to"),
  };
} else if (linkError) {
  link_target = { error: linkError.message };
}

const { data: member } = await admin
  .from("profiles")
  .select("email, role, member_status")
  .eq("email", "m.canalis@live.it")
  .maybeSingle();

const can_access_admin_panel =
  profile.role === "team_zoe" && profile.member_status === "approved";

console.log(
  JSON.stringify(
    {
      ok: true,
      created_email: profile.email,
      role: profile.role,
      member_status: profile.member_status,
      email_confirmed: Boolean(authUser?.user?.email_confirmed_at),
      app_metadata_role: authUser?.user?.app_metadata?.role ?? null,
      invited_at: authUser?.user?.invited_at ?? null,
      redirect_configured: REDIRECT_TO,
      link_target,
      can_access_admin_panel,
      info_account: info,
      member_account: member,
    },
    null,
    2,
  ),
);
