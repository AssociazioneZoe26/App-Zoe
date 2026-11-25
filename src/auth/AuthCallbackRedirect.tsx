import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

const RESET_PATH = "/accedi/associati/reimposta-password";
const MEMBER_AREA_PATH = "/accedi/associati/area";

function readAuthType(): string | null {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const fromHash = new URLSearchParams(hash).get("type");
  if (fromHash) return fromHash.toLowerCase();
  const fromQuery = new URLSearchParams(window.location.search).get("type");
  return fromQuery ? fromQuery.toLowerCase() : null;
}

/**
 * Invito Team Zoe e recupero password → impostazione password.
 * Conferma iscrizione socio (signup) → area soci, password già scelta nel form.
 */
export function AuthCallbackRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const type = readAuthType();
    const suffix = `${window.location.search}${window.location.hash}`;
    if ((type === "recovery" || type === "invite") && location.pathname !== RESET_PATH) {
      navigate(`${RESET_PATH}${suffix}`, { replace: true });
      return;
    }
    if (type === "signup" && location.pathname !== MEMBER_AREA_PATH) {
      navigate(`${MEMBER_AREA_PATH}${suffix}`, { replace: true });
      return;
    }

    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && location.pathname !== RESET_PATH) {
        navigate(RESET_PATH, { replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [location.pathname, navigate]);

  return null;
}
