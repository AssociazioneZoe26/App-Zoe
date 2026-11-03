import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { activityWhatsapp, getActivity } from "../data";

export function ActivityPage() {
  const { slug } = useParams();
  const activity = getActivity(slug);

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
              {activity.sessions ? (
                <div>
                  <dt>Durata</dt>
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
            </dl>
            <a
              className="btn btn-large"
              href={activityWhatsapp(activity)}
              target="_blank"
              rel="noreferrer"
            >
              Scopri di più su WhatsApp
            </a>
            <p className="fine">
              Il messaggio è già pronto e indica questa attività. Numero{" "}
              {activity.phoneLabel}.
            </p>
          </div>
        </div>
      </article>
    </Layout>
  );
}
