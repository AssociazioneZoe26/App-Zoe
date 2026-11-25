import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  activateManuallyAndSync,
  hydrateAdminCatalog,
  listActivations,
  listProducts,
} from "../../admin/catalogStore";
import {
  productUsesCourseFee,
  type CatalogProduct,
  type ProductActivation,
} from "../../admin/catalogTypes";
import {
  assignPackParticipant,
  fetchPackConsumptions,
  restoreEntryConsumption,
  type EntryConsumptionRow,
} from "../../lib/entryPacks";
import { scanErrorMessage } from "../../lib/entryQr";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import {
  isEntryPackPass,
  listPasses,
  type MemberPass,
} from "../../member/passesStore";
import { syncMemberPassesFromActivations } from "../../member/syncMemberPasses";

function memberKey(email: string) {
  return encodeURIComponent(email.trim().toLowerCase());
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString("it-IT");
}

type MemberRow = {
  email: string;
  name: string;
  packs: MemberPass[];
};

type RemotePack = {
  id: string;
  status: string;
  entries_total: number;
  entries_used: number;
  product_title: string;
  product_slug: string;
  participant_id: string | null;
  participant_name: string;
};

function isActivePackActivation(activation: ProductActivation, products: CatalogProduct[]) {
  if (activation.status !== "active") return false;
  if (activation.plan === "monthly") return false;
  if (activation.plan === "pack") return true;
  const product = products.find((item) => item.id === activation.productId);
  if (!product) return activation.entriesTotal === 4 || activation.entriesTotal === 8;
  if (productUsesCourseFee(product) || product.kind === "corso" || product.kind === "online") {
    return false;
  }
  return product.kind === "laboratorio" || activation.entriesTotal >= 4;
}

function mapRemotePack(row: {
  id: unknown;
  status: unknown;
  entries_total: unknown;
  entries_used: unknown;
  participant_id: unknown;
  products: unknown;
  participants: unknown;
}): RemotePack {
  const product = row.products as { title?: string; slug?: string } | null;
  const participant = row.participants as { first_name?: string; last_name?: string } | null;
  const child = [participant?.first_name, participant?.last_name].filter(Boolean).join(" ");
  return {
    id: row.id as string,
    status: row.status as string,
    entries_total: Number(row.entries_total) || 0,
    entries_used: Number(row.entries_used) || 0,
    product_title: product?.title || "Laboratorio",
    product_slug: product?.slug || "",
    participant_id: (row.participant_id as string | null) ?? null,
    participant_name: child.trim() || "Titolare",
  };
}

function productMatchesPack(product: CatalogProduct, pack: RemotePack) {
  return product.title === pack.product_title || (!!product.slug && product.slug === pack.product_slug);
}

function pickPacksForActiveActivations(packs: RemotePack[], email: string) {
  const products = listProducts();
  const remaining = listActivations().filter(
    (activation) =>
      activation.memberEmail.trim().toLowerCase() === email &&
      isActivePackActivation(activation, products),
  );
  const kept: RemotePack[] = [];

  function takeMatch(
    pack: RemotePack,
    predicate: (activation: ProductActivation, product: CatalogProduct) => boolean,
  ) {
    const index = remaining.findIndex((activation) => {
      const product = products.find((item) => item.id === activation.productId);
      if (!product || !productMatchesPack(product, pack)) return false;
      if (Number(activation.entriesTotal) !== pack.entries_total) return false;
      return predicate(activation, product);
    });
    if (index < 0) return false;
    remaining.splice(index, 1);
    kept.push(pack);
    return true;
  }

  for (const pack of packs) {
    const exact = takeMatch(
      pack,
      (activation) => (activation.participantId || null) === (pack.participant_id || null),
    );
    if (exact) continue;
    takeMatch(pack, () => true);
  }
  return kept;
}

function groupMembers(passes: MemberPass[]): MemberRow[] {
  const map = new Map<string, MemberRow>();
  for (const pass of passes) {
    const email = pass.memberEmail.trim().toLowerCase();
    const current = map.get(email);
    if (current) {
      current.packs.push(pass);
      if (pass.memberName && pass.memberName !== email) current.name = pass.memberName;
    } else {
      map.set(email, { email, name: pass.memberName || email, packs: [pass] });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export function AdminPassesPage() {
  const { email: emailParam } = useParams();
  const selectedEmail = emailParam ? decodeURIComponent(emailParam).toLowerCase() : "";
  const [passes, setPasses] = useState<MemberPass[]>([]);
  const [syncNote, setSyncNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [remotePacks, setRemotePacks] = useState<RemotePack[]>([]);
  const [consumptions, setConsumptions] = useState<Record<string, EntryConsumptionRow[]>>({});
  const [children, setChildren] = useState<{ id: string; first_name: string; last_name: string }[]>(
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [labProducts, setLabProducts] = useState<CatalogProduct[]>([]);
  const [memberName, setMemberName] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newPackSize, setNewPackSize] = useState<4 | 8>(4);
  const [newParticipantId, setNewParticipantId] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);

  function showLocalPasses() {
    syncMemberPassesFromActivations();
    const products = listProducts();
    const active = listActivations().filter((activation) =>
      isActivePackActivation(activation, products),
    );
    const activeIds = new Set(active.map((activation) => activation.id));
    const activeKeys = new Set(
      active.map(
        (activation) =>
          `${activation.productId}::${activation.memberEmail.trim().toLowerCase()}`,
      ),
    );
    setPasses(
      listPasses().filter((pass) => {
        if ((pass.status ?? "active") !== "active") return false;
        if (!isEntryPackPass(pass)) return false;
        if (pass.activationId && activeIds.has(pass.activationId)) return true;
        return activeKeys.has(`${pass.productId}::${pass.memberEmail.trim().toLowerCase()}`);
      }),
    );
  }

  useEffect(() => {
    document.title = selectedEmail ? "Dettaglio ingressi · Admin Zoe" : "Ingressi soci · Admin Zoe";
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await hydrateAdminCatalog();
      if (cancelled) return;
      showLocalPasses();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedEmail]);

  useEffect(() => {
    if (!selectedEmail || !isSupabaseConfigured()) {
      setRemotePacks([]);
      setChildren([]);
      setNewParticipantId("");
      return;
    }
    setNewParticipantId("");
    let cancelled = false;
    void (async () => {
      const catalog = await hydrateAdminCatalog();
      if (cancelled) return;
      const all = catalog.length > 0 ? catalog : listProducts();
      const labs = all.filter(
        (product) =>
          product.kind === "laboratorio" ||
          typeof product.pricePack5 === "number" ||
          typeof product.pricePack10 === "number",
      );
      const assignable = labs.length > 0 ? labs : all.filter((product) => product.kind !== "online");
      setLabProducts(assignable);
      setNewProductId(assignable[0]?.id || "");

      const supabase = getSupabase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .ilike("email", selectedEmail)
        .maybeSingle();
      if (!profile?.id || cancelled) return;
      const profileName =
        [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
        (profile.full_name as string) ||
        selectedEmail;
      setMemberName(profileName);
      const [{ data: packs }, { data: parts }] = await Promise.all([
        supabase
          .from("entry_packs")
          .select(
            "id, status, entries_total, entries_used, participant_id, products(title, slug), participants(first_name, last_name)",
          )
          .eq("user_id", profile.id)
          .neq("status", "revoked")
          .order("created_at", { ascending: false }),
        supabase
          .from("participants")
          .select("id, first_name, last_name")
          .eq("guardian_user_id", profile.id)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      const kids = parts ?? [];
      setChildren(kids);
      setNewParticipantId(kids[0]?.id || "");
      const mapped = pickPacksForActiveActivations(
        (packs ?? []).map(mapRemotePack),
        selectedEmail,
      );
      setRemotePacks(mapped);
      const byPack: Record<string, EntryConsumptionRow[]> = {};
      for (const pack of mapped) {
        byPack[pack.id] = await fetchPackConsumptions(pack.id);
      }
      if (!cancelled) setConsumptions(byPack);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedEmail]);

  const members = useMemo(() => groupMembers(passes), [passes]);
  const selected = members.find((row) => row.email === selectedEmail);

  async function onRestore(consumptionId: string, packId: string) {
    if (!window.confirm("Annullare questo ingresso? Resta traccia dell’operazione.")) return;
    setBusyId(consumptionId);
    const result = await restoreEntryConsumption(consumptionId, "correction");
    setBusyId(null);
    if (!result.ok) {
      setSyncNote(scanErrorMessage(result.code));
      return;
    }
    setSyncNote("Ingresso annullato. Un credito è tornato sul pacchetto.");
    const rows = await fetchPackConsumptions(packId);
    setConsumptions((current) => ({ ...current, [packId]: rows }));
    setRemotePacks((current) =>
      current.map((pack) =>
        pack.id === packId
          ? {
              ...pack,
              entries_used: Math.max(0, pack.entries_used - 1),
              status: pack.status === "exhausted" ? "active" : pack.status,
            }
          : pack,
      ),
    );
  }

  function childLabel(
    participantId: string | null,
    fallbackName?: string,
  ) {
    if (!participantId) return "Titolare account";
    const index = children.findIndex((row) => row.id === participantId);
    if (index === -1) return fallbackName || "Figlio";
    const row = children[index];
    return `Figlio ${index + 1} · ${row.first_name} ${row.last_name}`;
  }

  async function reloadRemotePacks() {
    if (!selectedEmail || !isSupabaseConfigured()) return;
    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", selectedEmail)
      .maybeSingle();
    if (!profile?.id) return;
    const { data: packs } = await supabase
      .from("entry_packs")
      .select(
        "id, status, entries_total, entries_used, participant_id, products(title, slug), participants(first_name, last_name)",
      )
      .eq("user_id", profile.id)
      .neq("status", "revoked")
      .order("created_at", { ascending: false });
    const mapped = pickPacksForActiveActivations(
      (packs ?? []).map(mapRemotePack),
      selectedEmail,
    );
    setRemotePacks(mapped);
    const byPack: Record<string, EntryConsumptionRow[]> = {};
    for (const pack of mapped) {
      byPack[pack.id] = await fetchPackConsumptions(pack.id);
    }
    setConsumptions(byPack);
    showLocalPasses();
  }

  async function onCreatePack() {
    const product = labProducts.find((item) => item.id === newProductId);
    if (!product) {
      setSyncNote("Scegli un laboratorio.");
      return;
    }
    setAssignBusy(true);
    const child = children.find((row) => row.id === newParticipantId);
    const result = await activateManuallyAndSync({
      productId: product.id,
      memberName: selected?.name || memberName || selectedEmail,
      memberEmail: selectedEmail,
      entriesTotal: newPackSize,
      plan: "pack",
      paymentChannel: "sede",
      note: `Pacchetto ${newPackSize} ingressi · ${childLabel(newParticipantId || null)}`,
      participantId: newParticipantId || null,
      participantName: child ? `${child.first_name} ${child.last_name}`.trim() : null,
    });
    setAssignBusy(false);
    if (!result.syncOk) {
      setSyncNote(`Pacchetto creato in locale, sync non riuscita: ${result.syncError || "errore"}.`);
      return;
    }
    setSyncNote(
      `Pacchetto da ${newPackSize} associato a ${child ? childLabel(child.id) : "titolare account"}.`,
    );
    await reloadRemotePacks();
  }

  async function onAssign(packId: string, participantId: string) {
    const result = await assignPackParticipant(packId, participantId || null);
    if (!result.ok) {
      setSyncNote(result.error);
      return;
    }
    const child = children.find((row) => row.id === participantId);
    setRemotePacks((current) =>
      current.map((pack) =>
        pack.id === packId
          ? {
              ...pack,
              participant_id: participantId || null,
              participant_name: child ? `${child.first_name} ${child.last_name}` : "Titolare",
            }
          : pack,
      ),
    );
  }

  if (selectedEmail) {
    return (
      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow eyebrow-red">Soci</p>
            <h1>{selected?.name || memberName || selectedEmail}</h1>
            <p className="lede">{selectedEmail}</p>
          </div>
          <Link className="admin-secondary" to="/admin/ingressi">
            Torna alla lista
          </Link>
        </div>

        {syncNote ? <p className="admin-form-note">{syncNote}</p> : null}
        {loading ? <p className="admin-form-note">Caricamento pacchetti…</p> : null}

        <form
          className="admin-form admin-product-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreatePack();
          }}
        >
          <fieldset>
            <legend>Associa un pacchetto</legend>
            <p className="admin-form-note">
              Scegli 4 o 8 ingressi e il figlio (1 o 2). Ogni figlio ha il proprio QR.
            </p>
            <label>
              Laboratorio
              <select
                value={newProductId}
                onChange={(event) => setNewProductId(event.target.value)}
                required
              >
                {labProducts.length === 0 ? (
                  <option value="">Nessun laboratorio in catalogo</option>
                ) : (
                  labProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="admin-form-row">
              <label>
                Pacchetto
                <select
                  value={newPackSize}
                  onChange={(event) => setNewPackSize(Number(event.target.value) as 4 | 8)}
                >
                  <option value={4}>Pacchetto da 4 ingressi</option>
                  <option value={8}>Pacchetto da 8 ingressi</option>
                </select>
              </label>
              <label>
                Assegna a
                <select
                  value={newParticipantId}
                  onChange={(event) => setNewParticipantId(event.target.value)}
                >
                  <option value="">Titolare account</option>
                  {children.map((row, index) => (
                    <option key={row.id} value={row.id}>
                      Figlio {index + 1} · {row.first_name} {row.last_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {children.length === 0 ? (
              <p className="admin-form-note">
                Nessun figlio sul profilo. Il socio può aggiungerli in area account.
              </p>
            ) : null}
            <button className="btn" type="submit" disabled={assignBusy || !newProductId}>
              {assignBusy ? "Associazione…" : "Associa pacchetto"}
            </button>
          </fieldset>
        </form>

        {remotePacks.length === 0 && !loading ? (
          <p className="admin-empty">Nessun pacchetto per questo socio.</p>
        ) : (
          <ul className="admin-pass-list">
            {remotePacks.map((pack) => {
              const left = Math.max(0, pack.entries_total - pack.entries_used);
              const rows = consumptions[pack.id] ?? [];
              return (
                <li key={pack.id} className="admin-pass-card">
                  <div className="admin-pass-card-head">
                    <div>
                      <strong>{pack.product_title}</strong>
                      <span>
                        {childLabel(pack.participant_id, pack.participant_name)} ·{" "}
                        pacchetto da {pack.entries_total} · {pack.entries_used}/{pack.entries_total}{" "}
                        usati · {left} rimasti
                      </span>
                    </div>
                  </div>
                  <label>
                    Bambino
                    <select
                      value={pack.participant_id || ""}
                      onChange={(event) => void onAssign(pack.id, event.target.value)}
                    >
                      <option value="">Titolare account</option>
                      {children.map((row, index) => (
                        <option key={row.id} value={row.id}>
                          Figlio {index + 1} · {row.first_name} {row.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {rows.length === 0 ? (
                    <p className="admin-form-note">Nessuna presenza da scanner. Non spuntare a mano.</p>
                  ) : (
                    <ul className="admin-consumption-list">
                      {rows.map((row) => (
                        <li key={row.id}>
                          <span>
                            {formatWhen(row.created_at)} · {row.operator_name}
                            {row.reversed_at ? ` · Annullato ${formatWhen(row.reversed_at)}` : ""}
                          </span>
                          {!row.reversed_at ? (
                            <button
                              type="button"
                              className="admin-text-link"
                              disabled={busyId === row.id}
                              onClick={() => void onRestore(row.id, pack.id)}
                            >
                              Annulla ingresso
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Soci</p>
          <h1>Associati con pacchetti laboratorio</h1>
          <p className="lede">
            Solo i pacchetti attivi in Attivazioni. Lo scalare avviene da Scansiona ingresso.
          </p>
        </div>
        <Link className="admin-secondary" to="/admin/ingressi/scansiona">
          Scansiona ingresso
        </Link>
      </div>

      {syncNote ? <p className="admin-form-note">{syncNote}</p> : null}
      {loading ? <p className="admin-form-note">Caricamento pacchetti…</p> : null}

      {!loading && members.filter((member) => member.packs.some(isEntryPackPass)).length === 0 ? (
        <p className="admin-empty">
          Nessun pacchetto ingressi. Attiva un laboratorio da{" "}
          <Link to="/admin/attivazioni">Attivazioni</Link>.
        </p>
      ) : (
        <ul className="admin-table">
          {members
            .filter((member) => member.packs.some(isEntryPackPass))
            .map((member) => {
            const packPasses = member.packs.filter((pass) => isEntryPackPass(pass));
            const titles = packPasses.map((pass) => pass.activityTitle).filter(Boolean);
            const uniqueTitles = [...new Set(titles)];
            return (
              <li key={member.email}>
                <div className="admin-table-main">
                  <strong>{member.name}</strong>
                  <span>
                    {member.email}
                    {packPasses.length > 0
                      ? ` · ${packPasses.length} pacchett${packPasses.length === 1 ? "o" : "i"}`
                      : ""}
                    {uniqueTitles.length > 0 ? ` · ${uniqueTitles.join(", ")}` : ""}
                  </span>
                </div>
                <div className="admin-table-actions">
                  <Link to={`/admin/ingressi/socio/${memberKey(member.email)}`}>Dettaglio</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
