import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  activateManuallyAndSync,
  deleteActivationAndSync,
  hydrateAdminCatalog,
  listActivations,
  listProducts,
  setActivationStatus,
} from "../../admin/catalogStore";
import type { CatalogProduct, PaymentChannel, ProductActivation } from "../../admin/catalogTypes";
import {
  inferProductOffer,
  offerLabel,
  paymentChannelLabel,
  priceForOffer,
  productHasMonthlyPrice,
  productUsesCourseFee,
  productUsesEntries,
  productUsesMonthly,
} from "../../admin/catalogTypes";
import { useAdminAuth } from "../../admin/AuthContext";
import { fetchApprovedMembers, type ApprovedMember } from "../../admin/members";
import { dateOnly, formatCourseDay } from "../../lib/coursePeriod";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

type RenewalRequestRow = {
  id: string;
  member_email: string;
  member_name: string | null;
  activity_title: string;
  plan: string | null;
  status: string;
  created_at: string;
};

export function AdminActivationsPage() {
  const { ready: authReady, session: adminSession } = useAdminAuth();
  const [params] = useSearchParams();
  const [members, setMembers] = useState<ApprovedMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [products, setProducts] = useState(() => listProducts());
  const [activations, setActivations] = useState<ProductActivation[]>([]);
  const [renewals, setRenewals] = useState<RenewalRequestRow[]>([]);
  const [productId, setProductId] = useState(params.get("prodotto") || "");
  const [memberId, setMemberId] = useState("");
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("sede");
  const [note, setNote] = useState("Pagamento in sede");
  const [message, setMessage] = useState("");
  const [accessChoice, setAccessChoice] = useState<"pack4" | "pack8" | "monthly">("pack4");
  const [participantId, setParticipantId] = useState("");
  const [activationKind, setActivationKind] = useState<"access" | "course">("access");
  const [participants, setParticipants] = useState<
    { id: string; first_name: string; last_name: string }[]
  >([]);
  const [activationChildren, setActivationChildren] = useState<
    { id: string; first_name: string; last_name: string; guardian_user_id: string }[]
  >([]);

  const courseProducts = products.filter(
    (product) => product.kind === "corso" || product.kind === "online",
  );
  const accessProducts = products.filter(
    (product) => product.kind !== "corso" && product.kind !== "online",
  );
  const visibleProducts = activationKind === "course" ? courseProducts : accessProducts;
  const selectedProduct =
    visibleProducts.find((product) => product.id === productId) || visibleProducts[0];
  const courseStart = dateOnly(selectedProduct?.startsOn);
  const courseEnd = dateOnly(selectedProduct?.endsOn);
  const courseHasDates = Boolean(courseStart && courseEnd);
  const selectedOffer = selectedProduct ? inferProductOffer(selectedProduct) : "course";
  const isLaboratorio = selectedProduct?.kind === "laboratorio";
  const isCourseFee = selectedProduct ? productUsesCourseFee(selectedProduct) : false;
  const canActivatePack4 = Boolean(
    isLaboratorio || (selectedProduct && typeof selectedProduct.pricePack5 === "number"),
  );
  const canActivatePack8 = Boolean(
    isLaboratorio || (selectedProduct && typeof selectedProduct.pricePack10 === "number"),
  );
  const canActivateMonthly = Boolean(
    isLaboratorio || (selectedProduct && productHasMonthlyPrice(selectedProduct)),
  );
  const activeChoice: "pack4" | "pack8" | "monthly" = isLaboratorio
    ? accessChoice
    : accessChoice === "monthly" && canActivateMonthly
      ? "monthly"
      : accessChoice === "pack8" && canActivatePack8
        ? "pack8"
        : accessChoice === "pack4" && canActivatePack4
          ? "pack4"
          : canActivatePack4
            ? "pack4"
            : canActivatePack8
              ? "pack8"
              : "monthly";
  const usesEntries = isLaboratorio
    ? activeChoice !== "monthly"
    : Boolean(selectedProduct && productUsesEntries(selectedProduct) && activeChoice !== "monthly");
  const isMonthly = activeChoice === "monthly";
  const productPrice = selectedProduct
    ? isCourseFee
      ? priceForOffer(selectedProduct, "course")
      : activeChoice === "monthly"
        ? selectedProduct.priceMonthly
        : activeChoice === "pack8"
          ? selectedProduct.pricePack10
          : activeChoice === "pack4"
            ? selectedProduct.pricePack5
            : priceForOffer(selectedProduct, selectedOffer)
    : undefined;

  function refresh() {
    setActivations(listActivations());
  }

  useEffect(() => {
    document.title = "Attivazioni · Admin Zoe";
    refresh();
    if (!authReady) return;
    void (async () => {
      await hydrateAdminCatalog();
      const next = listProducts();
      setProducts(next);
      setProductId((current) => current || params.get("prodotto") || next[0]?.id || "");

      const approved = await fetchApprovedMembers();
      setMembers(approved);
      setMemberId((current) => current || approved[0]?.id || "");
      setMembersLoading(false);

      if (isSupabaseConfigured()) {
        const { data } = await getSupabase()
          .from("renewal_requests")
          .select("id, member_email, member_name, activity_title, plan, status, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20);
        setRenewals((data as RenewalRequestRow[] | null) ?? []);
      }
    })();
  }, [authReady, adminSession?.id]);

  useEffect(() => {
    const fromQuery = params.get("prodotto");
    const queried = products.find((product) => product.id === fromQuery);
    if (!queried) return;
    setActivationKind(queried.kind === "corso" || queried.kind === "online" ? "course" : "access");
  }, [params, products]);

  useEffect(() => {
    if (visibleProducts.length === 0) return;
    if (visibleProducts.some((product) => product.id === productId)) return;
    const fromQuery = params.get("prodotto");
    const queried = visibleProducts.find((product) => product.id === fromQuery);
    setProductId((queried || visibleProducts[0]).id);
  }, [activationKind, products, productId, params]);

  useEffect(() => {
    if (!selectedProduct) return;
    setPaymentChannel("sede");
    setNote("Pagamento in sede");
    if (selectedProduct.kind === "laboratorio") setAccessChoice("pack4");
    else if (typeof selectedProduct.pricePack5 === "number") setAccessChoice("pack4");
    else if (typeof selectedProduct.pricePack10 === "number") setAccessChoice("pack8");
    else if (typeof selectedProduct.priceMonthly === "number") setAccessChoice("monthly");
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!memberId || !isSupabaseConfigured()) {
      setParticipants([]);
      setParticipantId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await getSupabase()
        .from("participants")
        .select("id, first_name, last_name")
        .eq("guardian_user_id", memberId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = data ?? [];
      setParticipants(rows);
      setParticipantId(rows[0]?.id || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  useEffect(() => {
    const ids = [
      ...new Set(
        activations
          .map((activation) => activation.participantId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (!isSupabaseConfigured() || ids.length === 0 || !authReady) {
      if (ids.length === 0) setActivationChildren([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = getSupabase();
      const emails = [
        ...new Set(activations.map((activation) => activation.memberEmail.trim().toLowerCase())),
      ];
      const collected: {
        id: string;
        first_name: string;
        last_name: string;
        guardian_user_id: string;
      }[] = [];
      for (const email of emails) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .maybeSingle();
        if (!profile?.id) continue;
        const { data: parts } = await supabase
          .from("participants")
          .select("id, first_name, last_name, guardian_user_id")
          .eq("guardian_user_id", profile.id)
          .order("created_at", { ascending: true });
        collected.push(...(parts ?? []));
      }
      if (cancelled) return;
      setActivationChildren(collected);
    })();
    return () => {
      cancelled = true;
    };
  }, [activations, authReady, adminSession?.id]);

  function productTitle(id: string, list: CatalogProduct[]) {
    return list.find((product) => product.id === id)?.title ?? "Prodotto";
  }

  function activationKey(activation: ProductActivation) {
    return `${activation.productId}::${activation.memberEmail.trim().toLowerCase()}::${activation.participantId || "account"}`;
  }

  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const activation of activations) {
      const key = activationKey(activation);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
    );
  }, [activations]);

  function isDuplicateActivation(activation: ProductActivation) {
    return duplicateKeys.has(activationKey(activation));
  }

  function activationChildLabel(activation: ProductActivation) {
    const participantId = activation.participantId || "";
    if (!participantId) return "Titolare account";
    const fromForm = participants.find((row) => row.id === participantId);
    const fromAll = activationChildren.find((row) => row.id === participantId);
    const row = fromAll || fromForm;
    const stored = activation.participantName?.trim() || "";
    if (!row) return stored || "Figlio";
    const siblings = fromAll
      ? activationChildren.filter((item) => item.guardian_user_id === fromAll.guardian_user_id)
      : participants;
    const index = siblings.findIndex((item) => item.id === participantId);
    const name = `${row.first_name} ${row.last_name}`.trim() || stored;
    const order = index >= 0 ? `Figlio ${index + 1}` : "Figlio";
    return `${order} · ${name}`;
  }

  function activationSummary(activation: ProductActivation) {
    const product = products.find((item) => item.id === activation.productId);
    const parts = [activation.memberEmail];

    if (activation.plan === "monthly") {
      parts.push("Abbonamento mensile");
    } else if (product) {
      parts.push(offerLabel(inferProductOffer(product)));
    }
    if (
      product &&
      (productUsesCourseFee(product) ||
        activation.plan === "monthly" ||
        productUsesMonthly(product))
    ) {
      const amount =
        typeof activation.amountPaid === "number"
          ? activation.amountPaid
          : priceForOffer(product);
      if (typeof amount === "number") {
        parts.push(formatEuro(amount));
      }
      parts.push(paymentChannelLabel(activation.paymentChannel));
    } else {
      parts.push(activation.source === "manual" ? "Manuale" : "Stripe");
      parts.push(`${activation.entriesUsed}/${activation.entriesTotal} usati`);
    }

    parts.push(activation.status === "active" ? "Attiva" : "Scaduta");
    if (isDuplicateActivation(activation)) parts.push("Doppione");
    return parts.join(" · ");
  }

  async function markRenewalDone(id: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await getSupabase()
      .from("renewal_requests")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setMessage(`Rinnovo non aggiornato: ${error.message}`);
      return;
    }
    setRenewals((current) => current.filter((row) => row.id !== id));
    setMessage("Richiesta di rinnovo segnata come gestita.");
  }

  async function onDeleteDuplicate(activation: ProductActivation) {
    if (
      !window.confirm(
        `Eliminare l’attivazione di ${activation.memberName} per questo prodotto? Non si può annullare.`,
      )
    ) {
      return;
    }
    setMessage("Eliminazione…");
    const result = await deleteActivationAndSync(activation.id);
    refresh();
    if (!result.ok) {
      setMessage(`Eliminata in locale; sync online non riuscita: ${result.error || "errore"}.`);
      return;
    }
    setMessage(
      result.revokedRemote
        ? "Attivazione eliminata (anche online)."
        : "Doppione eliminato. Resta l’altra attivazione attiva.",
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = members.find((item) => item.id === memberId);
    if (!productId || !member || !selectedProduct) {
      setMessage("Scegli prodotto e socio.");
      return;
    }

    setMessage("Attivazione e sync online…");

    if (!isLaboratorio && typeof productPrice !== "number") {
      setMessage("Imposta il prezzo nella scheda prodotto.");
      return;
    }
    if (paymentChannel !== "sede") {
      setMessage("Il primo pacchetto, corso o laboratorio si attiva solo con pagamento in sede.");
      return;
    }
    if (isCourseFee && participants.length > 0 && !participantId) {
      setMessage("Scegli il bambino a cui associare il corso.");
      return;
    }

    const plan = isMonthly ? "monthly" : usesEntries ? "pack" : undefined;
    const choiceLabel = isCourseFee
      ? "Corso"
      : isMonthly
        ? "Abbonamento mensile"
        : activeChoice === "pack8"
          ? "Pacchetto 8 ingressi"
          : usesEntries
            ? "Pacchetto 4 ingressi"
            : offerLabel(selectedOffer);
    const chosenChild = participants.find((row) => row.id === participantId);
    const result = await activateManuallyAndSync({
      productId: selectedProduct.id,
      memberName: member.name,
      memberEmail: member.email,
      entriesTotal: isCourseFee || isMonthly ? 1 : activeChoice === "pack8" ? 8 : 4,
      plan: isCourseFee ? undefined : plan,
      amountPaid: typeof productPrice === "number" ? productPrice : undefined,
      paymentChannel: "sede",
      note:
        note.trim() ||
        `${choiceLabel}${typeof productPrice === "number" ? ` · ${formatEuro(productPrice)}` : ""}`,
      participantId: isLaboratorio || usesEntries || isCourseFee ? participantId || null : null,
      participantName: chosenChild
        ? `${chosenChild.first_name} ${chosenChild.last_name}`.trim()
        : null,
      startsOn: isCourseFee ? courseStart : undefined,
      endsOn: isCourseFee ? courseEnd : undefined,
    });
    const who = chosenChild
      ? `${chosenChild.first_name} ${chosenChild.last_name}`.trim()
      : member.name;
    setMessage(
      result.syncOk
        ? `${choiceLabel} attivato per ${who}. Lo trovi in Attivazioni recenti.`
        : `Attivato in locale per ${who}, sync non riuscita: ${result.syncError || "errore"}.`,
    );
    refresh();
    document.getElementById("attivazioni-recenti")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Soci</p>
          <h1>Attivazioni</h1>
          <p className="lede">
            Il primo pacchetto, corso o laboratorio si attiva qui, dopo il pagamento in sede. Poi il
            socio rinnova l’abbonamento, prende un nuovo pacchetto o acquista un nuovo corso dal suo
            account, con Stripe.
          </p>
        </div>
        <Link className="admin-secondary" to="/admin/catalogo">
          Catalogo
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="admin-empty">
          Prima crea un prodotto nel <Link to="/admin/catalogo">catalogo</Link>.
        </p>
      ) : (
        <form
          className="admin-form admin-product-form"
          onSubmit={(event) => void onSubmit(event)}
        >
          <fieldset>
            <legend>Primo acquisto in sede</legend>
            <label>
              Cosa attivi
              <select
                value={activationKind}
                onChange={(event) =>
                  setActivationKind(event.target.value as "access" | "course")
                }
              >
                <option value="access">Pacchetto o abbonamento mensile</option>
                <option value="course">Corso</option>
              </select>
            </label>
            <label>
              Prodotto
              <select
                value={selectedProduct?.id || ""}
                onChange={(event) => setProductId(event.target.value)}
                disabled={visibleProducts.length === 0}
              >
                {visibleProducts.length === 0 ? (
                  <option value="">
                    {activationKind === "course"
                      ? "Nessun corso in catalogo"
                      : "Nessun laboratorio in catalogo"}
                  </option>
                ) : (
                  visibleProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                      {product.published ? "" : " · bozza"}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Socio approvato
              <select
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                required
                disabled={membersLoading || members.length === 0}
              >
                {membersLoading ? (
                  <option value="">Caricamento soci…</option>
                ) : members.length === 0 ? (
                  <option value="">Nessun socio approvato</option>
                ) : (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.email}
                    </option>
                  ))
                )}
              </select>
            </label>
            {!membersLoading && members.length === 0 ? (
              <p className="admin-form-note">
                Approva prima i soci da{" "}
                <Link to="/admin/registrazioni">Registrazioni</Link>.
              </p>
            ) : null}
            {isLaboratorio || usesEntries || isCourseFee ? (
              <label>
                Bambino / partecipante
                <select
                  value={participantId}
                  onChange={(event) => setParticipantId(event.target.value)}
                  required={isCourseFee && participants.length > 0}
                >
                  <option value="">{isCourseFee ? "Scegli il bambino" : "Titolare account"}</option>
                  {participants.map((row, index) => (
                    <option key={row.id} value={row.id}>
                      Figlio {index + 1} · {row.first_name} {row.last_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {isCourseFee ? (
              courseHasDates ? (
                <p className="admin-form-note">
                  Periodo già impostato sul corso: dal {formatCourseDay(courseStart)} al{" "}
                  {formatCourseDay(courseEnd)}. Non va reinserito.
                </p>
              ) : (
                <p className="admin-form-note">
                  Inizio e fine non sono ancora sulla scheda del corso. Puoi attivare lo stesso il
                  bambino: le date si aggiungono quando le imposti nel corso.
                </p>
              )
            ) : null}

            <div className="admin-form-row">
              {isCourseFee ? (
                <label>
                  Offerta
                  <input
                    value={
                      selectedProduct
                        ? `Corso${
                            typeof productPrice === "number" ? ` · ${formatEuro(productPrice)}` : ""
                          }`
                        : "Corso"
                    }
                    readOnly
                  />
                </label>
              ) : isLaboratorio || usesEntries || canActivateMonthly ? (
                <label>
                  Offerta
                  <select
                    value={activeChoice}
                    onChange={(event) =>
                      setAccessChoice(event.target.value as "pack4" | "pack8" | "monthly")
                    }
                  >
                    {canActivatePack4 ? (
                      <option value="pack4">
                        Pacchetto 4 ingressi
                        {typeof selectedProduct?.pricePack5 === "number"
                          ? ` · ${formatEuro(selectedProduct.pricePack5)}`
                          : ""}
                      </option>
                    ) : null}
                    {canActivatePack8 ? (
                      <option value="pack8">
                        Pacchetto 8 ingressi
                        {typeof selectedProduct?.pricePack10 === "number"
                          ? ` · ${formatEuro(selectedProduct.pricePack10)}`
                          : ""}
                      </option>
                    ) : null}
                    {canActivateMonthly ? (
                      <option value="monthly">
                        Abbonamento mensile
                        {typeof selectedProduct?.priceMonthly === "number"
                          ? ` · ${formatEuro(selectedProduct.priceMonthly)}/mese`
                          : ""}
                      </option>
                    ) : null}
                  </select>
                </label>
              ) : (
                <label>
                  Offerta
                  <input
                    value={
                      selectedProduct
                        ? `${offerLabel(selectedOffer)}${
                            typeof productPrice === "number" ? ` · ${formatEuro(productPrice)}` : ""
                          }`
                        : "Scegli un prodotto"
                    }
                    readOnly
                  />
                </label>
              )}
              <label>
                Pagamento
                <select
                  value={paymentChannel}
                  onChange={(event) => {
                    const next = event.target.value as PaymentChannel;
                    setPaymentChannel(next);
                    if (next === "sede") setNote("Pagamento in sede");
                  }}
                >
                  <option value="sede">Pagamento in sede</option>
                </select>
              </label>
            </div>
            <p className="admin-form-note">
              Vale per il primo pacchetto, il primo corso e il primo laboratorio. Rinnovo mensile,
              nuovo pacchetto e nuovo corso restano nel conto del socio.
            </p>
            <label>
              Nota
              <input value={note} onChange={(event) => setNote(event.target.value)} />
            </label>

            {message ? <p className="admin-form-note">{message}</p> : null}
            <button type="submit" className="admin-submit">
              Attiva per pagamento in sede
            </button>
          </fieldset>
        </form>
      )}

      <h2 className="admin-subhead">Richieste di rinnovo</h2>
      {renewals.length === 0 ? (
        <p className="admin-empty">Nessuna richiesta di rinnovo in sospeso.</p>
      ) : (
        <ul className="admin-table">
          {renewals.map((row) => (
            <li key={row.id}>
              <div className="admin-table-main">
                <strong>
                  {(row.member_name || row.member_email).trim()} · {row.activity_title}
                </strong>
                <span>
                  {row.member_email}
                  {row.plan ? ` · ${row.plan}` : ""}
                  {` · ${new Date(row.created_at).toLocaleString("it-IT")}`}
                </span>
              </div>
              <div className="admin-table-actions">
                <button
                  type="button"
                  onClick={() => void markRenewalDone(row.id)}
                >
                  Segna come gestita
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="admin-subhead" id="attivazioni-recenti">
        Attivazioni recenti
      </h2>
      {activations.length === 0 ? (
        <p className="admin-empty">Nessuna attivazione ancora.</p>
      ) : (
        <ul className="admin-table">
          {activations.map((activation) => (
            <li key={activation.id}>
              <div className="admin-table-main">
                <strong>
                  {activation.memberName} · {activationChildLabel(activation)} ·{" "}
                  {productTitle(activation.productId, products)}
                </strong>
                <span>{activationSummary(activation)}</span>
              </div>
              <div className="admin-table-actions">
                {isDuplicateActivation(activation) ? (
                  <button
                    type="button"
                    className="admin-action-danger"
                    onClick={() => void onDeleteDuplicate(activation)}
                  >
                    Elimina
                  </button>
                ) : activation.status === "active" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActivationStatus(activation.id, "expired");
                      refresh();
                    }}
                  >
                    Disattiva
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActivationStatus(activation.id, "active");
                      refresh();
                    }}
                  >
                    Riattiva
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
