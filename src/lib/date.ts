export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "lun 8 sept" */
export function formatDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("es", { weekday: "short", month: "short", day: "numeric" });
}

/** "8 de septiembre de 2026" */
export function formatLongDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}
