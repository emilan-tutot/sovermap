// The index of the territories (brief C.6 and D.2): what the site's pages of régions, départements, communes and groups
// of communes read, built each day from the domains' « territoire » (pipeline/territoires.ts) and the official names of
// the Code officiel géographique (referentiels/cog/). Facts, never a ranking: every list in the order of its codes,
// never by a share outside the EU. Pure: no files, no network.
import { lignesCsv } from "./liste";
import { type Etat, type Fichiers, jsonStable } from "./publication";
import type { Categorie } from "./types";

/** The official names of the COG: régions, départements (with their région) and overseas collectivities. */
export type NomsCog = {
  regions: ReadonlyMap<string, string>;
  departements: ReadonlyMap<string, { nom: string; region: string | null }>;
};

/** Reads the COG's regions, departments and overseas collectivities (columns reg, dep, comer and libelle). */
export function lireNomsCog(regionsCsv: string, departementsCsv: string, comerCsv: string): NomsCog {
  const table = (csv: string, colonnes: readonly string[]) => {
    const [entete = [], ...lignes] = [...lignesCsv(csv)];
    const indices = colonnes.map((c) => entete.indexOf(c));
    if (indices.some((i) => i < 0)) throw new Error(`COG : colonnes attendues absentes (${colonnes.join(", ")})`);
    return lignes.filter((l) => l.length >= entete.length).map((l) => indices.map((i) => l[i] ?? ""));
  };
  const regions = new Map(table(regionsCsv, ["reg", "libelle"]).map(([code = "", nom = ""]) => [code, nom]));
  const departements = new Map<string, { nom: string; region: string | null }>(
    table(departementsCsv, ["dep", "reg", "libelle"]).map(([code = "", region = "", nom = ""]) => [
      code,
      { nom, region },
    ]),
  );
  // The overseas collectivities with a code of their own (Saint-Barthélemy 977, Saint-Martin 978…): no région.
  for (const [code = "", nom = ""] of table(comerCsv, ["comer", "libelle"])) {
    if (!departements.has(code)) departements.set(code, { nom, region: null });
  }
  return { regions, departements };
}

/** A domain as the pages list it: its name, the category of its web name and whether it depends outside the EU. */
type DomaineListe = { domaine: string; categorie: Categorie; horsUE: boolean | null };

const par = <T>(m: Map<string, T>, cle: string, neuf: () => T): T => {
  const connu = m.get(cle);
  if (connu !== undefined) return connu;
  const v = neuf();
  m.set(cle, v);
  return v;
};
const trierCles = <T>(m: ReadonlyMap<string, T>) => [...m.keys()].sort();

/**
 * The index of the territories: index/territoires.json (each région and département with its official name, its
 * number of domains and the domains of its council) and index/territoires/<département>.json (its communes and its
 * groups of communes, each with its domains). A domain counts in the région and the département of its territory; a
 * council's domains are those whose territory stops at the région or the département. A code the COG does not name
 * keeps its code as its name, and is said so (`nomInconnu`).
 */
export function indexTerritoires(etat: Etat, noms: NomsCog): Fichiers {
  const regions = new Map<string, { domaines: Set<string>; conseil: Set<string> }>();
  const departements = new Map<
    string,
    {
      domaines: Set<string>;
      conseil: Set<string>;
      communes: Map<string, { nom: string; domaines: Set<string> }>;
      groupements: Map<string, { nom: string; siren: string | null; domaines: Set<string> }>;
    }
  >();
  for (const d of etat.domaines.values()) {
    const t = d.territoire;
    if (t === undefined) continue;
    if (t.region !== null) {
      const r = par(regions, t.region, () => ({ domaines: new Set<string>(), conseil: new Set<string>() }));
      r.domaines.add(d.domaine);
      if (t.departement === null && t.commune === null && t.groupement === null) r.conseil.add(d.domaine);
    }
    if (t.departement === null) continue;
    const dep = par(departements, t.departement, () => ({
      domaines: new Set<string>(),
      conseil: new Set<string>(),
      communes: new Map<string, { nom: string; domaines: Set<string> }>(),
      groupements: new Map<string, { nom: string; siren: string | null; domaines: Set<string> }>(),
    }));
    dep.domaines.add(d.domaine);
    if (t.commune !== null) {
      const nom = t.commune.nom;
      par(dep.communes, t.commune.code, () => ({ nom, domaines: new Set<string>() })).domaines.add(d.domaine);
    } else if (t.groupement !== null) {
      // A group by its SIREN, or by its name when the directory gives none.
      const { nom, siren } = t.groupement;
      const cle = siren ?? `nom:${nom}`;
      par(dep.groupements, cle, () => ({ nom, siren, domaines: new Set<string>() })).domaines.add(d.domaine);
    } else {
      dep.conseil.add(d.domaine);
    }
  }
  const liste = (domaines: Set<string>): DomaineListe[] =>
    [...domaines].sort().map((domaine) => {
      const web = etat.noms.get(etat.domaines.get(domaine)?.nomWeb ?? "");
      return { domaine, categorie: web?.categorie ?? "non déterminé", horsUE: web?.horsUE ?? null };
    });
  const nomRegion = (code: string) => noms.regions.get(code);
  const nomDepartement = (code: string) => noms.departements.get(code)?.nom;
  const fichiers: Fichiers = new Map();
  fichiers.set(
    "index/territoires.json",
    `${jsonStable({
      regions: Object.fromEntries(
        trierCles(regions).map((code) => {
          const r = regions.get(code);
          return [
            code,
            {
              nom: nomRegion(code) ?? code,
              ...(nomRegion(code) === undefined ? { nomInconnu: true } : {}),
              domaines: r?.domaines.size ?? 0,
              conseil: [...(r?.conseil ?? [])].sort(),
            },
          ];
        }),
      ),
      departements: Object.fromEntries(
        trierCles(departements).map((code) => {
          const dep = departements.get(code);
          return [
            code,
            {
              nom: nomDepartement(code) ?? code,
              ...(nomDepartement(code) === undefined ? { nomInconnu: true } : {}),
              region: noms.departements.get(code)?.region ?? null,
              domaines: dep?.domaines.size ?? 0,
              conseil: [...(dep?.conseil ?? [])].sort(),
            },
          ];
        }),
      ),
    })}\n`,
  );
  for (const code of trierCles(departements)) {
    const dep = departements.get(code);
    if (dep === undefined) continue;
    fichiers.set(
      `index/territoires/${code}.json`,
      `${jsonStable({
        departement: code,
        conseil: liste(dep.conseil),
        communes: trierCles(dep.communes).map((c) => {
          const commune = dep.communes.get(c);
          return { code: c, nom: commune?.nom ?? c, domaines: liste(commune?.domaines ?? new Set()) };
        }),
        groupements: trierCles(dep.groupements).map((g) => {
          const groupement = dep.groupements.get(g);
          return {
            nom: groupement?.nom ?? "",
            siren: groupement?.siren ?? null,
            domaines: liste(groupement?.domaines ?? new Set()),
          };
        }),
      })}\n`,
    );
  }
  return fichiers;
}
