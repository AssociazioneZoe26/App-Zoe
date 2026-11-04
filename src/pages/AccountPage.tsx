import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { resolveActivity } from "../admin/productToActivity";
import { Layout } from "../components/Layout";
import { useMemberAuth } from "../member/MemberAuthContext";
import { paymentChannelLabel } from "../admin/catalogTypes";
import {
  getPassesForMember,
  passCounts,
  type MemberPass,
} from "../member/passesStore";
import { syncMemberPassesFromActivations } from "../member/syncMemberPasses";

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isPaidInSede(pass: MemberPass) {
  return pass.paymentChannel !== "online";
}

export function AccountPage() {
  const { session, ready, logout } = useMemberAuth();
  const [passes, setPasses] = useState<MemberPass[]>([]);
  const [renewNotes, setRenewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "La tua area · Zoe";
  }, []);

  useEffect(() => {
    if (!session) return;
    syncMemberPassesFromActivations();
    setPasses(getPassesForMember(session.email));
  }, [session]);

  function requestRenew(pass: MemberPass) {
    const label =
      pass.passKind === "course"
        ? typeof pass.amountPaid === "number"
          ? `corso (${formatEuro(pass.amountPaid)})`
          : "corso"
        : "laboratorio / pacchetto ingressi";
    setRenewNotes((current) => ({
      ...current,
      [pass.id]: `Richiesta di rinnovo per ${label} registrata. Team Zoe la gestisce in sede; il rinnovo online con Stripe arriverà a breve.`,
    }));
  }

  if (!ready) {
    return (
      <Layout variant="academy">
        <section className="member">
          <p className="lede">Caricamento…</p>
        </section>
      </Layout>
    );
  }

  if (!session) {
    return <Navigate to="/accedi/associati" replace />;
  }

  return (
    <Layout variant="academy">
      <section className="member">
        <div className="member-head">
          <div>
            <p className="eyebrow">La tua area</p>
            <h1>Ciao, {session.name.split(" ")[0]}.</h1>
            <p className="lede">
              Account socio: {session.email}. Qui trovi i corsi associati da Team Zoe, con pagamento
              o ingressi disponibili.
            </p>
          </div>
          <button type="button" className="member-logout" onClick={logout}>
            Esci
          </button>
        </div>

        {passes.length === 0 ? (
          <p className="lede">
            Nessun corso associato ancora. Quando Team Zoe attiva un prodotto per te, compare qui.
          </p>
        ) : (
          <div className="member-pass-list">
            {passes.map((pass) => {
              const activity = resolveActivity(pass.activitySlug);
              const counts = passCounts(pass);
              return (
                <article key={pass.id} className="member-pass">
                  {activity?.image ? (
                    <Link
                      to={`/attivita/${pass.activitySlug}`}
                      className="member-art"
                      aria-label={`${pass.activityTitle}, apri la scheda`}
                    >
                      <img src={activity.image} alt="" />
                    </Link>
                  ) : (
                    <Link
                      to={`/attivita/${pass.activitySlug}`}
                      className="member-art member-art-fallback"
                      aria-label={`${pass.activityTitle}, apri la scheda`}
                    >
                      <span>{pass.activityTitle}</span>
                    </Link>
                  )}
                  <div>
                    <p className="card-kicker">{activity?.eyebrow || "Corso associato"}</p>
                    <h2>{pass.activityTitle}</h2>
                    <p className="member-status">
                      Attivo{activity?.age ? ` · ${activity.age}` : ""}
                    </p>
                    {pass.passKind === "course" ? (
                      <dl className="pass-counts">
                        <div>
                          <dt>Importo</dt>
                          <dd>
                            {typeof pass.amountPaid === "number"
                              ? formatEuro(pass.amountPaid)
                              : "—"}
                          </dd>
                        </div>
                        <div className="is-left">
                          <dt>Pagamento</dt>
                          <dd>{paymentChannelLabel(pass.paymentChannel)}</dd>
                        </div>
                      </dl>
                    ) : (
                      <>
                        <dl className="pass-counts">
                          <div>
                            <dt>Acquistati</dt>
                            <dd>{counts.purchased}</dd>
                          </div>
                          <div>
                            <dt>Usati</dt>
                            <dd>{counts.used}</dd>
                          </div>
                          <div className="is-left">
                            <dt>Rimasti</dt>
                            <dd>{counts.left}</dd>
                          </div>
                        </dl>
                        <ol
                          className="tokens"
                          aria-label={`${counts.purchased} ingressi, ${counts.used} usati e ${counts.left} rimasti`}
                        >
                          {pass.entries.map((entry) => (
                            <li
                              key={entry.index}
                              className={entry.used ? "is-used" : "is-left"}
                            >
                              <span className="token-label">
                                {entry.used ? "Usato" : "Rimasto"}
                              </span>
                            </li>
                          ))}
                        </ol>
                        <p className="member-note">
                          {counts.used} ingressi usati · {counts.left} ancora da usare
                        </p>
                      </>
                    )}
                    <div className="member-pass-actions">
                      <Link className="member-back" to={`/attivita/${pass.activitySlug}`}>
                        Apri la scheda
                      </Link>
                      {isPaidInSede(pass) ? (
                        <button
                          type="button"
                          className="btn member-renew"
                          onClick={() => requestRenew(pass)}
                        >
                          Rinnova
                        </button>
                      ) : null}
                    </div>
                    {renewNotes[pass.id] ? (
                      <p className="member-renew-note">{renewNotes[pass.id]}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}
