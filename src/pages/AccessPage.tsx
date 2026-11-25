import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAdminAuth } from "../admin/AuthContext";
import { Layout } from "../components/Layout";
import { whatsappHref, deskPhone } from "../data";
import { useMemberAuth } from "../member/MemberAuthContext";

const tesseraWhatsapp = whatsappHref(
  deskPhone.phone,
  "Ciao, vorrei informazioni sull’iscrizione ad Associazione Zoe.",
);

export function AccessPage() {
  const { session: adminSession, ready: adminReady } = useAdminAuth();
  const { session: memberSession, ready: memberReady } = useMemberAuth();

  useEffect(() => {
    document.title = "Accedi · Zoe";
  }, []);

  if (adminReady && adminSession) {
    return <Navigate to="/admin" replace />;
  }
  if (memberReady && memberSession) {
    return <Navigate to="/accedi/associati/area" replace />;
  }

  return (
    <Layout variant="site">
      <section className="access-page">
        <p className="eyebrow eyebrow-red">Accedi</p>
        <h1>Scegli il tuo accesso.</h1>
        <p className="lede">Associati per l’area soci, Team Zoe per l’amministrazione.</p>

        <div className="access-choices">
          <Link className="access-choice access-choice-member" to="/accedi/associati">
            <span className="access-choice-kicker">Tesserati</span>
            <strong>Accesso tesserati</strong>
            <span>
              Accedi all’area riservata per consultare corsi e ingressi, acquistare o rinnovare
              le attività e gestire i profili dei figli partecipanti.
            </span>
          </Link>
          <div className="access-choice-stack">
            <Link className="access-choice access-choice-register" to="/accedi/associati/registrati">
              <span className="access-choice-kicker">Nuovo utente</span>
              <strong>Richiedi l’iscrizione</strong>
              <span>
                Confermi l’email, Team Zoe approva, poi ti assegna il numero tessera in
                associazione.
              </span>
            </Link>
            <a
              className="access-choice access-choice-tessera"
              href={tesseraWhatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <span className="access-choice-kicker">WhatsApp</span>
              <strong>Hai una domanda?</strong>
              <span>Scrivi a Team Zoe: ti aiutiamo con iscrizione e tessera.</span>
            </a>
          </div>
          <Link className="access-choice access-choice-team" to="/admin/login">
            <span className="access-choice-kicker">Admin</span>
            <strong>Accesso Team Zoe</strong>
            <span>Entra nell’area admin per gestire catalogo e attivazioni.</span>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
