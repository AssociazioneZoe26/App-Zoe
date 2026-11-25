/** Data di calendario locale, YYYY-MM-DD. */
export function calendarToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function dateOnly(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

/** Il corso è scaduto dal giorno successivo alla data di fine. */
export function isPastEndDate(value: string | null | undefined) {
  const end = dateOnly(value);
  if (!end) return false;
  return calendarToday() > end;
}

export function formatCourseDay(value: string | null | undefined) {
  const day = dateOnly(value);
  if (!day) return "";
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMeetingCount(value: string | null | undefined) {
  const digits = value?.match(/\d+/)?.[0];
  if (!digits) return "Da definire";
  const count = Number(digits);
  return count === 1 ? "1 incontro" : `${count} incontri`;
}

/** Mezzogiorno UTC, così la data di calendario non slitta di fuso. */
export function courseDateToTimestamp(value: string) {
  return `${dateOnly(value)}T12:00:00.000Z`;
}
