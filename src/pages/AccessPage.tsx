import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

export function AccessPage() {
  useEffect(() => {
    document.title = "Accedi · Zoe";
  }, []);

  return (
    <Layout variant="site">
      <section className="access-page">
        <p className="eyebrow eyebrow-red">Accedi</p>
        <h1>Scegli il tuo accesso.</h1>
        <p className="lede">Associati per l’area soci, Team Zoe per l’amministrazione.</p>

        <div className="access-choices">
          <Link className="access-choice access-choice-member" to="/accedi/associati">
            <span className="access-choice-kicker">Soci</span>
            <strong>Accesso Associati Zoe</strong>
            <span>Entra nell’area soci per vedere i tuoi corsi e gli ingressi.</span>
          </Link>
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
