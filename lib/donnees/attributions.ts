// The attributions of the sources (F.1; docs/sources.md, « Attributions à afficher sur la page Données »), each with
// the real date of what the day's state was made from: the day's downloads and the dated copies, from etat.json; the
// countries and the companies, from the referentials the site is built with. Files or readings of several days give
// their period. A source whose date is not given is left out, never dated wrong. Pure.
import { dateFr } from "@/lib/i18n/format";
import { donneesOuvertes } from "@/lib/i18n/fr-donnees";
import pays from "@/referentiels/pays.json";
import societes from "@/referentiels/societes.json";
import type { EtatPublie } from "./lecture";

export type Attributions = { exigees: string[]; courtoisie: string[] };

const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
/** « 2026-11-21 » from a day, an ISO time or a PSL version (« 2026-11-19_08-30-20_UTC »), or null. */
const jour = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}(?:$|[T_])/.test(v) ? v.slice(0, 10) : null;
const presente = (v: string | null): v is string => v !== null;

/** « du 21/11/2026 », or « du 20/11/2026 au 21/11/2026 », from some days; null without any. */
function periode(jours: readonly (string | null)[]): string | null {
  const tries = jours.filter(presente).sort();
  const premier = tries[0];
  const dernier = tries.at(-1);
  if (premier === undefined || dernier === undefined) return null;
  return donneesOuvertes.attributions.periode(dateFr(premier), dateFr(dernier));
}

/** The days the companies' table read a producer's records, among its sources whose title starts with its name. */
function lectures(producteur: string): (string | null)[] {
  const lus: (string | null)[] = [];
  for (const s of Object.values(societes.societes)) {
    for (const source of [...s.sources, ...("sources_mere" in s ? s.sources_mere : [])]) {
      if (source.titre.startsWith(`${producteur} :`)) lus.push(jour(source.lu_le));
    }
  }
  return lus;
}

/** The attributions of the day's state, those the licences or the conditions require first, then by courtesy. */
export function attributionsDe(
  etat: EtatPublie,
  /** The démarches' edition and its period (index/demarches.json), when their page is published (card 55). */
  demarches: { edition: number; periode: string } | null = null,
): Attributions {
  const t = donneesOuvertes.attributions;
  const versions = objet(etat.brut["versions"]);
  const regles = objet(versions?.["regles"]);
  const telecharges = new Map<string, string>();
  for (const s of Array.isArray(etat.brut["sources"]) ? (etat.brut["sources"] as unknown[]) : []) {
    const o = objet(s);
    const id = o?.["id"];
    const j = jour(o?.["date"]);
    if (typeof id === "string" && j !== null) telecharges.set(id, j);
  }
  // The DINUM's lists: the copy archived on 11/12/2024, the oldest, and the current list, the latest.
  const listes = (Array.isArray(regles?.["listes"]) ? (regles["listes"] as unknown[]) : [])
    .map(jour)
    .filter(presente)
    .sort();
  // The perimeter's dated copies (C.5): « sig:2026-11-01:<print> », « mesr:2026-11-21:<print> ».
  const copies = new Map<string, string>();
  for (const c of Array.isArray(regles?.["perimetre"]) ? (regles["perimetre"] as unknown[]) : []) {
    const m = typeof c === "string" ? /^(sig|mesr):(\d{4}-\d{2}-\d{2}):[0-9a-f]+$/.exec(c) : null;
    if (m?.[1] !== undefined && m[2] !== undefined) copies.set(m[1], m[2]);
  }
  const fichierDila = versions?.["dila"];
  const dila = telecharges.get("dila");
  const ripe = telecharges.get("ripe-organisation");
  const sirene = periode(lectures("Sirene"));
  const rir = periode([...telecharges].filter(([id]) => id.startsWith("rir-")).map(([, j]) => j));
  const iptoasn = telecharges.get("iptoasn") ?? jour(regles?.["iptoasn"]);
  const gleif = periode(lectures("GLEIF"));
  const psl = jour(regles?.["psl"]);
  const premiere = listes[0];
  const courante = listes.length > 1 ? listes.at(-1) : undefined;
  const sig = copies.get("sig");
  const mesr = copies.get("mesr");
  return {
    exigees: [
      premiere === undefined ? null : t.dinumArchive(dateFr(premiere)),
      courante === undefined ? null : t.dinum(dateFr(courante)),
      typeof fichierDila === "string" && /^dila_refOrga_admin_Etat_fr_\d{8}\.json$/.test(fichierDila) && dila
        ? t.dila(fichierDila, dateFr(dila))
        : null,
      sig === undefined ? null : t.sig(dateFr(sig)),
      mesr === undefined ? null : t.mesr(dateFr(mesr)),
      demarches === null ? null : t.observatoire(String(demarches.edition), demarches.periode),
      sirene === null ? null : t.sirene(sirene),
      ripe === undefined ? null : t.ripe(dateFr(ripe)),
      t.ue(dateFr(pays.version)),
      t.ueCcBy(pays.version.slice(0, 4)),
    ].filter(presente),
    courtoisie: [
      rir === null ? null : t.rir(rir),
      iptoasn === null ? null : t.iptoasn(dateFr(iptoasn)),
      gleif === null ? null : t.gleif(gleif),
      t.naturalEarth,
      psl === null ? null : t.psl(dateFr(psl)),
      t.cellar,
    ].filter(presente),
  };
}
