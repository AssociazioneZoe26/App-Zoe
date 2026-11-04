import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, listProducts } from "../../admin/catalogStore";
import { catalogKindOptions, type CatalogProduct } from "../../admin/catalogTypes";

function kindLabel(kind: CatalogProduct["kind"]) {
  return catalogKindOptions.find((item) => item.id === kind)?.label ?? kind;
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  function refresh() {
    setProducts(listProducts());
  }

  useEffect(() => {
    document.title = "Catalogo · Admin Zoe";
    refresh();
  }, []);

  function onDelete(product: CatalogProduct) {
    if (!window.confirm(`Eliminare “${product.title}”?`)) return;
    deleteProduct(product.id);
    refresh();
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Academy</p>
          <h1>Catalogo prodotti</h1>
          <p className="lede">
            Crea laboratori, corsi, workshop e corsi online. Per gli online il corso completo è un
            video.
          </p>
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
                  {kindLabel(product.kind)}
                  {product.published ? " · Pubblicato" : " · Bozza"}
                  {product.kind === "online" && product.courseVideoUrl ? " · Video ok" : ""}
                </span>
              </div>
              <div className="admin-table-actions">
                <Link to={`/admin/catalogo/${product.id}`}>Modifica</Link>
                <Link to={`/admin/attivazioni?prodotto=${product.id}`}>Attiva socio</Link>
                <button type="button" onClick={() => onDelete(product)}>
                  Elimina
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
