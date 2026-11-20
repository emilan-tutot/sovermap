// The reference list of a collection (brief B.1): every dated copy of the official lists (referentiels/listes/) and the
// websites of the DILA Référentiel. Each name keeps its provenances and types; its unit is its registrable domain
// (Public Suffix List; a name on a third-party platform is its own unit); internal and technical names are left out
// (methode § 3). Each unit gets its web name (« www. » if listed, else the apex) and its perimeter: « État » for
// .gouv.fr and the DILA's websites (decision D1, a2, before the perimeter of C.5), « hors État » otherwise.
import type { ReferentielDila } from "./dila";
import { lignesCsv, nomValide } from "./liste";
import { type RaisonExclusion, raisonExclusion } from "./noms";
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
  raisons: ("gouv.fr" | "dila")[];
  plateforme: boolean;
  organismes: string[];
  ministeres: string[];
};

export type ListeReference = {
  noms: Map<string, EntreeNom>;
  domaines: Map<string, EntreeDomaine>;
  exclus: Map<Exclusion, number>;
};

export type CopieListe = { date: string; csv: string };

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
): ListeReference {
  const noms = new Map<string, EntreeNom>();
  const exclus = new Map<Exclusion, number>();
  const exclure = (raison: Exclusion) => exclus.set(raison, (exclus.get(raison) ?? 0) + 1);
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
    if (domaine === null) return void exclure("suffixe public");
    if (plateformes.has(nom)) return void exclure("plateforme tierce sans nom propre");
    const raison = raisonExclusion(nom, domaineEnregistrable(nom, suffixes) ?? domaine);
    if (raison !== null) return void exclure(raison);
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
    const raisons: ("gouv.fr" | "dila")[] = [];
    if (!enPlateforme && domaine.endsWith(suffixeEtat)) raisons.push("gouv.fr");
    if (!enPlateforme && organismes.length > 0) raisons.push("dila");
    domaines.set(domaine, {
      domaine,
      noms: trie([...entrees.map((e) => e.nom), nomWeb]),
      nomWeb,
      perimetre: raisons.length > 0 ? "État" : "hors État",
      raisons,
      plateforme: enPlateforme,
      organismes,
      ministeres: trie(organismes.flatMap((o) => (ministereDe.has(o) ? [ministereDe.get(o) as string] : []))),
    });
  }
  return { noms, domaines, exclus };
}
