// Company layers (docs/methode.md § 4, couches 5 à 7): AS → operating company → ultimate parent → countries, from the
// hand-kept tables of referentiels/, where every row has its sources and its date.
import type { ReferentielCdn } from "./cdn";
import type { Categorie, Niveau } from "./types";
import { niveauMin } from "./types";

export type Source = { titre: string; url: string; lu_le: string };

/** Marks a parent that exists or may exist but is not established: the chain stops at « non déterminé ». */
export const MERE_INCONNUE = "non-determinee";

export type Societe = {
  nom: string;
  /** ISO 3166-1 alpha-2 code of the headquarters. */
  pays: string;
  /** Key of the direct parent, null at the top of the chain, or MERE_INCONNUE. */
  mere: string | null;
  /** How control is held at the top, when it is not a company (never a person's name). */
  controle?: string;
  lei?: string;
  note?: string;
  /** Identity and country of the headquarters. */
  sources: Source[];
  /** The link to the parent, or the fact that there is none above. */
  sources_mere: Source[];
};

export type ReferentielSocietes = { version: string; societes: Record<string, Societe> };
export type LigneAs = { societe: string; titulaire_registre: string; sources: Source[] };
export type ReferentielAs = { version: string; as: Record<string, LigneAs> };

/** The 27 member states of the European Union. */
export const UE = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);
/** European countries outside the EU (cahier §4.4: Royaume-Uni, Suisse, Norvège…). */
export const EUROPE_HORS_UE = new Set([
  "GB",
  "CH",
  "NO",
  "IS",
  "LI",
  "MC",
  "SM",
  "VA",
  "AD",
  "AL",
  "BA",
  "ME",
  "MK",
  "RS",
  "MD",
  "UA",
  "XK",
]);

export function categorie(pays: string | null): Categorie {
  if (pays === null || pays === "") return "non déterminé";
  if (pays === "FR") return "France";
  if (UE.has(pays)) return "UE hors France";
  if (EUROPE_HORS_UE.has(pays)) return "Europe hors UE";
  return "hors d'Europe";
}

/** Who produced a source: its host name. Two pages of the same producer count once. */
function producteur(source: Source): string {
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return source.url;
  }
}

/** Two independent producers: « confirmé » ; one: « probable » ; none: « non déterminé ». */
export function niveauSources(sources: readonly Source[]): Niveau {
  const n = new Set(sources.map(producteur)).size;
  return n >= 2 ? "confirmé" : n === 1 ? "probable" : "non déterminé";
}

export type ChaineSociete = {
  societe: { cle: string; nom: string; pays: string } | null;
  mere: { cle: string; nom: string; pays: string; controle?: string } | null;
  categorie: Categorie;
  niveau: Niveau;
};

const niveauNoeud = (s: Societe): Niveau => niveauMin(niveauSources(s.sources), niveauSources(s.sources_mere));

/** From an operating company key to its ultimate parent (10 links at most), with the weakest level of the chain. */
export function chaineDepuisSociete(cle: string | null, societes: ReferentielSocietes): ChaineSociete {
  const s = cle === null ? undefined : societes.societes[cle];
  if (cle === null || s === undefined)
    return { societe: null, mere: null, categorie: "non déterminé", niveau: "non déterminé" };
  const exploitante = { cle, nom: s.nom, pays: s.pays };
  const niveaux: Niveau[] = [niveauNoeud(s)];
  let cleMere = cle;
  let mere = s;
  for (let i = 0; i < 10 && mere.mere !== null; i += 1) {
    const suivante = mere.mere === MERE_INCONNUE ? undefined : societes.societes[mere.mere];
    if (suivante === undefined)
      return { societe: exploitante, mere: null, categorie: "non déterminé", niveau: "non déterminé" };
    cleMere = mere.mere;
    mere = suivante;
    niveaux.push(niveauNoeud(mere));
  }
  if (mere.mere !== null)
    return { societe: exploitante, mere: null, categorie: "non déterminé", niveau: "non déterminé" };
  return {
    societe: exploitante,
    mere: { cle: cleMere, nom: mere.nom, pays: mere.pays, ...(mere.controle ? { controle: mere.controle } : {}) },
    categorie: categorie(mere.pays),
    niveau: niveauMin(...niveaux),
  };
}

/**
 * The companies above a company, from its direct parent up to its ultimate parent (10 at most), as far as the
 * referential knows them: none at the top of a chain; the known part when a parent is not established. What the pages
 * show as « qui possède qui » (D.2, R9).
 */
export function maillonsDe(cle: string, societes: ReferentielSocietes): { cle: string; nom: string; pays: string }[] {
  const maillons: { cle: string; nom: string; pays: string }[] = [];
  let s = societes.societes[cle];
  for (let i = 0; i < 10 && s !== undefined && s.mere !== null && s.mere !== MERE_INCONNUE; i += 1) {
    const cleMere: string = s.mere;
    const mere = societes.societes[cleMere];
    if (mere === undefined) break;
    maillons.push({ cle: cleMere, nom: mere.nom, pays: mere.pays });
    s = mere;
  }
  return maillons;
}

/** From an AS to its operating company and ultimate parent. */
export function chaineDepuisAs(
  asn: number,
  tableAs: ReferentielAs,
  societes: ReferentielSocietes,
): ChaineSociete & { niveauAs: Niveau } {
  const ligne = tableAs.as[String(asn)];
  if (ligne === undefined) return { ...chaineDepuisSociete(null, societes), niveauAs: "non déterminé" };
  const chaine = chaineDepuisSociete(ligne.societe, societes);
  const niveauAs = niveauSources(ligne.sources);
  return { ...chaine, niveau: niveauMin(chaine.niveau, niveauAs), niveauAs };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAYS = /^[A-Z]{2}$/;

function verifierSources(sources: unknown, ou: string, erreurs: string[], auMoins = 0): void {
  if (!Array.isArray(sources)) {
    erreurs.push(`${ou} : sources absentes`);
    return;
  }
  // No link without a dated source (brief C.10); two producers make it « confirmé » (niveauSources).
  if (sources.length < auMoins) erreurs.push(`${ou} : aucune source datée`);
  sources.forEach((s: Partial<Source>, i) => {
    if (typeof s.titre !== "string" || s.titre === "") erreurs.push(`${ou}, source ${i + 1} : titre absent`);
    if (typeof s.url !== "string" || !/^https:\/\//.test(s.url))
      erreurs.push(`${ou}, source ${i + 1} : adresse absente ou non https`);
    if (typeof s.lu_le !== "string" || !DATE.test(s.lu_le))
      erreurs.push(`${ou}, source ${i + 1} : date de lecture absente`);
  });
}

/** Checks the hand-kept tables before any use: every reference resolves, every row has dated sources, no cycle. */
export function validerReferentiels(
  cdn: ReferentielCdn,
  tableAs: ReferentielAs,
  societes: ReferentielSocietes,
): string[] {
  const erreurs: string[] = [];
  for (const [cle, s] of Object.entries(societes.societes)) {
    if (typeof s.nom !== "string" || s.nom === "") erreurs.push(`société ${cle} : nom absent`);
    if (!PAYS.test(s.pays)) erreurs.push(`société ${cle} : pays invalide`);
    if (s.mere !== null && s.mere !== MERE_INCONNUE && societes.societes[s.mere] === undefined)
      erreurs.push(`société ${cle} : maison mère ${s.mere} absente de la table`);
    verifierSources(s.sources, `société ${cle}`, erreurs, 1);
    // The link to the parent, or the fact that there is none above, needs a source; an unknown parent, none.
    verifierSources(s.sources_mere, `société ${cle} (maison mère)`, erreurs, s.mere === MERE_INCONNUE ? 0 : 1);
    let courante: Societe | undefined = s;
    let pas = 0;
    while (courante && courante.mere !== null && courante.mere !== MERE_INCONNUE && pas <= 10) {
      courante = societes.societes[courante.mere];
      pas += 1;
    }
    if (pas > 10) erreurs.push(`société ${cle} : chaîne de plus de 10 maillons, ou boucle`);
  }
  for (const [asn, ligne] of Object.entries(tableAs.as)) {
    if (!/^\d+$/.test(asn)) erreurs.push(`AS ${asn} : numéro invalide`);
    if (societes.societes[ligne.societe] === undefined)
      erreurs.push(`AS ${asn} : société ${ligne.societe} absente de la table`);
    verifierSources(ligne.sources, `AS ${asn}`, erreurs, 1);
  }
  for (const f of cdn.fournisseurs) {
    if (societes.societes[f.societe] === undefined)
      erreurs.push(`CDN ${f.id} : société ${f.societe} absente de la table`);
    for (const s of f.suffixes) {
      if (!s.suffixe.startsWith(".")) erreurs.push(`CDN ${f.id} : le suffixe ${s.suffixe} doit commencer par un point`);
      if (!/^https:\/\//.test(s.source) || !DATE.test(s.lu_le))
        erreurs.push(`CDN ${f.id} : suffixe ${s.suffixe} sans source datée`);
    }
    for (const a of f.as)
      if (!Number.isInteger(a.numero) || !DATE.test(a.lu_le))
        erreurs.push(`CDN ${f.id} : AS ${a.numero} invalide ou sans date`);
  }
  return erreurs;
}
