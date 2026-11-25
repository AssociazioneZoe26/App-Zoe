export const PACK_QR_PREFIX = "zoe:p:";

export function encodePackQr(scanToken: string) {
  return `${PACK_QR_PREFIX}${scanToken}`;
}

export function parsePackQr(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const token = lower.startsWith(PACK_QR_PREFIX) ? trimmed.slice(PACK_QR_PREFIX.length) : trimmed;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid.test(token) ? token : null;
}

export function rpcErrorCode(message: string) {
  const text = message.toLowerCase();
  if (text.includes("forbidden")) return "forbidden";
  if (text.includes("invalid_qr")) return "invalid_qr";
  if (text.includes("pack_expired")) return "pack_expired";
  if (text.includes("pack_revoked")) return "pack_revoked";
  if (text.includes("pack_exhausted")) return "pack_exhausted";
  if (text.includes("insufficient_entries")) return "pack_exhausted";
  if (text.includes("duplicate_scan")) return "duplicate_scan";
  if (text.includes("already_reversed")) return "already_reversed";
  if (text.includes("pack_not_active") || text.includes("pack_not_found")) return "pack_not_active";
  return "unknown";
}

export function scanErrorMessage(code: string) {
  if (code === "forbidden") return "Solo Team Zoe può scansionare gli ingressi.";
  if (code === "invalid_qr") return "QR non valido.";
  if (code === "pack_expired") return "Pacchetto scaduto.";
  if (code === "pack_revoked") return "Pacchetto revocato.";
  if (code === "pack_exhausted") return "Pacchetto esaurito: nessun ingresso rimasto.";
  if (code === "duplicate_scan") return "Ingresso già registrato poco fa. Attendi e riprova.";
  if (code === "already_reversed") return "Questo ingresso è già stato annullato.";
  if (code === "pack_not_active") return "Pacchetto non utilizzabile.";
  return "Operazione non riuscita.";
}
