import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { loadActivity, resolveActivity } from "../admin/productToActivity";
import { Layout } from "../components/Layout";
import { formatCourseDay, isPastEndDate } from "../lib/coursePeriod";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { memberGateMessage, useMemberAuth } from "../member/MemberAuthContext";
import { SignupPath } from "../member/SignupPath";
import { fetchMemberEntryPacks, type MemberEntryPack } from "../lib/entryPacks";
import { MemberPacksSection } from "../member/MemberPacksSection";
import { ParticipantsPanel } from "../member/ParticipantsPanel";
import {
  canRenewPass,
  getPassesForMember,
  isPassAccessExpired,
  monthlyRenewAvailableAt,
  passCounts,
  resolvePassPlan,
  type MemberPass,
} from "../member/passesStore";
import { syncMemberPassesFromActivations } from "../member/syncMemberPasses";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function mergePassesBySlug(local: MemberPass[], remote: MemberPass[]) {
  const remoteCourseSlugs = new Set(
    remote
      .filter((pass) => pass.passKind === "course" || pass.plan === "course")
      .map((pass) => pass.activitySlug),
  );
  const byKey = new Map<string, MemberPass>();
  for (const pass of local) {
    if (
      (pass.passKind === "course" || pass.plan === "course") &&
      remoteCourseSlugs.has(pass.activitySlug)
    ) {
      continue;
    }
    byKey.set(pass.activitySlug, pass);
  }
  for (const pass of remote) {
    const key =
      pass.passKind === "course" || pass.plan === "course"
        ? `${pass.activitySlug}::${pass.participantId || pass.id}`
        : pass.activitySlug;
    byKey.set(key, pass);
  }
  return [...byKey.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function AccountPage() {
  const { session, ready, logout, refreshProfile } = useMemberAuth();
  const [passes, setPasses] = useState<MemberPass[]>([]);
  const [entryPacks, setEntryPacks] = useState<MemberEntryPack[]>([]);
  const [renewNotes, setRenewNotes] = useState<Record<string, string>>({});
  const [loadingRemote, setLoadingRemote] = useState(false);

  useEffect(() => {
    document.title = "La tua area · Zoe";
  }, []);

  useEffect(() => {
    if (!session?.canAccessMemberArea) {
      setPasses([]);
      setEntryPacks([]);
      return;
    }
    syncMemberPassesFromActivations();
    const local = getPassesForMember(session.email).filter(
      (pass) => pass.passKind !== "entries" && pass.plan !== "pack",
    );
    setPasses(local);

    if (!isSupabaseConfigured()) return;
    setLoadingRemote(true);
    const supabase = getSupabase();
    void (async () => {
      const [ents, packs] = await Promise.all([
        supabase
          .from("entitlements")
          .select(
            "id, kind, status, starts_at, ends_at, updated_at, participant_id, participants(first_name, last_name), products(id, title, slug, kind, preview_image)",
          )
          .eq("user_id", session.id)
          .in("status", ["active", "expired"]),
        fetchMemberEntryPacks(session.id),
      ]);

      const remote: MemberPass[] = [];

      for (const row of ents.data ?? []) {
        const product = row.products as
          | {
              id?: string;
              title?: string;
              slug?: string;
              kind?: string;
              preview_image?: string;
            }
          | null;
        if (!product?.slug || row.status === "revoked") continue;
        const participant = row.participants as
          | { first_name?: string; last_name?: string }
          | null;
        const child = [participant?.first_name, participant?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const expired = row.status === "expired" || isPastEndDate(row.ends_at as string | null);
        remote.push({
          id: `remote_ent_${row.id}`,
          memberEmail: session.email,
          memberName: session.name,
          activitySlug: product.slug,
          activityTitle: product.title || "Corso",
          previewImage: product.preview_image || "",
          productId: product.id,
          passKind: "course",
          plan: row.kind === "monthly" ? "monthly" : "course",
          status: expired ? "expired" : "active",
          entries: [],
          paymentChannel: "sede",
          startsAt: (row.starts_at as string | null) || undefined,
          endsAt: (row.ends_at as string | null) || undefined,
          participantId: (row.participant_id as string | null) ?? null,
          participantName: child || null,
          updatedAt: row.updated_at || new Date().toISOString(),
        });
        await loadActivity(product.slug);
      }

      setEntryPacks(packs);
      for (const pack of packs) {
        if (pack.product_slug) await loadActivity(pack.product_slug);
      }

      setPasses(
        mergePassesBySlug(getPassesForMember(session.email), remote).filter(
          (pass) => pass.passKind !== "entries" && pass.plan !== "pack",
        ),
      );
      setLoadingRemote(false);
    })();
  }, [session]);

  async function requestRenew(pass: MemberPass) {
    const label =
      pass.plan === "monthly"
        ? "abbonamento mensile"
        : "pacchetto ingressi";

    if (!isSupabaseConfigured()) {
      setRenewNotes((current) => ({
        ...current,
        [pass.id]: "Richiesta non disponibile al momento. Contatta Team Zoe in sede.",
      }));
      return;
    }

    const {
      data: { user },
    } = await getSupabase().auth.getUser();
    if (!user) {
      setRenewNotes((current) => ({
        ...current,
        [pass.id]: "Sessione scaduta. Accedi di nuovo e riprova.",
      }));
      return;
    }

    const { error } = await getSupabase().from("renewal_requests").insert({
      user_id: user.id,
      member_email: session!.email,
      member_name: session!.name,
      product_id: pass.productId || null,
      activity_slug: pass.activitySlug,
      activity_title: pass.activityTitle,
      plan: label,
      pass_id: pass.id,
      note: "Richiesta da area socio",
      status: "pending",
    });

    if (error) {
      setRenewNotes((current) => ({
        ...current,
        [pass.id]: `Invio non riuscito: ${error.message}`,
      }));
      return;
    }

    setRenewNotes((current) => ({
      ...current,
      [pass.id]:
        "Richiesta inviata a Team Zoe. Il rinnovo dell’abbonamento, un nuovo pacchetto o un nuovo corso si pagheranno da qui con Stripe.",
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

  const gate = memberGateMessage(session);

  if (!session.canAccessMemberArea) {
    return (
      <Layout variant="academy">
        <section className="member">
          <div className="member-head">
            <p className="eyebrow">La tua area</p>
            <h1>Ciao, {session.name.split(" ")[0] || "socio"}.</h1>
            <p className="lede">Account: {session.email}</p>
          </div>
          <div className="member-status-card">
            <h2>Iscrizione in corso</h2>
            <p>{gate}</p>
            <SignupPath
              emailDone={session.emailVerified}
              approved={session.memberStatus === "approved"}
            />
            <p className="member-note">
              Lo stato attuale è <strong>{session.memberStatus}</strong>
              {session.emailVerified ? " · email verificata" : " · email da confermare"}.
            </p>
            <div className="member-pass-actions">
              <button type="button" className="btn member-renew" onClick={() => void refreshProfile()}>
                Aggiorna stato
              </button>
              <button type="button" className="admin-logout" onClick={() => void logout()}>
                Esci
              </button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout variant="academy">
      <section className="member">
        <div className="member-head">
          <p className="eyebrow">La tua area</p>
          <h1>Ciao, {session.name.split(" ")[0]}.</h1>
          <p className="lede">
            Account socio: {session.email}. Il primo pacchetto, corso o laboratorio lo attiva Team
            Zoe dopo il pagamento in sede. Da qui rinnovi l’abbonamento mensile, prendi un nuovo
            pacchetto o acquisti un nuovo corso con Stripe.
          </p>
        </div>

        <ParticipantsPanel guardianId={session.id} enabled />

        <MemberPacksSection packs={entryPacks} loading={loadingRemote} />

        {passes.length === 0 ? (
          <p className="lede">
            {loadingRemote
              ? "Caricamento corsi associati…"
              : "Nessun corso ancora. Team Zoe attiva il primo pacchetto, corso o laboratorio dopo il pagamento in sede."}
          </p>
        ) : (
          <div className="member-pass-list">
            {passes.map((pass) => {
              const activity = resolveActivity(pass.activitySlug);
              const poster = activity?.image || pass.previewImage;
              const counts = passCounts(pass);
              const plan = resolvePassPlan(pass);
              const accessExpired = isPassAccessExpired(pass);
              const showRenew = plan !== "course" && plan !== "none" && canRenewPass(pass);
              const statusLabel =
                pass.status === "expired" || accessExpired
                  ? plan === "monthly" || plan === "course"
                    ? "Scaduto"
                    : plan === "pack"
                      ? "Esaurito"
                      : "Disattivato"
                  : "Attivo";
              return (
                <article key={pass.id} className="member-pass">
                  {poster ? (
                    <Link
                      to={`/attivita/${pass.activitySlug}`}
                      className="member-art"
                      aria-label={`${pass.activityTitle}, apri la scheda`}
                    >
                      <img src={poster} alt="" />
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
                    <p
                      className={`member-status${
                        pass.status === "expired" || accessExpired ? " is-expired" : ""
                      }`}
                    >
                      {statusLabel}
                      {activity?.age ? ` · ${activity.age}` : ""}
                    </p>
                    {plan === "course" || pass.passKind === "course" ? (
                      <dl className="pass-counts">
                        <div>
                          <dt>Bambino</dt>
                          <dd>{pass.participantName || "Da associare"}</dd>
                        </div>
                        <div>
                          <dt>Inizio</dt>
                          <dd>{pass.startsAt ? formatCourseDay(pass.startsAt) : "—"}</dd>
                        </div>
                        <div className="is-left">
                          <dt>Fine</dt>
                          <dd>{pass.endsAt ? formatCourseDay(pass.endsAt) : "—"}</dd>
                        </div>
                      </dl>
                    ) : plan === "monthly" ? (
                      <>
                        <dl className="pass-counts">
                          <div>
                            <dt>Abbonamento</dt>
                            <dd>Mensile</dd>
                          </div>
                          <div className="is-left">
                            <dt>Scade</dt>
                            <dd>
                              {(() => {
                                const when = monthlyRenewAvailableAt(pass);
                                if (!when) return "—";
                                return accessExpired
                                  ? "Scaduto"
                                  : formatDate(when);
                              })()}
                            </dd>
                          </div>
                        </dl>
                        <p className="member-note">
                          {accessExpired
                            ? "Abbonamento scaduto: puoi richiedere il rinnovo."
                            : "Abbonamento di 30 giorni. Rinnova compare solo a scadenza."}
                        </p>
                      </>
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
                          {accessExpired
                            ? "Pacchetto esaurito: puoi richiedere il rinnovo."
                            : `${counts.used} ingressi usati · ${counts.left} ancora da usare`}
                        </p>
                      </>
                    )}
                    <div className="member-pass-actions">
                      <Link className="member-back" to={`/attivita/${pass.activitySlug}`}>
                        Apri la scheda
                      </Link>
                      {showRenew ? (
                        <button
                          type="button"
                          className="btn member-renew"
                          onClick={() => void requestRenew(pass)}
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
