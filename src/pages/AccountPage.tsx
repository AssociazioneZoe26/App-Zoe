import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { getActivity } from "../data";

const purchased = 10;
const used = 4;
const left = purchased - used;

export function AccountPage() {
  const activity = getActivity("laboratori-lego");

  useEffect(() => {
    document.title = "La tua area · Zoe";
  }, []);

  if (!activity) return null;

  return (
    <Layout variant="academy">
      <section className="member">
        <p className="eyebrow">La tua area</p>
        <h1>I tuoi ingressi.</h1>
        <p className="lede">
          Sei già socio. Qui c’è solo ciò che Zoe ti ha assegnato in sede: i Laboratori LEGO, con gli
          ingressi usati e quelli rimasti.
        </p>
        <article className="member-pass">
          <Link to={`/attivita/${activity.slug}`} className="member-art" aria-label={`${activity.title}, apri la scheda`}>
            <img src={activity.image} alt="" />
          </Link>
          <div>
            <p className="card-kicker">{activity.eyebrow}</p>
            <h2>{activity.title}</h2>
            <p className="member-status">Attivo · {activity.age}</p>
            <dl className="pass-counts">
              <div>
                <dt>Acquistati</dt>
                <dd>{purchased}</dd>
              </div>
              <div>
                <dt>Usati</dt>
                <dd>{used}</dd>
              </div>
              <div className="is-left">
                <dt>Rimasti</dt>
                <dd>{left}</dd>
              </div>
            </dl>
            <ol className="tokens" aria-label="Dieci ingressi, quattro usati e sei rimasti">
              {Array.from({ length: purchased }, (_, index) => (
                <li key={index} className={index < used ? "is-used" : "is-left"}>
                  <span className="token-label">{index < used ? "Usato" : "Rimasto"}</span>
                </li>
              ))}
            </ol>
            <p className="member-note">
              {used} ingressi usati · {left} ancora da usare
            </p>
            <Link className="member-back" to={`/attivita/${activity.slug}`}>
              Apri la scheda
            </Link>
          </div>
        </article>
      </section>
    </Layout>
  );
}
