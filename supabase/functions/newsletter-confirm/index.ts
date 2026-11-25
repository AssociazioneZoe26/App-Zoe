import { corsHeaders } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    if (token.length < 20) return json({ error: "invalid_token" }, 400);

    const supabase = getServiceClient();
    const tokenHash = await sha256Hex(token);
    const { data: row } = await supabase
      .from("newsletter_subscribers")
      .select("id, confirmed_at, confirm_token_expires_at")
      .eq("confirm_token_hash", tokenHash)
      .maybeSingle();

    if (!row) return json({ error: "invalid_token" }, 400);
    if (row.confirmed_at) return json({ ok: true, already: true });
    if (
      row.confirm_token_expires_at &&
      new Date(row.confirm_token_expires_at).getTime() < Date.now()
    ) {
      return json({ error: "expired" }, 400);
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({
        confirmed_at: new Date().toISOString(),
        confirm_token_hash: null,
        confirm_token_expires_at: null,
      })
      .eq("id", row.id);
    if (error) return json({ error: "save_failed" }, 500);
    return json({ ok: true });
  } catch {
    return json({ error: "unexpected" }, 500);
  }
});
