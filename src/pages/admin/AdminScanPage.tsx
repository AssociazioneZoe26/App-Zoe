import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { consumeEntryPack, lookupEntryPackQr, type EntryPackPreview } from "../../lib/entryPacks";
import { scanErrorMessage } from "../../lib/entryQr";

export function AdminScanPage() {
  const hostId = "zoe-qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lookingUp = useRef(false);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [preview, setPreview] = useState<EntryPackPreview | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef("");

  useEffect(() => {
    document.title = "Scansiona ingresso · Admin Zoe";
    let cancelled = false;
    const scanner = new Html5Qrcode(hostId, { verbose: false });
    scannerRef.current = scanner;
    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (cancelled || lookingUp.current) return;
          void handleRaw(text);
        },
        () => undefined,
      )
      .catch((error: unknown) => {
        if (!cancelled) {
          setCameraError(
            error instanceof Error
              ? error.message
              : "Fotocamera non disponibile. Usa Safari o Chrome in HTTPS, o incolla il codice.",
          );
        }
      });
    return () => {
      cancelled = true;
      if (scanner.isScanning) {
        void scanner.stop().catch(() => undefined);
      }
    };
  }, []);

  async function handleRaw(raw: string) {
    lookingUp.current = true;
    setBusy(true);
    setMessage("");
    const result = await lookupEntryPackQr(raw);
    lookingUp.current = false;
    setBusy(false);
    if (!result.ok) {
      setPreview(null);
      setMessage(scanErrorMessage(result.code));
      return;
    }
    requestIdRef.current = crypto.randomUUID();
    setPreview(result.data);
    setMessage("");
  }

  async function confirmEntry() {
    if (!preview) return;
    setBusy(true);
    const result = await consumeEntryPack(preview.pack_id, requestIdRef.current || crypto.randomUUID());
    setBusy(false);
    if (!result.ok) {
      setMessage(scanErrorMessage(result.code));
      return;
    }
    const left = Math.max(0, preview.entries_left - 1);
    setMessage(
      left === 0
        ? `Ingresso registrato. Pacchetto esaurito per ${preview.participant_name}.`
        : `Ingresso registrato. Restano ${left} ingressi.`,
    );
    setPreview(null);
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="eyebrow eyebrow-red">Soci</p>
          <h1>Scansiona ingresso</h1>
          <p className="lede">
            Inquadra il QR del socio. Verifica bambino e residui, poi conferma: si scala un credito.
          </p>
        </div>
        <Link className="admin-secondary" to="/admin/ingressi">
          Lista pacchetti
        </Link>
      </div>

      <div id={hostId} className="admin-scan-camera" />
      {cameraError ? <p className="admin-form-note">{cameraError}</p> : null}

      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleRaw(manualCode);
        }}
      >
        <label>
          Oppure incolla il codice
          <input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="zoe:p:…"
          />
        </label>
        <button type="submit" className="admin-submit" disabled={busy}>
          Verifica codice
        </button>
      </form>

      {preview ? (
        <div className="admin-scan-preview">
          <p className="eyebrow">Verifica</p>
          <h2>{preview.participant_name}</h2>
          <p>
            {preview.product_title} · pacchetto da {preview.entries_total} · {preview.entries_left}{" "}
            disponibili
          </p>
          <button type="button" className="admin-submit" disabled={busy} onClick={() => void confirmEntry()}>
            Conferma ingresso
          </button>
        </div>
      ) : null}

      {message ? <p className="admin-form-note">{message}</p> : null}
    </section>
  );
}
