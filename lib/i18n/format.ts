// French formats of numbers, dates and times for the site (DESIGN.md § 6): a narrow no-break space between thousands,
// before « % » and before a unit, so that a value is never cut in the middle; a decimal comma; dates as 21/11/2026 (the
// UTC day); times in UTC, for raw values only. English formats will follow, key for key (T11).
const FINE = " ";

/** 101827 → « 101 827 »; 0.054 with 3 decimals → « 0,054 ». */
export function nombre(n: number, decimales = 0): string {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    .format(n)
    .replace(/\s/g, FINE);
}

/** 1.11 → « 1,11 % ». */
export const pourcent = (n: number, decimales = 2): string => `${nombre(n, decimales)}${FINE}%`;

/** 189 → « 189 min ». */
export const minutes = (n: number): string => `${nombre(n)}${FINE}min`;

const jour = (iso: string): Date | null => {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
};
const deux = (n: number) => String(n).padStart(2, "0");

/** « 2026-11-21 », or an ISO time → « 21/11/2026 » (its UTC day); an unreadable value → « ». */
export function dateFr(iso: string): string {
  const d = jour(iso);
  return d === null ? "" : `${deux(d.getUTCDate())}/${deux(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** An ISO time → « 21:18 » (UTC); an unreadable value → « ». */
export function heureUtc(iso: string): string {
  const d = jour(iso);
  return d === null ? "" : `${deux(d.getUTCHours())}:${deux(d.getUTCMinutes())}`;
}
