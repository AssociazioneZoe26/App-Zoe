import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../admin/AuthContext";

export function AdminHomePage() {
  const { session } = useAdminAuth();

  useEffect(() => {
    document.title = "Dashboard · Admin Zoe";
  }, []);

  return (
    <section className="admin-panel">
      <p className="eyebrow eyebrow-red">Dashboard</p>
      <h1>Ciao, {session?.name}.</h1>
      <p className="lede">
        Catalogo e ingressi restano in Academy (poi anche app). I testi e le foto delle pagine
        informative si modificano direttamente sul sito, restando loggati come Team Zoe.
      </p>
      <ul className="admin-cards">
        <li>
          <h2>Richieste di registrazione</h2>
          <p>Approva, rifiuta, sospendi o riattiva i nuovi soci in attesa.</p>
          <Link to="/admin/registrazioni">Apri richieste</Link>
        </li>
        <li>
          <h2>Pagine del sito</h2>
          <p>Home, Chi siamo, Squadra, Progetti, Carta docente: modifica testi e immagini in pagina.</p>
          <Link to="/">Apri il sito</Link>
        </li>
        <li>
          <h2>Newsletter</h2>
          <p>Unica lista iscritti e bozza del riepilogo corsi ogni due settimane.</p>
          <Link to="/admin/newsletter">Apri newsletter</Link>
        </li>
        <li>
          <h2>Catalogo Academy</h2>
          <p>Laboratori, corsi, workshop e online — separato dal sito, pronto per la futura app.</p>
          <Link to="/admin/catalogo">Apri catalogo</Link>
        </li>
        <li>
          <h2>Attivazioni</h2>
          <p>Attiva un prodotto per un socio dopo pagamento in persona.</p>
          <Link to="/admin/attivazioni">Attiva socio</Link>
        </li>
        <li>
          <h2>Ingressi</h2>
          <p>Lista soci con pacchetti laboratorio da 4 o 8 ingressi.</p>
          <Link to="/admin/ingressi">Apri lista associati</Link>
        </li>
      </ul>
    </section>
  );
}
