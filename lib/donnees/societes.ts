// The companies' pages (D.2, R9): the list of the companies that host or deliver the measured sites, and each company's
// page, from the day's indexes (index/exploitants.json, read by lib/donnees/radiographie.ts; index/exploitants/<key>.json,
// read here), checked at the border. Pure.
import type { SocieteIndex } from "./radiographie";

/** A key of the referentials: what a company's address carries (/societes/<key>). */
export const estCleSociete = (cle: string): boolean => /^[a-z0-9-]{1,100}$/.test(cle);

/** index/exploitants/<key>.json, checked: the registered domains the company serves, or null. */
export function lireDomainesSociete(valeur: unknown, cle: string): string[] | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const o = valeur as Record<string, unknown>;
  if (o["exploitant"] !== cle || !Array.isArray(o["domaines"])) return null;
  return (o["domaines"] as unknown[])
    .filter((d): d is string => typeof d === "string" && d.length <= 253 && /^[a-z0-9_.-]+$/.test(d))
    .slice(0, 100_000);
}

/** The companies in alphabetical order of their names (French collation): a list, never a ranking. */
export function societesTriees(index: ReadonlyMap<string, SocieteIndex>): [string, SocieteIndex][] {
  const ordre = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  return [...index].sort(([, a], [, b]) => ordre.compare(a.nom, b.nom));
}

/** One page of a long list (1-based), and the number of pages. */
export const PAR_PAGE = 200;
export function pageDe<T>(liste: readonly T[], page: number): { elements: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const p = Number.isSafeInteger(page) && page >= 1 && page <= pages ? page : 1;
  return { elements: liste.slice((p - 1) * PAR_PAGE, p * PAR_PAGE), page: p, pages };
}
