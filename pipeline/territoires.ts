// The territory of a domain (brief C.6): a local office's town, as the local directory writes it (its name and its
// postcode), found among the INSEE's official communes (referentiels/cog/, card 52), with its département and région.
// The postcode only narrows the candidates to its département: it is not an INSEE code. A name unique in France is
// never taken outside that département. A commune whose postcode is a neighbouring département's, or an office of an
// overseas collectivity (absent from the communes' file), stays without a commune (« non déterminé »), unless that
// département has a commune of the same name, which is then taken (a rare case, not measured: no postcode file).
import { type Guichet, TYPE_DEPARTEMENT, TYPE_GROUPEMENT, TYPE_MAIRIE, TYPE_REGION } from "./annuaire-local";
import { lignesCsv } from "./liste";

export type Commune = { code: string; nom: string; dep: string; reg: string };
/** By comparable name, the communes that name may designate. */
export type IndexCommunes = Map<string, Commune[]>;

/**
 * A commune's name, comparable: no accents, no case, œ and æ spelt out, hyphens and apostrophes as spaces, « St », and
 * without the « Cedex » of a postal address (« Evry Cedex 1 »).
 */
export function normaliserCommune(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[-'’]/g, " ")
    .replace(/\bste\b/g, "sainte")
    .replace(/\bst\b/g, "saint")
    .replace(/\bcedex(\s+\d{1,3})?$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The département a postcode belongs to: its first two digits; in Corsica, 2A below 20200 and 2B from it; overseas
 * (97… and 98…), its first three digits, except Saint-Barthélemy (97133: 977) and Saint-Martin (97150: 978), and
 * Monaco (980…), which has none. A postcode of five digits only; anything else gives none.
 */
export function departementsDuCodePostal(codePostal: string): string[] {
  if (!/^\d{5}$/.test(codePostal)) return [];
  if (codePostal === "97133") return ["977"];
  if (codePostal === "97150") return ["978"];
  if (codePostal.startsWith("20")) return [Number(codePostal) < 20200 ? "2A" : "2B"];
  if (codePostal.startsWith("980")) return [];
  if (codePostal.startsWith("97") || codePostal.startsWith("98")) return [codePostal.slice(0, 3)];
  return [codePostal.slice(0, 2)];
}

/**
 * The communes of the pinned copy, by comparable name: a commune (« COM ») under its own name; a delegated or associated
 * commune (« COMD », « COMA ») or a municipal district (« ARM ») under its own name too, designating the commune it
 * belongs to (`comparent`), in that commune's département.
 */
export function indexCommunes(csv: string): IndexCommunes {
  const [entete = [], ...lignes] = [...lignesCsv(csv)];
  const i = (colonne: string) => entete.indexOf(colonne);
  const colonnes = ["typecom", "com", "dep", "reg", "libelle", "comparent"].map(i);
  if (colonnes.some((k) => k < 0)) throw new Error("communes du COG : colonnes attendues absentes");
  const [iType = 0, iCom = 0, iDep = 0, iReg = 0, iNom = 0, iParent = 0] = colonnes;
  const communes = new Map<string, Commune>();
  for (const l of lignes) {
    const [type, code, dep, reg, nom] = [l[iType], l[iCom], l[iDep], l[iReg], l[iNom]];
    if (type === "COM" && code && dep && reg && nom) communes.set(code, { code, nom, dep, reg });
  }
  const index: IndexCommunes = new Map();
  const ajouter = (nom: string, commune: Commune) => {
    const cle = normaliserCommune(nom);
    const connues = index.get(cle) ?? [];
    if (!connues.some((c) => c.code === commune.code)) index.set(cle, [...connues, commune]);
  };
  for (const commune of communes.values()) ajouter(commune.nom, commune);
  for (const l of lignes) {
    const [type, nom, parent] = [l[iType], l[iNom], l[iParent]];
    const commune = parent ? communes.get(parent) : undefined;
    if ((type === "COMD" || type === "COMA" || type === "ARM") && nom && commune) ajouter(nom, commune);
  }
  return index;
}

/**
 * The commune of an office: the one commune its name designates within its postcode's département; null when it
 * designates none there, or several, or the postcode tells no département.
 */
export function communeDe(nom: string, codePostal: string | null, index: IndexCommunes): Commune | null {
  const deps = codePostal === null ? [] : departementsDuCodePostal(codePostal);
  const candidates = (index.get(normaliserCommune(nom)) ?? []).filter((c) => deps.includes(c.dep));
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

/** The kinds of local authority an office of the directory stands for (card 50: its « types »), the only ones kept. */
const MAIRIE = TYPE_MAIRIE;
const GROUPEMENT = TYPE_GROUPEMENT;
const DEPARTEMENT = TYPE_DEPARTEMENT;
const REGION = TYPE_REGION;

export type Territoire = {
  /** The commune whose town hall's website is the domain's; null for a group's, a département's or a région's. */
  commune: { code: string; nom: string } | null;
  /** The group of communes (EPCI) whose website it is: its name and SIREN, as the directory gives them. */
  groupement: { nom: string; siren: string | null } | null;
  /** Codes of the COG. */
  departement: string | null;
  region: string | null;
  /** One source, the directory, links the website to its authority: « probable » (docs/methode.md § 5). */
  niveau: "probable";
};

/** The one value the items agree on, by a key; null when they are none or disagree. */
function seul<T>(valeurs: readonly T[], cle: (v: T) => string): T | null {
  return new Set(valeurs.map(cle)).size === 1 ? (valeurs[0] ?? null) : null;
}

/**
 * The territory of a domain, from the offices of the directory whose websites are among its names. The widest kind of
 * authority among them holds the domain (a council or a group may host its communes' sites; a town hall may list its
 * council's): a régional council gives its région; a départemental council, its département and région; both from its
 * seat's commune; a group of communes (EPCI), its name and SIREN, and its seat's département and région when found; a
 * town hall, its commune, département and région. Offices of that kind that disagree (two communes, two groups, two
 * seats), or a council's seat not found, give nothing. Null when no office links the domain, or nothing can be said.
 */
export function territoireDe(
  noms: readonly string[],
  guichetsParHote: ReadonlyMap<string, readonly Guichet[]>,
  index: IndexCommunes,
): Territoire | null {
  const guichets = [...new Set(noms.flatMap((n) => guichetsParHote.get(n) ?? []))];
  const deType = (type: string) => guichets.filter((g) => g.type === type);
  const siegeDe = (g: Guichet) => (g.commune === null ? null : communeDe(g.commune, g.codePostal, index));
  /** The seats of offices, all found, or null. */
  const sieges = (offices: readonly Guichet[]): Commune[] | null => {
    const trouves = offices.map(siegeDe).filter((c): c is Commune => c !== null);
    return trouves.length === offices.length ? trouves : null;
  };
  const vide = { commune: null, groupement: null, departement: null, region: null, niveau: "probable" } as const;

  const regions = deType(REGION);
  if (regions.length > 0) {
    const siege = seul(sieges(regions) ?? [], (c) => c.reg);
    return siege === null ? null : { ...vide, region: siege.reg };
  }
  const departements = deType(DEPARTEMENT);
  if (departements.length > 0) {
    const siege = seul(sieges(departements) ?? [], (c) => c.dep);
    return siege === null ? null : { ...vide, departement: siege.dep, region: siege.reg };
  }
  const groupements = deType(GROUPEMENT);
  if (groupements.length > 0) {
    const groupement = seul(groupements, (g) => g.siren ?? g.nom);
    if (groupement === null) return null;
    const siege = siegeDe(groupement);
    return {
      ...vide,
      groupement: { nom: groupement.nom, siren: groupement.siren },
      departement: siege?.dep ?? null,
      region: siege?.reg ?? null,
    };
  }
  const mairies = deType(MAIRIE);
  const commune = seul(sieges(mairies) ?? [], (c) => c.code);
  return commune === null
    ? null
    : { ...vide, commune: { code: commune.code, nom: commune.nom }, departement: commune.dep, region: commune.reg };
}

/** A host name as the directory's addresses give it (lower case, ASCII); never an address, whose last label is digits. */
const NOM_HOTE = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

/** One office of the published copy, checked at the border; null for a line that is not one. */
function guichetPublie(valeur: unknown): Guichet | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const o = valeur as Record<string, unknown>;
  const texte = (v: unknown, max: number) => (typeof v === "string" && v !== "" && v.length <= max ? v : null);
  /** A value or null; undefined when it is neither. */
  const ou = (v: unknown, motif: RegExp) =>
    v === null ? null : typeof v === "string" && motif.test(v) ? v : undefined;
  const nom = texte(o["nom"], 300);
  const type = texte(o["type"], 120);
  const hotes = Array.isArray(o["hotes"])
    ? o["hotes"].filter(
        (h): h is string => typeof h === "string" && NOM_HOTE.test(h) && /[a-z]/.test(h.split(".").at(-1) ?? ""),
      )
    : null;
  const siren = ou(o["siren"], /^\d{9}$/);
  const siret = ou(o["siret"], /^\d{14}$/);
  const commune = o["commune"] === null ? null : (texte(o["commune"], 120) ?? undefined);
  const codePostal = ou(o["codePostal"], /^\d{5}$/);
  const modification = ou(o["modification"], /^\d{4}-\d{2}-\d{2}$/);
  if (nom === null || type === null || hotes === null) return null;
  if (siren === undefined || siret === undefined || commune === undefined) return null;
  if (codePostal === undefined || modification === undefined) return null;
  return { nom, type, hotes, siren, siret, commune, codePostal, modification };
}

/**
 * The offices of the published copy of the local directory (territoires/annuaire/guichets.jsonl, written by
 * annuaire.yml, one office per line), each checked: a line that is not an office is left out, and counted.
 */
export function lireGuichetsPublies(texte: string): { guichets: Guichet[]; ecartees: number } {
  const guichets: Guichet[] = [];
  let ecartees = 0;
  for (const ligne of texte.split("\n")) {
    if (ligne.trim() === "") continue;
    let g: Guichet | null = null;
    try {
      g = guichetPublie(JSON.parse(ligne));
    } catch {
      g = null;
    }
    if (g === null) ecartees += 1;
    else guichets.push(g);
  }
  return { guichets, ecartees };
}

/** The territory of each domain that has one, from its names, the published offices and the official communes. */
export function territoiresDesDomaines(
  nomsParDomaine: ReadonlyMap<string, readonly string[]>,
  guichets: readonly Guichet[],
  index: IndexCommunes,
): Map<string, Territoire> {
  const parHote = new Map<string, Guichet[]>();
  for (const g of guichets) for (const h of g.hotes) parHote.set(h, [...(parHote.get(h) ?? []), g]);
  const territoires = new Map<string, Territoire>();
  for (const [domaine, noms] of nomsParDomaine) {
    const t = territoireDe(noms, parHote, index);
    if (t !== null) territoires.set(domaine, t);
  }
  return territoires;
}
