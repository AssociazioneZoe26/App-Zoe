import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

/** True when URL + anon/publishable key are set (never put service_role in Vite). */
export function isSupabaseConfigured() {
  return Boolean(url && anonKey && anonKey.length > 20);
}

let client: SupabaseClient | null = null;

/**
 * Client browser per il progetto Zoe.
 * Usa solo la anon/publishable key — la service_role resta sul server (Edge Functions).
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase non configurato. Imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in .env.local",
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export function getSupabaseFunctionsUrl() {
  if (!url) return "";
  return `${url.replace(/\/$/, "")}/functions/v1`;
}

export const supabaseProjectHost = url
  ? new URL(url).host
  : "eyyprcnbyhkygxiggais.supabase.co";
