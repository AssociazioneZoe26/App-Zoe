export type MobileStore = "ios" | "android" | null;

/** Smartphone (non tablet / desktop). Heuristica UA + touch. */
export function isSmartphone(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIpad =
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIpad) return false;

  const isPhoneUa = /iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile/i.test(ua);
  if (isPhoneUa) return true;

  // Android tablet tipicamente senza "Mobile"
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return false;

  return false;
}

/** Quale store mostrare in prioritò su smartphone. */
export function preferredMobileStore(): MobileStore {
  if (!isSmartphone()) return null;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}
