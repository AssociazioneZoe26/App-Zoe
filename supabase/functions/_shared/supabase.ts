import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function getAnonClient(authHeader: string) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
}

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key);
}

export function allowMockPayments() {
  return (
    (Deno.env.get("ALLOW_MOCK_PAYMENTS") ?? "") === "true" &&
    (Deno.env.get("APP_ENV") ?? "development") !== "production"
  );
}
