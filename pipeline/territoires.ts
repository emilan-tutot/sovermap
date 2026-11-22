// The territory of a domain (brief C.6): a local office's town, as the local directory writes it (its name and its
// postcode), found among the INSEE's official communes (referentiels/cog/, card 52), with its département and région.
// The postcode only narrows the candidates to its département: it is not an INSEE code. A name unique in France is
// never taken outside that département. A commune whose postcode is a neighbouring département's, or an office of an
// overseas collectivity (absent from the communes' file), stays without a commune (« non déterminé »), unless that
// département has a commune of the same name, which is then taken (a rare case, not measured: no postcode file).
import type { Guichet } from "./annuaire-local";
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

/** The kinds of local authority an office of the directory stands for (card 50: its « types »). */
const MAIRIE = "mairie";
const GROUPEMENT = "epci";
const DEPARTEMENT = "cg (Collectivité locale)";
const REGION = "cr (Collectivité locale)";

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
