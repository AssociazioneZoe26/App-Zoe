import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  inferProductOffer,
  offerLabel,
  priceForOffer,
  type ProductOffer,
} from "../admin/catalogTypes";
import { loadActivity, resolveActivity } from "../admin/productToActivity";
import { CourseVideoPlayer } from "../components/CourseVideoPlayer";
import { Layout } from "../components/Layout";
import { activityWhatsapp, type Activity } from "../data";
import { DEFAULT_PREVIEW_SECONDS, normalizeLessons } from "../lib/courseVideo";
import { formatCourseDay, formatMeetingCount, isPastEndDate } from "../lib/coursePeriod";
import { fetchMemberEntryPacks, type MemberEntryPack } from "../lib/entryPacks";
import { isSupabaseConfigured, getSupabase } from "../lib/supabase";
import { useMemberAuth } from "../member/MemberAuthContext";
import { getPassesForMember } from "../member/passesStore";
import { syncMemberPassesFromActivations } from "../member/syncMemberPasses";

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function activityOffer(activity: Activity): ProductOffer {
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

type CourseSeat = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  expired: boolean;
};

export function ActivityPage() {
  const { slug } = useParams();
  const [activity, setActivity] = useState<Activity | undefined>(() => resolveActivity(slug));
  const [catalogReady, setCatalogReady] = useState(false);
  const { session, ready } = useMemberAuth();
  const [hasCourseAccess, setHasCourseAccess] = useState(false);
  const [productPacks, setProductPacks] = useState<MemberEntryPack[]>([]);
  const [courseSeats, setCourseSeats] = useState<CourseSeat[]>([]);
  const [activeLesson, setActiveLesson] = useState(0);
  const [packRefresh, setPackRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatalogReady(false);
    void (async () => {
      const next = await loadActivity(slug);
      if (!cancelled) {
        setActivity(next);
        setCatalogReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") setPackRefresh((value) => value + 1);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    document.title = activity
      ? `${activity.title} · Zoe`
      : catalogReady
        ? "Attività non trovata · Zoe"
        : "Caricamento · Zoe";
  }, [activity, catalogReady]);

  useEffect(() => {
    if (!activity || !session) {
      setHasCourseAccess(false);
      setProductPacks([]);
      setCourseSeats([]);
      return;
    }
    syncMemberPassesFromActivations();
    const localPass = getPassesForMember(session.email).find(
      (pass) =>
        pass.activitySlug === activity.slug && (pass.status ?? "active") === "active",
    );
    if (localPass && localPass.passKind !== "course" && localPass.entries.length > 0) {
      setHasCourseAccess(true);
    } else if (!isSupabaseConfigured()) {
      setHasCourseAccess(Boolean(localPass) && !(localPass?.passKind === "course" && isPastEndDate(localPass.endsAt)));
      setProductPacks([]);
      setCourseSeats([]);
      return;
    }
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      const supabase = getSupabase();
      const [ents, packs] = await Promise.all([
        supabase
          .from("entitlements")
          .select(
            "id, starts_at, ends_at, status, participants(first_name, last_name), products(slug)",
          )
          .eq("user_id", session.id)
          .in("status", ["active", "expired"]),
        fetchMemberEntryPacks(session.id),
      ]);
      if (cancelled) return;
      const slug = activity.slug;
      const seats: CourseSeat[] = [];
      for (const row of ents.data ?? []) {
        const product = row.products as { slug?: string } | null;
        if (product?.slug !== slug || row.status === "revoked") continue;
        const participant = row.participants as
          | { first_name?: string; last_name?: string }
          | null;
        const name =
          [participant?.first_name, participant?.last_name].filter(Boolean).join(" ").trim() ||
          "Da associare";
        const startsOn = activity.courseStartsOn || "";
        const endsOn = activity.courseEndsOn || "";
        seats.push({
          id: row.id as string,
          name,
          startsOn,
          endsOn,
          expired: row.status === "expired" || isPastEndDate(endsOn),
        });
      }
      const current = packs.filter((pack) => pack.product_slug === slug);
      setProductPacks(current);
      setCourseSeats(seats);
      const courseStillOpen = seats.some((seat) => !seat.expired);
      const localCourseExpired =
        localPass?.passKind === "course" && isPastEndDate(localPass.endsAt);
      setHasCourseAccess(
        courseStillOpen || current.length > 0 || (Boolean(localPass) && !localCourseExpired),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [activity, session, packRefresh]);

  const lessons = useMemo(
    () => (activity?.online ? normalizeLessons(activity.courseLessons) : []),
    [activity],
  );
  const lessonCount = lessons.length;

  if (!activity) {
    return (
      <Layout variant="academy">
        <section className="missing">
          {catalogReady ? (
            <>
              <h1>Questa attività non c’è.</h1>
              <Link to="/academy">Torna al catalogo</Link>
            </>
          ) : (
            <p className="lede">Caricamento…</p>
          )}
        </section>
      </Layout>
    );
  }

  const isDatedCourse = activity.online || (activity.category === "Corso" && !activity.workshop);
  const isMember = ready && Boolean(session) && session?.memberStatus === "approved";
  const offer = activityOffer(activity);
  const packsOnCard = offer === "packs" || offer === "pack4" || offer === "pack8";
  const canBuyPack4 = packsOnCard && typeof activity.pricePack5 === "number";
  const canBuyPack8 = packsOnCard && typeof activity.pricePack10 === "number";
  const canBuyMonthly =
    (packsOnCard || offer === "monthly") && typeof activity.priceMonthly === "number";
  const offerPrice = priceForOffer(activity, offer);
  const hasPrices =
    canBuyPack4 || canBuyPack8 || canBuyMonthly || typeof offerPrice === "number";

  return (
    <Layout variant="academy">
      <article className="detail">
        <p className="back">
          <Link to="/academy#catalogo">← Tutte le attività</Link>
        </p>
        <div className={`detail-layout${activity.online ? " detail-layout-online" : ""}`}>
          <div className={`poster accent-${activity.accent}${activity.online ? " poster-online" : ""}`}>
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
            {activity.fullText || activity.summary ? (
              <p className="lede">{activity.fullText || activity.summary}</p>
            ) : null}
            {activity.online ? (
              <div className="course-media">
                {activity.coursePreviewVideoUrl ? (
                  <div className="course-preview-block">
                    <p className="eyebrow">Anteprima</p>
                    <CourseVideoPlayer
                      url={activity.coursePreviewVideoUrl}
                      title={`Anteprima · ${activity.title}`}
                      previewSeconds={
                        activity.coursePreviewSeconds && activity.coursePreviewSeconds > 0
                          ? activity.coursePreviewSeconds
                          : DEFAULT_PREVIEW_SECONDS
                      }
                    />
                  </div>
                ) : null}

                {hasCourseAccess ? (
                  <div className="course-full-block">
                    <p className="eyebrow eyebrow-red">Corso completo</p>
                    {(() => {
                      if (lessons.length > 0) {
                        const lesson = lessons[Math.min(activeLesson, lessons.length - 1)];
                        return (
                          <>
                            <div className="course-lesson-tabs" role="tablist">
                              {lessons.map((item, index) => (
                                <button
                                  key={`${item.title}-${index}`}
                                  type="button"
                                  role="tab"
                                  aria-selected={index === activeLesson}
                                  className={
                                    index === activeLesson
                                      ? "course-lesson-tab is-active"
                                      : "course-lesson-tab"
                                  }
                                  onClick={() => setActiveLesson(index)}
                                >
                                  {index + 1}. {item.title}
                                </button>
                              ))}
                            </div>
                            <CourseVideoPlayer
                              url={lesson.url}
                              title={lesson.title}
                            />
                          </>
                        );
                      }
                      if (activity.courseVideoUrl) {
                        return (
                          <CourseVideoPlayer
                            url={activity.courseVideoUrl}
                            title={`Corso completo · ${activity.title}`}
                          />
                        );
                      }
                      return (
                        <p className="lede">
                          Accesso attivo: il video completo sarà disponibile quando Team Zoe lo
                          carica nella scheda.
                        </p>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="course-video-locked">
                    <p className="eyebrow eyebrow-red">Corso completo</p>
                    <p className="lede">
                      Dopo l’acquisto (o l’attivazione in sede) puoi guardare il video completo
                      oppure le lezioni del corso.
                    </p>
                  </div>
                )}
              </div>
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
              {isDatedCourse ? (
                <>
                  <div>
                    <dt>Inizio</dt>
                    <dd>
                      {activity.courseStartsOn
                        ? formatCourseDay(activity.courseStartsOn)
                        : "Da definire"}
                    </dd>
                  </div>
                  <div>
                    <dt>Fine</dt>
                    <dd>
                      {activity.courseEndsOn
                        ? formatCourseDay(activity.courseEndsOn)
                        : "Da definire"}
                    </dd>
                  </div>
                  {!activity.online ? (
                    <div>
                      <dt>Incontri</dt>
                      <dd>{formatMeetingCount(activity.sessions)}</dd>
                    </div>
                  ) : null}
                  {!activity.online && activity.time ? (
                    <div>
                      <dt>Orario</dt>
                      <dd>{activity.time}</dd>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {activity.schedule ? (
                    <div>
                      <dt>Data</dt>
                      <dd>{activity.schedule}</dd>
                    </div>
                  ) : null}
                  {activity.time ? (
                    <div>
                      <dt>Orario</dt>
                      <dd>{activity.time}</dd>
                    </div>
                  ) : null}
                </>
              )}
              {activity.online ? (
                <div>
                  <dt>Lezioni</dt>
                  <dd>
                    {lessonCount > 0
                      ? lessonCount === 1
                        ? "1 lezione"
                        : `${lessonCount} lezioni`
                      : activity.courseVideoUrl
                        ? "Video completo"
                        : "—"}
                  </dd>
                </div>
              ) : null}
              {!isDatedCourse && !activity.online && activity.sessions ? (
                <div>
                  <dt>Incontri</dt>
                  <dd>{activity.sessions}</dd>
                </div>
              ) : null}
              {!activity.online ? (
                <div>
                  <dt>Dove</dt>
                  <dd>{activity.place}</dd>
                </div>
              ) : null}
              {activity.teacher ? (
                <div>
                  <dt>Conduce</dt>
                  <dd>{activity.teacher}</dd>
                </div>
              ) : null}
              {!hasCourseAccess && canBuyPack4 ? (
                <div>
                  <dt>4 ingressi</dt>
                  <dd>{formatEuro(activity.pricePack5!)}</dd>
                </div>
              ) : null}
              {!hasCourseAccess && canBuyPack8 ? (
                <div>
                  <dt>8 ingressi</dt>
                  <dd>{formatEuro(activity.pricePack10!)}</dd>
                </div>
              ) : null}
              {!hasCourseAccess && canBuyMonthly ? (
                <div>
                  <dt>Abbonamento mensile</dt>
                  <dd>{formatEuro(activity.priceMonthly!)}/mese</dd>
                </div>
              ) : null}
              {!hasCourseAccess &&
              !canBuyPack4 &&
              !canBuyPack8 &&
              !canBuyMonthly &&
              typeof offerPrice === "number" ? (
                <div>
                  <dt>{offerLabel(offer)}</dt>
                  <dd>
                    {formatEuro(offerPrice)}
                    {offer === "monthly" ? "/mese" : ""}
                  </dd>
                </div>
              ) : null}
            </dl>

            {hasCourseAccess && isMember ? (
              <div className="detail-discover">
                <p className="lede">
                  Ciao {session!.name.split(" ")[0]}, questo corso è già attivo sul tuo account.
                </p>
                {courseSeats
                  .filter((seat) => !seat.expired)
                  .map((seat) => (
                    <p key={seat.id} className="member-status">
                      {seat.name}
                      {seat.startsOn ? ` · dal ${formatCourseDay(seat.startsOn)}` : ""}
                      {seat.endsOn ? ` al ${formatCourseDay(seat.endsOn)}` : ""}
                    </p>
                  ))}
                {productPacks.length > 0
                  ? productPacks.map((pack) => {
                      const left = Math.max(0, pack.entries_total - pack.entries_used);
                      return (
                        <div key={pack.id} className="detail-pack-remain">
                          <p className="member-status">
                            {pack.participant_name} · pacchetto da {pack.entries_total}
                          </p>
                          <dl className="pass-counts" style={{ marginTop: 12 }}>
                            <div>
                              <dt>Acquistati</dt>
                              <dd>{pack.entries_total}</dd>
                            </div>
                            <div>
                              <dt>Usati</dt>
                              <dd>{pack.entries_used}</dd>
                            </div>
                            <div className="is-left">
                              <dt>Rimasti</dt>
                              <dd>{left}</dd>
                            </div>
                          </dl>
                          <ol
                            className="tokens"
                            aria-label={`${pack.entries_total} ingressi, ${pack.entries_used} usati e ${left} rimasti`}
                          >
                            {Array.from({ length: pack.entries_total }, (_, index) => (
                              <li
                                key={index}
                                className={index < pack.entries_used ? "is-used" : "is-left"}
                              >
                                <span className="token-label">
                                  {index < pack.entries_used ? "Usato" : "Rimasto"}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })
                  : null}
                <Link className="btn btn-large" to="/accedi/associati/area">
                  Vai alla tua area
                </Link>
              </div>
            ) : isMember && courseSeats.some((seat) => seat.expired) ? (
              <div className="detail-discover">
                <p className="lede">
                  Ciao {session!.name.split(" ")[0]}, questo corso risulta scaduto.
                </p>
                {courseSeats
                  .filter((seat) => seat.expired)
                  .map((seat) => (
                    <p key={seat.id} className="member-status is-expired">
                      Scaduto · {seat.name}
                      {seat.endsOn ? ` · fine ${formatCourseDay(seat.endsOn)}` : ""}
                    </p>
                  ))}
                <Link className="btn btn-large" to="/accedi/associati/area">
                  Vai alla tua area
                </Link>
              </div>
            ) : isMember ? (
              <div className="detail-discover">
                <p className="lede">
                  Ciao {session!.name.split(" ")[0]}. Il primo pacchetto, corso o laboratorio lo
                  attiva Team Zoe dopo il pagamento in sede.
                </p>
                <Link className="btn btn-large" to="/accedi/associati/area">
                  Vai alla tua area
                </Link>
                <a
                  className="member-back"
                  href={activityWhatsapp(activity)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Scrivi su WhatsApp
                </a>
                <p className="fine">
                  Dal tuo account potrai rinnovare l’abbonamento mensile, prendere un nuovo
                  pacchetto o acquistare un nuovo corso con Stripe.
                  {hasPrices
                    ? ""
                    : ` Per questa attività i prezzi non sono ancora online. Numero ${activity.phoneLabel}.`}
                </p>
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
