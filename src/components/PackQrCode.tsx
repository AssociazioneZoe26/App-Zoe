import { QRCodeSVG } from "qrcode.react";
import { encodePackQr } from "../lib/entryQr";

type Props = {
  scanToken: string;
  label: string;
};

export function PackQrCode({ scanToken, label }: Props) {
  const value = encodePackQr(scanToken);
  return (
    <div className="pack-qr">
      <QRCodeSVG value={value} size={168} marginSize={1} title={label} />
      <p className="pack-qr-hint">Mostra questo codice in sede. Non contiene dati personali.</p>
    </div>
  );
}
