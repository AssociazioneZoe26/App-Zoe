import { corsHeaders } from "../_shared/cors.ts";
import { sendZoeEmail, siteUrl, zoeBrandedEmailHtml } from "../_shared/mailersend.ts";
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function confirmEmail(name: string, confirmUrl: string) {
  const text = `Ciao ${name},

grazie per l’iscrizione alla newsletter di Associazione Zoe.

Per confermare, apri questo link:
${confirmUrl}

Se non hai richiesto tu l’iscrizione, ignora questa email.

Associazione Zoe
Via Li Punti 12, Sassari
info@associazionezoe.org`;

  const html = zoeBrandedEmailHtml({
    eyebrow: "Newsletter",
    title: "Conferma l’iscrizione",
    greeting: `Ciao ${escapeHtml(name)},`,
    body: "grazie per l’iscrizione alla newsletter di Associazione Zoe. Per ricevere le novità, conferma questo indirizzo email.",
    buttonUrl: confirmUrl,
    buttonLabel: "Conferma l’iscrizione",
    footnote: "Se non hai richiesto tu l’iscrizione, ignora questa email. Il link scade tra 48 ore.",
  });

  return { text, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const source = String(body.source ?? "site").trim() || "site";
    if (fullName.length < 2) return json({ error: "name_required" }, 400);
    if (!email.includes("@")) return json({ error: "email_required" }, 400);

    const supabase = getServiceClient();
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, confirmed_at")
      .eq("email", email)
      .maybeSingle();

    if (existing?.confirmed_at) {
      return json({ ok: true, already: true });
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const payload = {
      full_name: fullName,
      email,
      privacy_accepted_at: new Date().toISOString(),
      source,
      confirmed_at: null,
      confirm_token_hash: tokenHash,
      confirm_token_expires_at: expiresAt,
    };

    const saved = existing?.id
      ? await supabase.from("newsletter_subscribers").update(payload).eq("id", existing.id)
      : await supabase.from("newsletter_subscribers").insert(payload);

    if (saved.error) {
      return json({ error: "save_failed", detail: saved.error.message }, 500);
    }

    const confirmUrl = `${siteUrl()}/newsletter/conferma?token=${token}`;
    const letter = confirmEmail(fullName, confirmUrl);
    const sent = await sendZoeEmail({
      toEmail: email,
      toName: fullName,
      subject: "Conferma iscrizione newsletter · Associazione Zoe",
      text: letter.text,
      html: letter.html,
    });
    if (!sent.ok) {
      return json({ error: sent.error, detail: "detail" in sent ? sent.detail : undefined }, 503);
    }
    return json({ ok: true });
  } catch {
    return json({ error: "unexpected" }, 500);
  }
});
