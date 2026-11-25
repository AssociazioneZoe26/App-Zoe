import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../lib/supabase";

export type ParticipantRow = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  relationship: "mother" | "father" | "guardian" | "other";
};

const RELATIONSHIP_LABELS: Record<ParticipantRow["relationship"], string> = {
  mother: "Madre",
  father: "Padre",
  guardian: "Tutore",
  other: "Altro",
};

type Props = {
  guardianId: string;
  enabled: boolean;
};

const emptyForm = {
  first_name: "",
  last_name: "",
  birth_date: "",
  relationship: "mother" as ParticipantRow["relationship"],
};

export function ParticipantsPanel({ guardianId, enabled }: Props) {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const supabase = getSupabase();
    const { data, error: loadError } = await supabase
      .from("participants")
      .select("id, first_name, last_name, birth_date, relationship")
      .eq("guardian_user_id", guardianId)
      .order("created_at", { ascending: true });
    if (loadError) {
      setError("Impossibile caricare i partecipanti.");
      return;
    }
    setRows((data as ParticipantRow[]) ?? []);
  }

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, guardianId]);

  if (!enabled) return null;

  function startEdit(row: ParticipantRow) {
    setEditingId(row.id);
    setForm({
      first_name: row.first_name,
      last_name: row.last_name,
      birth_date: row.birth_date,
      relationship: row.relationship,
    });
    setError("");
    setNote("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNote("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.birth_date) {
      setError("Nome, cognome e data di nascita sono obbligatori.");
      return;
    }
    setBusy(true);
    const supabase = getSupabase();
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      birth_date: form.birth_date,
      relationship: form.relationship,
      guardian_user_id: guardianId,
    };
    const result = editingId
      ? await supabase.from("participants").update(payload).eq("id", editingId).eq("guardian_user_id", guardianId)
      : await supabase.from("participants").insert(payload);
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Salvataggio non riuscito.");
      return;
    }
    setNote(editingId ? "Partecipante aggiornato." : "Partecipante aggiunto.");
    resetForm();
    await load();
  }

  async function onRemove(id: string) {
    if (!window.confirm("Rimuovere questo partecipante?")) return;
    setBusy(true);
    const supabase = getSupabase();
    const { error: delError } = await supabase
      .from("participants")
      .delete()
      .eq("id", id)
      .eq("guardian_user_id", guardianId);
    setBusy(false);
    if (delError) {
      setError(delError.message || "Eliminazione non riuscita.");
      return;
    }
    if (editingId === id) resetForm();
    setNote("Partecipante rimosso.");
    await load();
  }

  return (
    <section className="member-participants">
      <h2>Partecipanti (figli)</h2>
      <p className="lede">
        Aggiungi i minori collegati al tuo account. Non serve un login separato per loro.
      </p>

      {rows.length === 0 ? (
        <p className="member-note">Nessun partecipante ancora.</p>
      ) : (
        <ul className="member-participant-list">
          {rows.map((row) => (
            <li key={row.id}>
              <div>
                <strong>
                  {row.first_name} {row.last_name}
                </strong>
                <span>
                  {RELATIONSHIP_LABELS[row.relationship]} · nato/a il{" "}
                  {new Date(row.birth_date).toLocaleDateString("it-IT")}
                </span>
              </div>
              <div className="member-participant-actions">
                <button
                  type="button"
                  className="member-participant-btn member-participant-btn-edit"
                  onClick={() => startEdit(row)}
                >
                  Modifica
                </button>
                <button
                  type="button"
                  className="member-participant-btn member-participant-btn-remove"
                  onClick={() => void onRemove(row.id)}
                  disabled={busy}
                >
                  Rimuovi
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="admin-form member-participant-form" onSubmit={onSubmit}>
        <h3>{editingId ? "Modifica partecipante" : "Aggiungi partecipante"}</h3>
        <div className="admin-form-row">
          <label>
            Nome
            <input
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              required
            />
          </label>
          <label>
            Cognome
            <input
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              required
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Data di nascita
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              required
            />
          </label>
          <label>
            Rapporto
            <select
              value={form.relationship}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  relationship: e.target.value as ParticipantRow["relationship"],
                }))
              }
            >
              <option value="mother">Madre</option>
              <option value="father">Padre</option>
              <option value="guardian">Tutore</option>
              <option value="other">Altro</option>
            </select>
          </label>
        </div>
        {error ? <p className="admin-form-error">{error}</p> : null}
        {note ? <p className="admin-form-note">{note}</p> : null}
        <div className="member-pass-actions">
          <button type="submit" className="admin-submit" disabled={busy}>
            {busy ? "Salvataggio…" : editingId ? "Salva modifiche" : "Aggiungi"}
          </button>
          {editingId ? (
            <button type="button" className="btn member-renew" onClick={resetForm}>
              Annulla
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
