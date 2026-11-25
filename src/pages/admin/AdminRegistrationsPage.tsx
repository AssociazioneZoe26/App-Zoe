import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../../admin/AuthContext";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";

type MemberRow = {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  member_status: string;
  member_number: string | null;
  created_at: string;
};

type ParticipantMini = {
  id: string;
  guardian_user_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  relationship: string;
};

type Action = "approve" | "reject" | "suspend" | "reactivate";

export function AdminRegistrationsPage() {
  const { accessToken } = useAdminAuth();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [participantsByGuardian, setParticipantsByGuardian] = useState<
    Record<string, ParticipantMini[]>
  >({});
  const [filter, setFilter] = useState<"pending" | "all" | "approved" | "rejected" | "suspended">(
    "pending",
  );
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [matesByNumber, setMatesByNumber] = useState<Record<string, MemberRow[]>>({});

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setError("");
    const supabase = getSupabase();
    let query = supabase
      .from("profiles")
      .select(
        "id, email, full_name, first_name, last_name, member_status, member_number, created_at",
      )
      .eq("role", "member")
      .order("created_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("member_status", filter);
    }
    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      return;
    }
    const members = (data as MemberRow[]) ?? [];
    setRows(members);
    setNumberDrafts(
      Object.fromEntries(members.map((m) => [m.id, m.member_number?.trim() || ""])),
    );

    if (members.length === 0) {
      setParticipantsByGuardian({});
      setMatesByNumber({});
      return;
    }
    const { data: parts } = await supabase
      .from("participants")
      .select("id, guardian_user_id, first_name, last_name, birth_date, relationship")
      .in(
        "guardian_user_id",
        members.map((m) => m.id),
      );
    const map: Record<string, ParticipantMini[]> = {};
    for (const p of (parts as ParticipantMini[]) ?? []) {
      (map[p.guardian_user_id] ??= []).push(p);
    }
    setParticipantsByGuardian(map);

    const numbers = [
      ...new Set(members.map((m) => m.member_number?.trim()).filter((value): value is string => Boolean(value))),
    ];
    if (numbers.length === 0) {
      setMatesByNumber({});
      return;
    }
    const { data: mates } = await supabase
      .from("profiles")
      .select("id, email, full_name, first_name, last_name, member_status, member_number, created_at")
      .eq("role", "member")
      .in("member_number", numbers);
    const matesMap: Record<string, MemberRow[]> = {};
    for (const mate of (mates as MemberRow[]) ?? []) {
      const number = mate.member_number?.trim();
      if (!number) continue;
      (matesMap[number] ??= []).push(mate);
    }
    setMatesByNumber(matesMap);
  }, [filter]);

  useEffect(() => {
    document.title = "Richieste registrazione · Admin Zoe";
    void load();
  }, [load]);

  async function saveMemberNumber(memberId: string) {
    if (!isSupabaseConfigured()) return;
    const value = (numberDrafts[memberId] ?? "").trim();
    const current = rows.find((row) => row.id === memberId)?.member_number?.trim() || "";
    if (value === current) return;

    setBusyId(memberId);
    setError("");
    setNote("");
    const { error: saveError } = await getSupabase()
      .from("profiles")
      .update({ member_number: value || null })
      .eq("id", memberId);

    setBusyId(null);
    if (saveError) {
      if (/member_number_max_accounts/i.test(saveError.message)) {
        setError(
          "Questa tessera è già su due account (es. madre e padre). Non se ne possono aggiungere altri.",
        );
      } else if (/unique|duplicate/i.test(saveError.message)) {
        setError(
          "Questa tessera è già su due account (es. madre e padre). Non se ne possono aggiungere altri.",
        );
      } else {
        setError(saveError.message);
      }
      return;
    }
    setNote(
      value
        ? `Numero tessera salvato: ${value}. Puoi usare lo stesso numero su un secondo account (madre o padre).`
        : "Numero tessera rimosso.",
    );
    await load();
  }

  async function runAction(targetUserId: string, action: Action) {
    if (!accessToken) {
      setError("Sessione admin non valida.");
      return;
    }
    setBusyId(targetUserId);
    setError("");
    setNote("");
    try {
      const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/functions/v1/set-member-status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId, action }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Operazione non riuscita.");
      } else {
        setNote(`Operazione ${action} completata.`);
        await load();
      }
    } catch {
      setError("Errore di rete.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-panel">
      <p className="eyebrow eyebrow-red">Soci</p>
      <h1>Richieste di registrazione</h1>
      <p className="lede">
        Percorso: la persona si registra e conferma l’email, tu approvi, il numero tessera lo
        assegni dopo (non serve per approvare). Lo stesso numero può stare su due account (madre e
        padre). Il numero è visibile solo a Team Zoe.
      </p>

      <div className="admin-filter-row">
        {(
          [
            ["pending", "In attesa"],
            ["approved", "Approvati"],
            ["rejected", "Rifiutati"],
            ["suspended", "Sospesi"],
            ["all", "Tutti"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "btn is-active-filter" : "btn member-renew"}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="admin-form-error">{error}</p> : null}
      {note ? <p className="admin-form-note">{note}</p> : null}

      {rows.length === 0 ? (
        <p className="lede">Nessuna richiesta in questo filtro.</p>
      ) : (
        <ul className="admin-registration-list">
          {rows.map((row) => {
            const parts = participantsByGuardian[row.id] ?? [];
            const tessera = row.member_number?.trim() || "";
            const mates = (tessera ? matesByNumber[tessera] : [])?.filter((other) => other.id !== row.id) ?? [];
            const name =
              [row.first_name, row.last_name].filter(Boolean).join(" ") ||
              row.full_name ||
              "—";
            return (
              <li key={row.id} className="admin-registration-card">
                <div>
                  <h2>{name}</h2>
                  <p>{row.email}</p>
                  <p>
                    Stato: <strong>{row.member_status}</strong> · Registrato il{" "}
                    {new Date(row.created_at).toLocaleString("it-IT")}
                  </p>
                  {parts.length > 0 ? (
                    <p className="admin-form-note">
                      Partecipanti:{" "}
                      {parts
                        .map((p) => `${p.first_name} ${p.last_name}`)
                        .join(", ")}
                    </p>
                  ) : (
                    <p className="admin-form-note">Nessun partecipante collegato.</p>
                  )}
                  {mates.length > 0 ? (
                    <p className="admin-form-note">
                      Stessa tessera anche su:{" "}
                      {mates
                        .map(
                          (other) =>
                            [other.first_name, other.last_name].filter(Boolean).join(" ") ||
                            other.email,
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                  <label className="admin-member-number">
                    Numero tessera
                    <span className="admin-member-number-row">
                      <input
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        placeholder="Numero tessera (anche su 2 account)"
                        value={numberDrafts[row.id] ?? ""}
                        disabled={busyId === row.id}
                        onChange={(event) =>
                          setNumberDrafts((current) => ({
                            ...current,
                            [row.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveMemberNumber(row.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="admin-secondary"
                        disabled={busyId === row.id}
                        onClick={() => void saveMemberNumber(row.id)}
                      >
                        Salva n°
                      </button>
                    </span>
                  </label>
                </div>
                <div className="admin-registration-actions">
                  <button
                    type="button"
                    className="admin-submit"
                    disabled={busyId === row.id || row.member_status === "approved"}
                    onClick={() => void runAction(row.id, "approve")}
                  >
                    Approva
                  </button>
                  <button
                    type="button"
                    className="btn member-renew"
                    disabled={busyId === row.id}
                    onClick={() => void runAction(row.id, "reject")}
                  >
                    Rifiuta
                  </button>
                  <button
                    type="button"
                    className="btn member-renew"
                    disabled={busyId === row.id || row.member_status === "suspended"}
                    onClick={() => void runAction(row.id, "suspend")}
                  >
                    Sospendi
                  </button>
                  <button
                    type="button"
                    className="btn member-renew"
                    disabled={
                      busyId === row.id ||
                      (row.member_status !== "suspended" && row.member_status !== "rejected")
                    }
                    onClick={() => void runAction(row.id, "reactivate")}
                  >
                    Riattiva
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
