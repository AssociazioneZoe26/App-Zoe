import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  activateManually,
  listActivations,
  listProducts,
  setActivationStatus,
} from "../../admin/catalogStore";
import type { CatalogProduct, PaymentChannel, ProductActivation } from "../../admin/catalogTypes";
import {
  paymentChannelLabel,
  productUsesCourseFee,
  productUsesEntries,
} from "../../admin/catalogTypes";
import { listMembers } from "../../member/accounts";

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminActivationsPage() {
  const [params] = useSearchParams();
  const products = useMemo(() => listProducts(), []);
  const members = useMemo(() => listMembers(), []);
  const [activations, setActivations] = useState<ProductActivation[]>([]);
  const [productId, setProductId] = useState(params.get("prodotto") || products[0]?.id || "");
  const [memberId, setMemberId] = useState(members[0]?.id || "");
  const [entriesTotal, setEntriesTotal] = useState("10");
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("sede");
  const [note, setNote] = useState("Pagamento in sede");
  const [message, setMessage] = useState("");

  const selectedProduct = products.find((product) => product.id === productId);
  const isCourseFee = selectedProduct ? productUsesCourseFee(selectedProduct) : false;
  const usesEntries = selectedProduct ? productUsesEntries(selectedProduct) : true;
  const courseAmount =
    selectedProduct && typeof selectedProduct.priceCourse === "number"
      ? selectedProduct.priceCourse
      : undefined;

  function refresh() {
    setActivations(listActivations());
  }

  useEffect(() => {
    document.title = "Attivazioni · Admin Zoe";
    refresh();
  }, []);

  useEffect(() => {
    const fromQuery = params.get("prodotto");
    if (fromQuery && products.some((product) => product.id === fromQuery)) {
      setProductId(fromQuery);
    }
  }, [params, products]);

  useEffect(() => {
    if (!selectedProduct) return;
    if (productUsesCourseFee(selectedProduct)) {
      setPaymentChannel("sede");
      setNote("Pagamento in sede");
      setEntriesTotal("1");
    } else {
      setEntriesTotal("10");
      setNote("Pagamento in sede");
    }
  }, [selectedProduct?.id]);

  function productTitle(id: string, list: CatalogProduct[]) {
    return list.find((product) => product.id === id)?.title ?? "Prodotto";
  }

  function activationSummary(activation: ProductActivation) {
    const product = products.find((item) => item.id === activation.productId);
    const parts = [activation.memberEmail];

    if (product && productUsesCourseFee(product)) {
      const amount =
        typeof activation.amountPaid === "number"
          ? activation.amountPaid
          : product.priceCourse;
      if (typeof amount === "number") {
        parts.push(formatEuro(amount));
      }
      parts.push(paymentChannelLabel(activation.paymentChannel));
    } else {
      parts.push(activation.source === "manual" ? "Manuale" : "Stripe");
      parts.push(`${activation.entriesUsed}/${activation.entriesTotal} usati`);
    }

    parts.push(activation.status === "active" ? "Attiva" : "Scaduta");
    return parts.join(" · ");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = members.find((item) => item.id === memberId);
    if (!productId || !member || !selectedProduct) {
      setMessage("Scegli prodotto e socio.");
      return;
    }

    if (isCourseFee) {
      if (typeof courseAmount !== "number") {
        setMessage("Imposta il costo del corso nella scheda prodotto.");
        return;
      }
      if (paymentChannel === "online") {
        setMessage("Il pagamento online con Stripe non è ancora collegato.");
        return;
      }
      activateManually({
        productId,
        memberName: member.name,
        memberEmail: member.email,
        entriesTotal: 1,
        amountPaid: courseAmount,
        paymentChannel,
        note:
          note.trim() ||
          `${formatEuro(courseAmount)} · ${paymentChannelLabel(paymentChannel)}`,
      });
      setMessage(
        `Corso attivato per ${member.name}: ${formatEuro(courseAmount)} · ${paymentChannelLabel(paymentChannel)}.`,
      );
    } else {
      activateManually({
        productId,
        memberName: member.name,
        memberEmail: member.email,
        entriesTotal: Number(entriesTotal) || 1,
        paymentChannel: "sede",
        note,
      });
      setMessage(`Prodotto attivato per ${member.name}.`);
    }
    refresh();
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Soci</p>
          <h1>Attivazioni</h1>
          <p className="lede">
            Attiva un corso se il cliente paga in persona. Rinnovi e acquisti online arriveranno con
            Stripe.
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
        <form className="admin-form admin-product-form" onSubmit={onSubmit}>
          <fieldset>
            <legend>Attiva manualmente</legend>
            <label>
              Prodotto
              <select value={productId} onChange={(event) => setProductId(event.target.value)}>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Socio
              <select
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                required
              >
                {members.length === 0 ? (
                  <option value="">Nessun socio registrato</option>
                ) : (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.email}
                    </option>
                  ))
                )}
              </select>
            </label>

            {isCourseFee ? (
              <div className="admin-form-row">
                <label>
                  Importo corso
                  <input
                    value={
                      typeof courseAmount === "number" ? formatEuro(courseAmount) : "Non impostato"
                    }
                    readOnly
                  />
                </label>
                <label>
                  Pagamento
                  <select
                    value={paymentChannel}
                    onChange={(event) => {
                      const next = event.target.value as PaymentChannel;
                      setPaymentChannel(next);
                      setNote(
                        next === "sede" ? "Pagamento in sede" : "Pagamento online (Stripe)",
                      );
                    }}
                  >
                    <option value="sede">Pagato in sede</option>
                    <option value="online" disabled>
                      Pagato online (Stripe a breve)
                    </option>
                  </select>
                </label>
              </div>
            ) : usesEntries ? (
              <div className="admin-form-row">
                <label>
                  Ingressi / accessi
                  <input
                    type="number"
                    min={1}
                    value={entriesTotal}
                    onChange={(event) => setEntriesTotal(event.target.value)}
                  />
                </label>
                <label>
                  Nota
                  <input value={note} onChange={(event) => setNote(event.target.value)} />
                </label>
              </div>
            ) : (
              <label>
                Nota
                <input value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
            )}

            {isCourseFee ? (
              <label>
                Nota
                <input value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
            ) : null}

            {message ? <p className="admin-form-note">{message}</p> : null}
            <button type="submit" className="admin-submit">
              {isCourseFee ? "Attiva corso" : "Attiva per pagamento in sede"}
            </button>
          </fieldset>
        </form>
      )}

      <h2 className="admin-subhead">Attivazioni recenti</h2>
      {activations.length === 0 ? (
        <p className="admin-empty">Nessuna attivazione ancora.</p>
      ) : (
        <ul className="admin-table">
          {activations.map((activation) => (
            <li key={activation.id}>
              <div className="admin-table-main">
                <strong>
                  {activation.memberName} · {productTitle(activation.productId, products)}
                </strong>
                <span>{activationSummary(activation)}</span>
              </div>
              <div className="admin-table-actions">
                {activation.status === "active" ? (
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
