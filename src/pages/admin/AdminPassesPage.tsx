import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { paymentChannelLabel } from "../../admin/catalogTypes";
import {
  listPasses,
  passCounts,
  setPassEntryUsed,
  type MemberPass,
} from "../../member/passesStore";
import { syncMemberPassesFromActivations } from "../../member/syncMemberPasses";

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminPassesPage() {
  const [passes, setPasses] = useState<MemberPass[]>([]);

  function refresh() {
    syncMemberPassesFromActivations();
    setPasses(listPasses());
  }

  useEffect(() => {
    document.title = "Ingressi soci · Admin Zoe";
    refresh();
  }, []);

  function toggleEntry(passId: string, entryIndex: number, used: boolean) {
    setPassEntryUsed(passId, entryIndex, used);
    refresh();
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Soci</p>
          <h1>Ingressi</h1>
          <p className="lede">
            Spunta gli ingressi usati quando il socio partecipa in sede. Il profilo socio si
            aggiorna subito.
          </p>
        </div>
        <Link className="admin-secondary" to="/admin/attivazioni">
          Attivazioni
        </Link>
      </div>

      {passes.length === 0 ? (
        <p className="admin-empty">Nessun pacchetto ingressi ancora.</p>
      ) : (
        <ul className="admin-pass-list">
          {passes.map((pass) => {
            const counts = passCounts(pass);
            const isCourse = pass.passKind === "course";
            return (
              <li key={pass.id} className="admin-pass-card">
                <div className="admin-pass-card-head">
                  <div>
                    <strong>
                      {pass.memberName} · {pass.activityTitle}
                    </strong>
                    <span>
                      {isCourse
                        ? `${pass.memberEmail} · ${
                            typeof pass.amountPaid === "number"
                              ? formatEuro(pass.amountPaid)
                              : "Importo n/d"
                          } · ${paymentChannelLabel(pass.paymentChannel)}`
                        : `${pass.memberEmail} · ${counts.used}/${counts.purchased} usati · ${counts.left} rimasti`}
                    </span>
                  </div>
                </div>
                {isCourse ? (
                  <p className="admin-form-note">
                    Corso a quota fissa — niente conteggio ingressi.
                  </p>
                ) : (
                  <div className="admin-pass-flags" role="group" aria-label="Flag ingressi">
                    {pass.entries.map((entry) => (
                      <label key={entry.index} className={entry.used ? "is-used" : ""}>
                        <input
                          type="checkbox"
                          checked={entry.used}
                          onChange={(event) =>
                            toggleEntry(pass.id, entry.index, event.target.checked)
                          }
                        />
                        <span>Ingresso {entry.index + 1}</span>
                      </label>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
