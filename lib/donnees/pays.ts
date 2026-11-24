// A country's page (D.2, R7): the companies whose ultimate parent has its seat there, and the domains they serve, from
// the day's indexes (index/pays.json, checked here; index/exploitants.json, read by radiographie.ts). Pure.
import pays from "@/referentiels/pays.json";
import type { IndexSocietes, SocieteIndex } from "./radiographie";

/** A country's address: its French name without accents, apostrophes or spaces (« etats-unis »). */
export function slugPays(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PAR_SLUG = new Map(pays.pays.map((p) => [slugPays(p.fr), { code: p.a2, nom: p.fr }]));
const PAR_CODE = new Map(pays.pays.map((p) => [p.a2, { slug: slugPays(p.fr), nom: p.fr }]));

/** The country an address names, or null. */
export const paysDuSlug = (slug: string): { code: string; nom: string } | null => PAR_SLUG.get(slug) ?? null;
/** A country's address, from its ISO code, or null. */
export const slugDuCode = (code: string): string | null => PAR_CODE.get(code)?.slug ?? null;

/** index/pays.json, checked: for each country (ISO code), its domains, and those of the « État » perimeter. */
export function lireIndexPays(valeur: unknown): Map<string, { domaines: number; domainesEtat: number }> | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const index = new Map<string, { domaines: number; domainesEtat: number }>();
  const entier = (v: unknown) => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null);
  for (const [code, brut] of Object.entries(valeur as Record<string, unknown>)) {
    if (!/^[A-Z]{2}$/.test(code) || typeof brut !== "object" || brut === null) continue;
    const o = brut as Record<string, unknown>;
    const domaines = entier(o["domaines"]);
    const domainesEtat = entier(o["domainesEtat"]);
    if (domaines !== null && domainesEtat !== null) index.set(code, { domaines, domainesEtat });
  }
  return index;
}

/** The companies whose ultimate parent has its seat in a country, in alphabetical order of their names. */
export function societesDuPays(code: string, societes: IndexSocietes): [string, SocieteIndex][] {
  const ordre = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  return [...societes].filter(([, s]) => s.paysRetenu === code).sort(([, a], [, b]) => ordre.compare(a.nom, b.nom));
}
