import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import {
  activities,
  activityFilters,
  activityWhatsapp,
  deskPhone,
  generalWhatsapp,
  type Activity,
  type FilterId,
} from "../data";

function isFilter(value: string | null): value is FilterId {
  return activityFilters.some((item) => item.id === value);
}

function matches(activity: Activity, filter: FilterId) {
  if (filter === "laboratorio") return activity.category === "Laboratorio";
  if (filter === "corso") return activity.category === "Corso";
  if (filter === "workshop") return activity.workshop === true;
  if (filter === "online") return activity.online;
  return true;
}

export function Catalog() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requested = params.get("tipo");
  const filter: FilterId = isFilter(requested) ? requested : "tutte";
  const visible = useMemo(
    () => activities.filter((activity) => matches(activity, filter)),
    [filter],
  );

  function setFilter(id: FilterId) {
    navigate(
      {
        pathname: "/academy",
        search: id === "tutte" ? "" : `?tipo=${id}`,
        hash: "#catalogo",
      },
      { replace: true },
    );
  }
  const featured = activities[0];

  useEffect(() => {
    document.title = "Zoe Academy · Corsi e laboratori";
  }, []);

  return (
    <Layout variant="academy">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Costruisci.
            <br />
            <span className="mark">Immagina.</span>
            <br />
            Impara.
          </h1>
          <p className="lede">
            Corsi, laboratori e workshop a Li Punti. Scegli un’attività e
            scrivi a Zoe su WhatsApp.
          </p>
        </div>
        <Link
          to={`/attivita/${featured.slug}`}
          className="hero-photos"
          aria-label={`${featured.title}, apri la scheda`}
        >
          <img className="hero-poster" src="/hero/laboratorio.jpg" alt="" />
          <img className="hero-poster is-second" src="/hero/laboratorio-2.jpg" alt="" />
        </Link>
        <div className="hero-bar">
          <p>
            <strong>Via Li Punti 12, Sassari</strong>
            <span>Info {deskPhone.label}</span>
          </p>
          <a href={generalWhatsapp} target="_blank" rel="noreferrer">
            Scrivi su WhatsApp
          </a>
        </div>
      </section>

      <section className="catalog">
        <div className="catalog-head" id="catalogo">
          <div>
            <p className="eyebrow eyebrow-red">Il catalogo</p>
            <h2>Le attività in corso</h2>
          </div>
          <p className="catalog-count">
            {visible.length} {visible.length === 1 ? "proposta" : "proposte"}
          </p>
        </div>
        <div className="filters" role="toolbar" aria-label="Filtra le attività">
          {activityFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="empty">Nessuna attività in questo gruppo.</p>
        ) : (
          <ul className="grid">
            {visible.map((activity) => (
              <li key={activity.slug}>
                <article className={`card accent-${activity.accent}`}>
                  <Link
                    to={`/attivita/${activity.slug}`}
                    className="card-link"
                    aria-label={`${activity.title}, apri la scheda`}
                  >
                    <CourseArt activity={activity} />
                  </Link>
                  <a
                    className="btn"
                    href={activityWhatsapp(activity)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Scopri di più su ${activity.title}`}
                  >
                    Scopri di più
                  </a>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="about">
        <div id="chi-siamo">
          <p className="eyebrow eyebrow-red">Chi siamo</p>
          <h2>Zoe significa nuova vita.</h2>
          <p className="lede">
            Zoe è un’associazione no profit. Si dedica a migliorare la qualità
            della vita dei soci, dai bambini agli adulti, senza limiti d’età: nel
            tempo libero, con il gioco e con attività ludiche ed educative.
          </p>
          <p className="lede">
            Ogni persona ha talenti e risorse da far emergere, per il lavoro, la
            famiglia, le relazioni e la comunità. In sede i corsi e i laboratori
            fanno sperimentare logica, creatività, manualità e pensiero
            computazionale. Oggi ci sono robotica e LEGO, coding e droni,
            informatica, inglese e pittura. Online, l’avvicinamento alla LIS è
            aperto a tutte le età.
          </p>
          <p className="lede">
            Durante l’anno ogni socio può seguire corsi, laboratori ed eventi a Li
            Punti. Zoe crede nella solidarietà: la quota inclusa nella tessera
            sostiene i progetti sociali e aiuta la comunità contro isolamento e
            solitudine. L’iscrizione resta in associazione.
          </p>
        </div>
      </section>

      <section className="contact" id="contatti">
        <div>
          <p className="eyebrow eyebrow-red">Dove siamo</p>
          <h2>Li Punti, a due passi dalle Poste.</h2>
          <p className="lede">
            Via Li Punti 12, Sassari. Strada interna, davanti alle Poste
            Italiane. Per orari e posti liberi scrivi o chiama: l’iscrizione
            si fa in associazione.
          </p>
        </div>
        <ul className="contact-cards">
          <li>
            <span>Sede</span>
            <strong>Via Li Punti 12</strong>
            <p>07100 Sassari</p>
          </li>
          <li>
            <span>Telefono</span>
            <strong>
              <a href="tel:+393473814081">{deskPhone.label}</a>
            </strong>
            <p>Anche su WhatsApp</p>
          </li>
          <li>
            <span>Email</span>
            <strong>
              <a href="mailto:info@associazionezoe.org">info@associazionezoe.org</a>
            </strong>
            <p>Per informazioni</p>
          </li>
        </ul>
      </section>
    </Layout>
  );
}

function CourseArt({ activity }: { activity: Activity }) {
  if (activity.image) {
    return (
      <div className="card-art">
        <img src={activity.image} alt={`Locandina di ${activity.title}`} />
      </div>
    );
  }

  return (
    <div className="card-art card-art-made" aria-hidden="true">
      <img src="/brand/academy-emblem.png" alt="" />
      <p>Corso base</p>
      <strong>Informatica</strong>
      <em>{activity.age}</em>
      <span className="made-foot">Via Li Punti 12, Sassari</span>
    </div>
  );
}
