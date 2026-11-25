import { Link } from "react-router-dom";
import { PackQrCode } from "../components/PackQrCode";
import type { MemberEntryPack } from "../lib/entryPacks";

type Props = {
  packs: MemberEntryPack[];
  loading: boolean;
};

export function MemberPacksSection({ packs, loading }: Props) {
  return (
    <section className="member-packs">
      <p className="eyebrow">I miei pacchetti</p>
      <h2>QR e ingressi</h2>
      {loading ? <p className="lede">Caricamento pacchetti…</p> : null}
      {!loading && packs.length === 0 ? (
        <p className="lede">Nessun pacchetto ingressi. Quando ne acquisti uno, il QR compare qui.</p>
      ) : (
        <ul className="member-pack-list">
          {packs.map((pack) => {
            const left = Math.max(0, pack.entries_total - pack.entries_used);
            const usable = pack.status === "active" && left > 0;
            return (
              <li key={pack.id} className="member-pass">
                <div className="member-pass-media">
                  {pack.product_image ? (
                    <Link
                      to={`/attivita/${pack.product_slug}`}
                      className="member-art"
                      aria-label={`${pack.product_title}, apri la scheda`}
                    >
                      <img src={pack.product_image} alt="" />
                    </Link>
                  ) : null}
                  {usable ? (
                    <PackQrCode
                      scanToken={pack.scan_token}
                      label={`QR ingressi ${pack.participant_name}`}
                    />
                  ) : (
                    <p className="member-note">
                      A zero ingressi il pacchetto non è più utilizzabile. Il QR è nascosto.
                    </p>
                  )}
                </div>
                <div>
                  <p className="card-kicker">Laboratorio</p>
                  <h2>{pack.product_title}</h2>
                  <p className={`member-status${usable ? "" : " is-expired"}`}>
                    {usable ? "Attivo" : pack.status === "exhausted" ? "Esaurito" : "Non utilizzabile"}
                  </p>
                  <dl className="pass-counts pass-counts-course">
                    <div>
                      <dt>Bambino</dt>
                      <dd>{pack.participant_name || "Da associare"}</dd>
                    </div>
                    <div>
                      <dt>Pacchetto</dt>
                      <dd>{pack.entries_total} ingressi</dd>
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
                  {pack.product_slug ? (
                    <div className="member-pass-actions">
                      <Link className="member-back" to={`/attivita/${pack.product_slug}`}>
                        Apri la scheda
                      </Link>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
