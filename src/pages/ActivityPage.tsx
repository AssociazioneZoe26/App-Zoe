import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveActivity } from "../admin/productToActivity";
import { Layout } from "../components/Layout";
import { activityWhatsapp } from "../data";
import { useMemberAuth } from "../member/MemberAuthContext";

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ActivityPage() {
  const { slug } = useParams();
  const activity = useMemo(() => resolveActivity(slug), [slug]);
  const { session, ready } = useMemberAuth();
  const [purchaseNote, setPurchaseNote] = useState("");

  useEffect(() => {
    document.title = activity
      ? `${activity.title} · Zoe`
      : "Attività non trovata · Zoe";
  }, [activity]);

  if (!activity) {
    return (
      <Layout variant="academy">
        <section className="missing">
          <h1>Questa attività non c’è.</h1>
          <Link to="/academy">Torna al catalogo</Link>
        </section>
      </Layout>
    );
  }

  const when = [activity.schedule, activity.time].filter(Boolean).join(" · ");
  const isMember = ready && Boolean(session);
  const canBuyPack5 = typeof activity.pricePack5 === "number";
  const canBuyPack10 = typeof activity.pricePack10 === "number";
  const canBuyMonthly = typeof activity.priceMonthly === "number";
  const canBuyCourse = typeof activity.priceCourse === "number";
  const hasPrices = canBuyPack5 || canBuyPack10 || canBuyMonthly || canBuyCourse;
  const canPurchase = isMember && hasPrices;

  function requestPurchase(kind: "pack5" | "pack10" | "monthly" | "course") {
    const labels = {
      pack5: `pacchetto 5 ingressi (${formatEuro(activity!.pricePack5!)})`,
      pack10: `pacchetto 10 ingressi (${formatEuro(activity!.pricePack10!)})`,
      monthly: `canone mensile rinnovabile (${formatEuro(activity!.priceMonthly!)}/mese)`,
      course: `costo del corso (${formatEuro(activity!.priceCourse!)})`,
    };
    setPurchaseNote(
      `Richiesta per ${labels[kind]} registrata. Il pagamento con Stripe arriverà a breve.`,
    );
  }

  return (
    <Layout variant="academy">
      <article className="detail">
        <p className="back">
          <Link to="/academy#catalogo">← Tutte le attività</Link>
        </p>
        <div className="detail-layout">
          <div className={`poster accent-${activity.accent}`}>
            {activity.image ? (
              <img src={activity.image} alt={`Locandina di ${activity.title}`} />
            ) : (
              <div className="poster-made">
                <img src="/brand/academy-emblem.png" alt="" />
                <p>{activity.eyebrow}</p>
                <strong>{activity.title}</strong>
                <em>{activity.mantra}</em>
                <span>{activity.age}</span>
              </div>
            )}
          </div>
          <div className="detail-copy">
            <p className="eyebrow">{activity.eyebrow}</p>
            <h1>{activity.title}</h1>
            <p className="mantra">{activity.mantra}</p>
            <p className="lede">{activity.summary}</p>
            {activity.online ? (
              <div className="course-video-locked">
                <p className="eyebrow eyebrow-red">Corso completo</p>
                <p className="lede">
                  Per i corsi online il corso completo è un video, disponibile dopo attivazione
                  (pagamento in sede da admin o, a breve, acquisto/rinnovo con Stripe dal profilo
                  socio).
                </p>
              </div>
            ) : activity.fullText ? (
              <p className="lede">{activity.fullText}</p>
            ) : null}
            <ul className="points">
              {activity.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <dl className="facts">
              <div>
                <dt>Età</dt>
                <dd>{activity.age}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{activity.online ? "Online" : activity.category}</dd>
              </div>
              {when ? (
                <div>
                  <dt>Quando</dt>
                  <dd>{when}</dd>
                </div>
              ) : null}
              {activity.courseDuration || activity.sessions ? (
                <div>
                  <dt>Durata corso</dt>
                  <dd>{activity.courseDuration || activity.sessions}</dd>
                </div>
              ) : null}
              {activity.sessions && activity.courseDuration ? (
                <div>
                  <dt>Incontri</dt>
                  <dd>{activity.sessions}</dd>
                </div>
              ) : null}
              <div>
                <dt>Dove</dt>
                <dd>{activity.place}</dd>
              </div>
              {activity.teacher ? (
                <div>
                  <dt>Conduce</dt>
                  <dd>{activity.teacher}</dd>
                </div>
              ) : null}
              {isMember && canBuyPack5 ? (
                <div>
                  <dt>5 ingressi</dt>
                  <dd>{formatEuro(activity.pricePack5!)}</dd>
                </div>
              ) : null}
              {isMember && canBuyPack10 ? (
                <div>
                  <dt>10 ingressi</dt>
                  <dd>{formatEuro(activity.pricePack10!)}</dd>
                </div>
              ) : null}
              {isMember && canBuyMonthly ? (
                <div>
                  <dt>Canone mensile</dt>
                  <dd>{formatEuro(activity.priceMonthly!)}/mese</dd>
                </div>
              ) : null}
              {isMember && canBuyCourse ? (
                <div>
                  <dt>Costo corso</dt>
                  <dd>{formatEuro(activity.priceCourse!)}</dd>
                </div>
              ) : null}
            </dl>

            {canPurchase ? (
              <div className="purchase-box">
                <p className="eyebrow eyebrow-red">Acquista</p>
                <p className="lede">
                  Ciao {session!.name.split(" ")[0]}, scegli come attivare questo corso.
                </p>
                <div className="purchase-actions">
                  {canBuyPack5 ? (
                    <button
                      type="button"
                      className="btn btn-large"
                      onClick={() => requestPurchase("pack5")}
                    >
                      Pacchetto 5 ingressi · {formatEuro(activity.pricePack5!)}
                    </button>
                  ) : null}
                  {canBuyPack10 ? (
                    <button
                      type="button"
                      className="btn btn-large"
                      onClick={() => requestPurchase("pack10")}
                    >
                      Pacchetto 10 ingressi · {formatEuro(activity.pricePack10!)}
                    </button>
                  ) : null}
                  {canBuyMonthly ? (
                    <button
                      type="button"
                      className="btn btn-large btn-monthly"
                      onClick={() => requestPurchase("monthly")}
                    >
                      Canone mensile · {formatEuro(activity.priceMonthly!)}/mese
                    </button>
                  ) : null}
                  {canBuyCourse ? (
                    <button
                      type="button"
                      className="btn btn-large btn-monthly"
                      onClick={() => requestPurchase("course")}
                    >
                      Costo del corso · {formatEuro(activity.priceCourse!)}
                    </button>
                  ) : null}
                </div>
                {purchaseNote ? <p className="purchase-note">{purchaseNote}</p> : null}
                <p className="fine">
                  Il canone mensile si potrà rinnovare dall’area socio. Stripe arriverà a breve.
                </p>
                <a
                  className="member-back"
                  href={activityWhatsapp(activity)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Oppure scrivi su WhatsApp
                </a>
              </div>
            ) : (
              <div className="detail-discover">
                <a
                  className="btn btn-large"
                  href={activityWhatsapp(activity)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Scopri come diventare Associato
                </a>
                <p className="fine">
                  Scrivi a Zoe su WhatsApp per diventare socio e accedere a prezzi e iscrizione.
                  Numero {activity.phoneLabel}.
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
    </Layout>
  );
}
