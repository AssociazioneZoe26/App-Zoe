import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { markNewsletterSubscribed } from "../lib/newsletter";
import { getSupabaseFunctionsUrl, isSupabaseConfigured } from "../lib/supabase";

export function NewsletterConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() || "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Conferma in corso…");

  useEffect(() => {
    document.title = "Conferma newsletter · Zoe";
    if (!token || !isSupabaseConfigured()) {
      setStatus("error");
      setMessage("Link non valido. Richiedi di nuovo l’iscrizione dalla newsletter.");
      return;
    }
    void (async () => {
      const res = await fetch(`${getSupabaseFunctionsUrl()}/newsletter-confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""}`,
        },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setStatus("error");
        setMessage(
          body.error === "expired"
            ? "Il link è scaduto. Iscriviti di nuovo dalla newsletter."
            : "Conferma non riuscita. Il link potrebbe essere già usato o non valido.",
        );
        return;
      }
      markNewsletterSubscribed();
      setStatus("ok");
      setMessage("Iscrizione confermata. Grazie, da ora riceverai la newsletter Zoe.");
    })();
  }, [token]);

  return (
    <Layout variant="site">
      <section className="access-page">
        <p className="eyebrow eyebrow-red">Newsletter</p>
        <h1>Conferma iscrizione</h1>
        <p className={status === "error" ? "admin-form-error" : "lede"}>{message}</p>
        <p className="member-login-back">
          <Link to="/contatti#newsletter">Torna alla newsletter</Link>
        </p>
      </section>
    </Layout>
  );
}
