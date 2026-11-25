import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  archiveProductAndSync,
  deleteProductAndSync,
  hydrateAdminCatalog,
  listProducts,
} from "../../admin/catalogStore";
import {
  catalogKindOptions,
  inferProductOffer,
  offerLabel,
  type CatalogProduct,
} from "../../admin/catalogTypes";
import { syncAllLocalToCloud } from "../../lib/cloudSync";

function kindLabel(kind: CatalogProduct["kind"]) {
  return catalogKindOptions.find((item) => item.id === kind)?.label ?? kind;
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [syncNote, setSyncNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    setProducts(listProducts());
  }

  useEffect(() => {
    document.title = "Catalogo · Admin Zoe";
    let cancelled = false;
    void (async () => {
      try {
        // Prima spinge eventuali prodotti solo-locali, poi rilegge dal cloud.
        const result = await syncAllLocalToCloud();
        if (cancelled) return;
        await hydrateAdminCatalog();
        if (cancelled) return;
        refresh();
        if (result.products > 0 || result.activations > 0) {
          setSyncNote(
            `Catalogo allineato al cloud: ${result.products} prodotti, ${result.activations} attivazioni.`,
          );
        } else {
          setSyncNote("Catalogo caricato da Supabase.");
        }
      } catch {
        if (!cancelled) {
          setSyncNote("Sync non riuscita. Riprova aprendo di nuovo il catalogo.");
          refresh();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onArchive(product: CatalogProduct) {
    if (!window.confirm(`Mettere “${product.title}” in bozza? Sparisce dal catalogo pubblico.`)) {
      return;
    }
    setBusyId(product.id);
    setSyncNote("Archiviazione in corso…");
    const result = await archiveProductAndSync(product.id);
    setBusyId(null);
    if (!result.ok) {
      setSyncNote(result.error || "Archiviazione non riuscita.");
      return;
    }
    refresh();
    setSyncNote(`“${product.title}” messo in bozza.`);
  }

  async function onDelete(product: CatalogProduct) {
    if (!window.confirm(`Eliminare “${product.title}” anche dal cloud?`)) return;
    setBusyId(product.id);
    setSyncNote("Eliminazione in corso…");
    const result = await deleteProductAndSync(product.id);
    setBusyId(null);
    if (!result.ok) {
      if (result.code === "fk_blocked") {
        const archive = window.confirm(
          `${result.error}\n\nVuoi invece metterlo in bozza (archiviare)?`,
        );
        if (archive) {
          await onArchive(product);
          return;
        }
      }
      setSyncNote(result.error || "Eliminazione non riuscita.");
      return;
    }
    refresh();
    setSyncNote(`“${product.title}” eliminato dal catalogo e da Supabase.`);
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Academy</p>
          <h1>Catalogo prodotti</h1>
          <p className="lede">
            Crea laboratori, corsi, workshop e corsi online. Pacchetto da 4, da 8 e abbonamento
            mensile sono tre prodotti distinti.
          </p>
          {syncNote ? <p className="admin-form-note">{syncNote}</p> : null}
        </div>
        <Link className="admin-primary" to="/admin/catalogo/nuovo">
          Nuovo prodotto
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="admin-empty">Nessun prodotto ancora. Creane uno per il catalogo.</p>
      ) : (
        <ul className="admin-table">
          {products.map((product) => (
            <li key={product.id}>
              <div className="admin-table-main">
                <strong>{product.title}</strong>
                <span>
                  {kindLabel(product.kind)} · {offerLabel(inferProductOffer(product))}
                  {product.published ? " · Pubblicato" : " · Bozza"}
                  {product.kind === "online" &&
                  (product.coursePreviewVideoUrl ||
                    product.courseVideoUrl ||
                    (product.courseLessons && product.courseLessons.length > 0))
                    ? " · Video ok"
                    : ""}
                </span>
              </div>
              <div className="admin-table-actions">
                <Link to={`/admin/catalogo/${product.id}`}>Modifica</Link>
                <Link to={`/admin/attivazioni?prodotto=${product.id}`}>Attiva socio</Link>
                {product.published ? (
                  <button
                    type="button"
                    onClick={() => void onArchive(product)}
                    disabled={busyId === product.id}
                  >
                    Bozza
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void onDelete(product)}
                  disabled={busyId === product.id}
                >
                  {busyId === product.id ? "…" : "Elimina"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
