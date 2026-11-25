// The territories' pages (D.2; decision C2-2; addresses: spec EX-26): the régions, départements, communes and groups
// of communes, from the day's indexes (index/territoires.json and index/territoires/<département>.json, written by the
// collection: pipeline/territoires-index.ts), checked here at the border. Facts, never a ranking: lists in the order of
// their codes or names, never by a share outside the EU. Pure.
import type { Categorie } from "./radiographie";

export type RegionIndex = { code: string; nom: string; domaines: number; conseil: string[] };
export type DepartementIndex = {
  code: string;
  nom: string;
  region: string | null;
  domaines: number;
  conseil: string[];
};
export type IndexTerritoires = {
  regions: Map<string, RegionIndex>;
  departements: Map<string, DepartementIndex>;
  /** A group's SIREN → the département whose file lists it. */
  groupements: Map<string, string>;
};

export type DomaineTerritoire = { domaine: string; categorie: Categorie; horsUE: boolean | null };
export type CommuneIndex = { code: string; nom: string; domaines: DomaineTerritoire[] };
export type GroupementIndex = { nom: string; siren: string | null; domaines: DomaineTerritoire[] };
export type FichierDepartement = {
  departement: string;
  conseil: DomaineTerritoire[];
  communes: CommuneIndex[];
  groupements: GroupementIndex[];
};

const CODE_REGION = /^[0-9]{2}$/;
const CODE_DEPARTEMENT = /^(?:[0-9]{2}|2[AB]|9[78][0-9])$/;
const CODE_COMMUNE = /^[0-9][0-9AB][0-9]{3}$/;
const SIREN = /^[0-9]{9}$/;
const DOMAINE = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)+$/;
const CATEGORIES: readonly Categorie[] = [
  "France",
  "UE hors France",
  "Europe hors UE",
  "hors d'Europe",
  "non déterminé",
];

const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const texte = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() !== "" && v.length <= max ? v : null;
const entier = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null);
const domaines = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((d) => typeof d === "string" && d.length <= 253 && DOMAINE.test(d))
    ? (v as string[])
    : null;

/** index/territoires.json, checked: null when it is not the index (an error, never an empty page kept by the CDN). */
export function lireIndexTerritoires(valeur: unknown): IndexTerritoires | null {
  const o = objet(valeur);
  const r = objet(o?.["regions"]);
  const d = objet(o?.["departements"]);
  const g = objet(o?.["groupements"] ?? {});
  if (r === null || d === null || g === null) return null;
  const regions = new Map<string, RegionIndex>();
  for (const [code, brut] of Object.entries(r)) {
    const e = objet(brut);
    const nom = texte(e?.["nom"], 120);
    const n = entier(e?.["domaines"]);
    const conseil = domaines(e?.["conseil"]);
    if (!CODE_REGION.test(code) || nom === null || n === null || conseil === null) return null;
    regions.set(code, { code, nom, domaines: n, conseil });
  }
  const departements = new Map<string, DepartementIndex>();
  for (const [code, brut] of Object.entries(d)) {
    const e = objet(brut);
    const nom = texte(e?.["nom"], 120);
    const region = e?.["region"];
    const n = entier(e?.["domaines"]);
    const conseil = domaines(e?.["conseil"]);
    if (!CODE_DEPARTEMENT.test(code) || nom === null || n === null || conseil === null) return null;
    if (region !== null && (typeof region !== "string" || !CODE_REGION.test(region))) return null;
    departements.set(code, { code, nom, region, domaines: n, conseil });
  }
  const groupements = new Map<string, string>();
  for (const [siren, code] of Object.entries(g)) {
    if (!SIREN.test(siren) || typeof code !== "string" || !departements.has(code)) return null;
    groupements.set(siren, code);
  }
  return { regions, departements, groupements };
}

function lireDomaines(v: unknown): DomaineTerritoire[] | null {
  if (!Array.isArray(v)) return null;
  const liste: DomaineTerritoire[] = [];
  for (const brut of v) {
    const e = objet(brut);
    const domaine = e?.["domaine"];
    const categorie = e?.["categorie"];
    const horsUE = e?.["horsUE"];
    if (typeof domaine !== "string" || domaine.length > 253 || !DOMAINE.test(domaine)) return null;
    if (!CATEGORIES.includes(categorie as Categorie)) return null;
    if (horsUE !== null && typeof horsUE !== "boolean") return null;
    liste.push({ domaine, categorie: categorie as Categorie, horsUE });
  }
  return liste;
}

/** index/territoires/<département>.json, checked for the département `code`: null when it is not that file. */
export function lireFichierDepartement(valeur: unknown, code: string): FichierDepartement | null {
  const o = objet(valeur);
  if (o === null || o["departement"] !== code) return null;
  const conseil = lireDomaines(o["conseil"]);
  if (conseil === null || !Array.isArray(o["communes"]) || !Array.isArray(o["groupements"])) return null;
  const communes: CommuneIndex[] = [];
  for (const brut of o["communes"]) {
    const e = objet(brut);
    const c = e?.["code"];
    const nom = texte(e?.["nom"], 120);
    const liste = lireDomaines(e?.["domaines"]);
    if (typeof c !== "string" || !CODE_COMMUNE.test(c) || nom === null || liste === null) return null;
    communes.push({ code: c, nom, domaines: liste });
  }
  const groupements: GroupementIndex[] = [];
  for (const brut of o["groupements"]) {
    const e = objet(brut);
    const nom = texte(e?.["nom"], 300);
    const siren = e?.["siren"];
    const liste = lireDomaines(e?.["domaines"]);
    if (nom === null || liste === null || (siren !== null && (typeof siren !== "string" || !SIREN.test(siren)))) {
      return null;
    }
    groupements.push({ nom, siren, domaines: liste });
  }
  return { departement: code, conseil, communes, groupements };
}

/** A name in an address: without accents, apostrophes or spaces (« ille-et-vilaine »), 90 characters at most. */
export function slugTerritoire(nom: string): string {
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

/** The addresses of spec EX-26: the official code first (two communes may share a name), then the name. */
export const adresseRegion = (code: string, nom: string) => `/regions/${code}-${slugTerritoire(nom)}`;
export const adresseDepartement = (code: string, nom: string) =>
  `/departements/${code.toLowerCase()}-${slugTerritoire(nom)}`;
export const adresseCommune = (code: string, nom: string) => `/communes/${code.toLowerCase()}-${slugTerritoire(nom)}`;
export const adresseGroupement = (siren: string, nom: string) => `/groupements/${siren}-${slugTerritoire(nom)}`;

/**
 * The official code an address begins with, upper case (« 2a-corse-du-sud » → « 2A »), when it is one of that kind;
 * null otherwise (the page answers « not found »). The name after it is checked by the page, which redirects to the
 * right one.
 */
export function codeDeAdresse(cle: string, sorte: "region" | "departement" | "commune" | "groupement"): string | null {
  const code = (/^([0-9a-z]+)(?:-|$)/.exec(cle)?.[1] ?? "").toUpperCase();
  const motif = { region: CODE_REGION, departement: CODE_DEPARTEMENT, commune: CODE_COMMUNE, groupement: SIREN }[sorte];
  return motif.test(code) ? code : null;
}

/** The département of a commune, from its code (« 35238 » → « 35 », « 97411 » → « 974 », « 2A004 » → « 2A »). */
export const departementDeCommune = (code: string): string =>
  code.startsWith("97") ? code.slice(0, 3) : code.slice(0, 2);
