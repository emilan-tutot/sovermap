// The reference list of a collection (brief B.1): every dated copy of the official lists (referentiels/listes/) and the
// websites of the DILA Référentiel. Each name keeps its provenances and types; its unit is its registrable domain
// (Public Suffix List; a name on a third-party platform is its own unit); internal and technical names are left out
// (methode § 3). Each unit gets its web name (« www. » if listed, else the apex) and its perimeter: « État » for
// .gouv.fr, the DILA's websites, the SIG's sites and the MESR's public institutions (decision D1, a2; brief C.5),
// « hors État » otherwise.
import { createHash } from "node:crypto";
import type { ReferentielDila } from "./dila";
import { lignesCsv, nomValide } from "./liste";
import { REGLES_EXCLUSION, type RaisonExclusion, type ReglesExclusion, raisonExclusion } from "./noms";
import { domaineEnregistrable, type ListeSuffixes } from "./psl";

export type Exclusion = RaisonExclusion | "plateforme tierce sans nom propre" | "suffixe public";

export type EntreeNom = {
  nom: string;
  /** Its unit: the registrable domain, or the name itself on a third-party platform. */
  domaine: string;
  /** « dinum:AAAA-MM-JJ », « dila:<file> », « domaine » (the apex, added as the web name of its unit). */
  provenances: string[];
  types: string[];
  organismes: string[];
};

export type EntreeDomaine = {
  domaine: string;
  noms: string[];
  nomWeb: string;
  perimetre: "État" | "hors État";
  /** Why it is in the « État » perimeter. */
  raisons: RaisonEtat[];
  plateforme: boolean;
  organismes: string[];
  ministeres: string[];
};

export type ListeReference = {
  noms: Map<string, EntreeNom>;
  domaines: Map<string, EntreeDomaine>;
  /** Distinct names set aside, per rule (a name in two copies of the list counts once). */
  exclus: Map<Exclusion, number>;
  /** The names each rule set aside (the fourth rule's are asked again to Quad9 at each new list). */
  ecartes: Map<Exclusion, Set<string>>;
};

export type CopieListe = { date: string; csv: string };

/** The reasons of the « État » perimeter (decision D1, a2; brief C.5). */
export type RaisonEtat = "gouv.fr" | "dila" | "sig" | "mesr";

/**
 * A dated copy of an open list of the « État » perimeter (referentiels/perimetre/): the SIG's sites, the MESR's public
 * institutions. Its sites enter the list with their provenance (« sig:AAAA-MM-JJ »), and their units the perimeter.
 * `ministeres`: a site's ministry, by the identifier the SIG publishes, which is the DILA Référentiel's own (its name
 * is the Référentiel's); none for the MESR, whose list does not say it.
 */
export type CopiePerimetre = {
  source: "sig" | "mesr";
  date: string;
  sites: readonly string[];
  ministeres?: ReadonlyMap<string, string>;
  /** The first 12 hex digits of the SHA-256 of its text: in the day's rules, so that a copy edited in place changes them. */
  empreinte: string;
};

/** A ministry identifier of the SIG: a UUID (the DILA Référentiel's own identifiers). */
const MINISTERE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * A dated copy, read from its CSV text (referentiels/perimetre/): its sites and, for the SIG, each site's ministry. A
 * copy without its columns, or with a ministry that is not a UUID, is refused (the copy is the repository's: an error
 * is a mistake to fix, never a value to publish).
 */
export function lireCopiePerimetre(source: CopiePerimetre["source"], date: string, csv: string): CopiePerimetre {
  const lignes = lignesCsv(csv);
  const entete = lignes.next().value ?? [];
  const iSite = entete.indexOf("site");
  const iMinistere = entete.indexOf("ministere");
  if (iSite < 0) throw new Error(`copie ${source} du ${date} : colonne « site » attendue`);
  if (source === "sig" && iMinistere < 0) throw new Error(`copie sig du ${date} : colonne « ministere » attendue`);
  const sites: string[] = [];
  const ministeres = new Map<string, string>();
  for (const ligne of lignes) {
    const site = ligne[iSite];
    if (!site) continue;
    // A site that is not a host name would be dropped without a word, and the counts would drift: refused.
    if (nomValide(site) === null) throw new Error(`copie ${source} du ${date} : site illisible (${site.slice(0, 80)})`);
    sites.push(site);
    if (source !== "sig") continue;
    const ministere = ligne[iMinistere] ?? "";
    if (!MINISTERE.test(ministere))
      throw new Error(`copie sig du ${date} : ministère illisible (${site.slice(0, 80)})`);
    ministeres.set(site, ministere);
  }
  const empreinte = createHash("sha256").update(csv).digest("hex").slice(0, 12);
  return { source, date, sites, ministeres, empreinte };
}

const trie = (valeurs: Iterable<string>) => [...new Set(valeurs)].sort();

/** The unit of a name: its registrable domain, or the name itself when that domain is a third-party platform. */
export function uniteDe(nom: string, suffixes: ListeSuffixes, plateformes: ReadonlySet<string>): string | null {
  const domaine = domaineEnregistrable(nom, suffixes);
  if (domaine === null) return null;
  return plateformes.has(domaine) ? nom : domaine;
}

export function construireListe(
  copies: readonly CopieListe[],
  dila: ReferentielDila | null,
  suffixes: ListeSuffixes,
  plateformes: ReadonlySet<string>,
  /** The suffix of the State's own domains (decision D1, a1). */
  suffixeEtat = ".gouv.fr",
  /** The rules in force (the fourth one may be suspended). */
  regles: ReglesExclusion = REGLES_EXCLUSION,
  /** The dated copies of the perimeter's open lists (brief C.5). */
  perimetre: readonly CopiePerimetre[] = [],
): ListeReference {
  const noms = new Map<string, EntreeNom>();
  const ecartes = new Map<Exclusion, Set<string>>();
  const exclure = (raison: Exclusion, nom: string) =>
    ecartes.set(raison, (ecartes.get(raison) ?? new Set<string>()).add(nom));
  const ajouter = (brut: string, provenance: string, type: string | null, organisme: string | null) => {
    const nom = nomValide(brut);
    if (nom === null) return;
    const existant = noms.get(nom);
    if (existant) {
      existant.provenances = trie([...existant.provenances, provenance]);
      if (type) existant.types = trie([...existant.types, type]);
      if (organisme) existant.organismes = trie([...existant.organismes, organisme]);
      return;
    }
    const domaine = uniteDe(nom, suffixes, plateformes);
    if (domaine === null) return void exclure("suffixe public", nom);
    if (plateformes.has(nom)) return void exclure("plateforme tierce sans nom propre", nom);
    const raison = raisonExclusion(nom, domaineEnregistrable(nom, suffixes) ?? domaine, regles);
    if (raison !== null) return void exclure(raison, nom);
    noms.set(nom, {
      nom,
      domaine,
      provenances: [provenance],
      types: type ? [type] : [],
      organismes: organisme ? [organisme] : [],
    });
  };

  for (const copie of copies) {
    const lignes = lignesCsv(copie.csv);
    const entete = lignes.next().value ?? [];
    const iNom = entete.indexOf("name");
    const iType = entete.indexOf("type");
    if (iNom < 0 || iType < 0) throw new Error(`liste du ${copie.date} : colonnes « name » et « type » attendues`);
    for (const ligne of lignes) {
      const nom = ligne[iNom];
      if (nom !== undefined && nom !== "") ajouter(nom, `dinum:${copie.date}`, ligne[iType]?.trim() || null, null);
    }
  }
  const ministereDe = new Map<string, string>();
  if (dila) {
    for (const service of dila.services.values()) {
      for (const hote of service.hotes) ajouter(hote, `dila:${dila.fichier}`, null, service.id);
      if (service.ministere !== null) ministereDe.set(service.id, service.ministere);
    }
  }
  // A site's ministry, by its name in the list (the SIG's identifier is the Référentiel's).
  const ministeresDuNom = new Map<string, Set<string>>();
  for (const copie of perimetre) {
    for (const site of copie.sites) {
      ajouter(site, `${copie.source}:${copie.date}`, null, null);
      const nom = nomValide(site);
      const ministere = copie.ministeres?.get(site);
      if (nom !== null && ministere !== undefined && noms.has(nom))
        ministeresDuNom.set(nom, (ministeresDuNom.get(nom) ?? new Set<string>()).add(ministere));
    }
  }

  // Units, their web name (added to the measured names when it is not listed) and their perimeter.
  const parDomaine = new Map<string, EntreeNom[]>();
  for (const entree of noms.values())
    parDomaine.set(entree.domaine, [...(parDomaine.get(entree.domaine) ?? []), entree]);
  const domaines = new Map<string, EntreeDomaine>();
  for (const [domaine, entrees] of [...parDomaine.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    // A unit on a third-party platform is a name whose registrable domain is the platform's.
    const enPlateforme = plateformes.has(domaineEnregistrable(domaine, suffixes) ?? "");
    const nomWeb = noms.has(`www.${domaine}`) && !enPlateforme ? `www.${domaine}` : domaine;
    if (!noms.has(nomWeb))
      noms.set(nomWeb, { nom: nomWeb, domaine, provenances: ["domaine"], types: [], organismes: [] });
    const organismes = trie(entrees.flatMap((e) => e.organismes));
    const raisons: RaisonEtat[] = [];
    const sources = new Set(entrees.flatMap((e) => e.provenances.map((p) => p.split(":")[0])));
    if (!enPlateforme && domaine.endsWith(suffixeEtat)) raisons.push("gouv.fr");
    if (!enPlateforme && organismes.length > 0) raisons.push("dila");
    if (!enPlateforme && sources.has("sig")) raisons.push("sig");
    if (!enPlateforme && sources.has("mesr")) raisons.push("mesr");
    domaines.set(domaine, {
      domaine,
      noms: trie([...entrees.map((e) => e.nom), nomWeb]),
      nomWeb,
      perimetre: raisons.length > 0 ? "État" : "hors État",
      raisons,
      plateforme: enPlateforme,
      organismes,
      ministeres: trie([
        ...organismes.flatMap((o) => (ministereDe.has(o) ? [ministereDe.get(o) as string] : [])),
        ...entrees.flatMap((e) => [...(ministeresDuNom.get(e.nom) ?? [])]),
      ]),
    });
  }
  const exclus = new Map<Exclusion, number>([...ecartes].map(([raison, ensemble]) => [raison, ensemble.size]));
  return { noms, domaines, exclus, ecartes };
}
