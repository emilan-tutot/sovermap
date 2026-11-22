// The ministries' pages (D.2, R8): the list of the ministries to which the DILA's Référentiel links measured sites, and
// each ministry's page, its domains grouped by the company that serves their web name. From the day's index
// (index/ministeres.json, checked here) and each domain's records. Pure.
import type { Categorie, IndexSocietes } from "./radiographie";

export type Ministere = { id: string; nom: string; slug: string; domaines: string[] };

/** A ministry's address: its name without accents, apostrophes or spaces (« ministere-de-la-culture »), 90 characters. */
export function slugMinistere(nom: string): string {
  const s = nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length <= 90) return s;
  const coupe = s.slice(0, 91);
  return coupe.slice(0, coupe.lastIndexOf("-") > 0 ? coupe.lastIndexOf("-") : 90);
}

/** index/ministeres.json, checked entry by entry; two ministries whose names give the same address keep their ids. */
export function lireMinisteres(valeur: unknown): Ministere[] | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const liste: Ministere[] = [];
  for (const [id, brut] of Object.entries(valeur as Record<string, unknown>)) {
    if (!/^[0-9a-f-]{36}$/.test(id) || typeof brut !== "object" || brut === null) continue;
    const o = brut as Record<string, unknown>;
    const nom = typeof o["nom"] === "string" && o["nom"].trim() !== "" ? o["nom"].trim().slice(0, 200) : null;
    if (nom === null || !Array.isArray(o["domaines"])) continue;
    const domaines = (o["domaines"] as unknown[])
      .filter((d): d is string => typeof d === "string" && d.length <= 253 && /^[a-z0-9_.-]+$/.test(d))
      .slice(0, 5000);
    liste.push({ id, nom, slug: slugMinistere(nom), domaines });
  }
  const vus = new Map<string, number>();
  for (const m of liste) vus.set(m.slug, (vus.get(m.slug) ?? 0) + 1);
  for (const m of liste) if ((vus.get(m.slug) ?? 0) > 1) m.slug = `${m.slug}-${m.id.slice(-12)}`;
  const ordre = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  return liste.sort((a, b) => ordre.compare(a.nom, b.nom));
}

/** A domain as a ministry's page shows it: the company that serves its web name, the category of that company's seat. */
export type DomaineServi = { domaine: string; societe: string | null; categorie: Categorie };
export type Groupe = { societe: string | null; nom: string | null; categorie: Categorie; domaines: string[] };

/**
 * The domains grouped by the company that serves their web name (the one that delivers it when a CDN does, otherwise
 * the one that hosts it), groups in alphabetical order of the companies' names, the domains of no known company last.
 */
export function groupesDe(domaines: readonly DomaineServi[], societes: IndexSocietes): Groupe[] {
  const parSociete = new Map<string | null, Groupe>();
  for (const d of domaines) {
    const cle = d.societe !== null && societes.has(d.societe) ? d.societe : null;
    const g = parSociete.get(cle) ?? {
      societe: cle,
      nom: cle === null ? null : (societes.get(cle)?.nom ?? null),
      categorie: cle === null ? "non déterminé" : (societes.get(cle)?.categorie ?? d.categorie),
      domaines: [],
    };
    g.domaines.push(d.domaine);
    parSociete.set(cle, g);
  }
  const ordre = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  return [...parSociete.values()]
    .map((g) => ({ ...g, domaines: [...g.domaines].sort() }))
    .sort((a, b) => (a.nom === null ? 1 : b.nom === null ? -1 : ordre.compare(a.nom, b.nom)));
}

/** How many domains fall in each category of seat, in the method's order. */
export function parCategorie(domaines: readonly DomaineServi[]): [Categorie, number][] {
  const ordre: Categorie[] = ["France", "UE hors France", "Europe hors UE", "hors d'Europe", "non déterminé"];
  return ordre.map((c) => [c, domaines.filter((d) => d.categorie === c).length] as [Categorie, number]);
}
