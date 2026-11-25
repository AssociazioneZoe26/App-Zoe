import { getSupabaseFunctionsUrl, isSupabaseConfigured } from "./supabase";

export const NEWSLETTER_STORAGE_KEY = "zoe-newsletter-subscribed";
export const NEWSLETTER_DISMISSED_KEY = "zoe-newsletter-dismissed";

export async function subscribeToNewsletter(input: {
  fullName: string;
  email: string;
  source?: string;
}): Promise<{ ok: true } | { ok: false; error: string; already?: boolean }> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (fullName.length < 2) return { ok: false, error: "Inserisci il tuo nome." };
  if (!email.includes("@")) return { ok: false, error: "Inserisci un’email valida." };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Iscrizione non disponibile al momento." };
  }

  const res = await fetch(`${getSupabaseFunctionsUrl()}/newsletter-subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""}`,
    },
    body: JSON.stringify({
      fullName,
      email,
      source: input.source ?? "site",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    already?: boolean;
  };

  if (body.already) return { ok: true };
  if (!res.ok || !body.ok) {
    if (
      body.error === "mailersend_not_configured" ||
      body.error === "smtp_failed"
    ) {
      return { ok: false, error: "Invio email non ancora configurato. Riprova tra poco." };
    }
    return { ok: false, error: "Iscrizione non riuscita. Riprova tra poco." };
  }
  return { ok: true };
}

export function markNewsletterSubscribed() {
  try {
    localStorage.setItem(NEWSLETTER_STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

export function isNewsletterSubscribedLocally() {
  try {
    return localStorage.getItem(NEWSLETTER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markNewsletterPopupDismissed() {
  try {
    localStorage.setItem(NEWSLETTER_DISMISSED_KEY, "1");
  } catch {
    // ignore
  }
}

export function isNewsletterPopupDismissed() {
  try {
    return localStorage.getItem(NEWSLETTER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
