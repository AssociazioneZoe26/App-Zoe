import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  inferProductOffer,
  offerLabel,
  priceForOffer,
} from "../admin/catalogTypes";
import { getCatalogActivities, loadCatalogActivities } from "../admin/productToActivity";
import { Layout } from "../components/Layout";
import { NewsletterBanner } from "../components/NewsletterBanner";
import {
  activityFilters,
  deskPhone,
  generalWhatsapp,
  type Activity,
  type FilterId,
} from "../data";
import { useMemberAuth } from "../member/MemberAuthContext";

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function catalogOffer(activity: Activity) {
  return (
    activity.offer ||
    inferProductOffer({
      online: activity.online,
      kind: activity.online
        ? "online"
        : activity.workshop
          ? "workshop"
          : activity.category === "Laboratorio"
            ? "laboratorio"
            : "corso",
      pricePack5: activity.pricePack5,
      pricePack10: activity.pricePack10,
      priceMonthly: activity.priceMonthly,
      priceCourse: activity.priceCourse,
    })
  );
}

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
  const { session, ready } = useMemberAuth();
  // Solo soci loggati vedono i CTA acquisto; finché auth non è pronto, resta "Scopri di più".
  const isMember = ready && Boolean(session);
  const requested = params.get("tipo");
  const filter: FilterId = isFilter(requested) ? requested : "tutte";
  const [activities, setActivities] = useState<Activity[]>(() => getCatalogActivities());
  const visible = useMemo(
    () => activities.filter((activity) => matches(activity, filter)),
    [activities, filter],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await loadCatalogActivities();
      if (!cancelled) setActivities(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

      <NewsletterBanner />

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
                  {isMember &&
                  (typeof activity.pricePack5 === "number" ||
                    typeof activity.pricePack10 === "number" ||
                    typeof activity.priceMonthly === "number" ||
                    typeof priceForOffer(activity, catalogOffer(activity)) === "number") ? (
                    <Link
                      className="btn btn-buy-options"
                      to={`/attivita/${activity.slug}`}
                      aria-label={`Acquista ${activity.title}`}
                    >
                      <span>
                        {(() => {
                          const offer = catalogOffer(activity);
                          const packsOnCard =
                            offer === "packs" || offer === "pack4" || offer === "pack8";
                          const amounts = [
                            packsOnCard ? activity.pricePack5 : undefined,
                            packsOnCard ? activity.pricePack10 : undefined,
                            packsOnCard || offer === "monthly" ? activity.priceMonthly : undefined,
                          ].filter((value): value is number => typeof value === "number");
                          const from = amounts.length ? Math.min(...amounts) : undefined;
                          if (packsOnCard && amounts.length > 1 && typeof from === "number") {
                            const parts = [
                              typeof activity.pricePack5 === "number" ? "4" : null,
                              typeof activity.pricePack10 === "number" ? "8" : null,
                              typeof activity.priceMonthly === "number" ? "mensile" : null,
                            ].filter(Boolean);
                            return `Da ${formatEuro(from)} · ${parts.join(", ")}`;
                          }
                          if (packsOnCard && typeof activity.pricePack5 === "number") {
                            return `Pacchetto 4 ingressi · ${formatEuro(activity.pricePack5)}`;
                          }
                          if (packsOnCard && typeof activity.pricePack10 === "number") {
                            return `Pacchetto 8 ingressi · ${formatEuro(activity.pricePack10)}`;
                          }
                          if (typeof activity.priceMonthly === "number") {
                            return `Abbonamento mensile · ${formatEuro(activity.priceMonthly)}/mese`;
                          }
                          return `${offerLabel(offer)} · ${formatEuro(
                            priceForOffer(activity, offer)!,
                          )}${offer === "monthly" ? "/mese" : ""}`;
                        })()}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      className="btn"
                      to={`/attivita/${activity.slug}`}
                      aria-label={`Scopri di più su ${activity.title}`}
                    >
                      Scopri di più
                    </Link>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
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

  const kindLabel = activity.workshop
    ? "Workshop"
    : activity.online
      ? "Online"
      : activity.category === "Laboratorio"
        ? "Laboratorio"
        : "Corso";

  return (
    <div className={`card-art card-art-made accent-${activity.accent}`} aria-hidden="true">
      <img src="/brand/academy-emblem.png" alt="" />
      <p>{kindLabel}</p>
      <strong>{activity.title}</strong>
      <em>{activity.age}</em>
      <span className="made-foot">Via Li Punti 12, Sassari</span>
    </div>
  );
}
