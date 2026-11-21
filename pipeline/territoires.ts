// The territory of a domain (brief C.6): a local office's town, as the local directory writes it (its name and its
// postcode), found among the INSEE's official communes (referentiels/cog/, card 52), with its département and région.
// The postcode only narrows the candidates: it is not an INSEE code, and a few communes have a neighbour's.
import type { Guichet } from "./annuaire-local";
import { lignesCsv } from "./liste";

export type Commune = { code: string; nom: string; dep: string; reg: string };
export type IndexCommunes = Map<string, Commune[]>;
export type CommuneTrouvee = { commune: Commune; niveau: "confirmé" | "probable" };

/** A commune's name, comparable: no accents, no case, hyphens and apostrophes as spaces, « St » as « Saint ». */
export function normaliserCommune(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[-'’]/g, " ")
    .replace(/\bste\b/g, "sainte")
    .replace(/\bst\b/g, "saint")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The départements a postcode may belong to: its first two digits; in Corsica, 2A below 20200 and 2B from it; overseas
 * (97…), its first three digits. A postcode of five digits only; anything else gives none.
 */
export function departementsDuCodePostal(codePostal: string): string[] {
  if (!/^\d{5}$/.test(codePostal)) return [];
  if (codePostal.startsWith("20")) return [Number(codePostal) < 20200 ? "2A" : "2B"];
  if (codePostal.startsWith("97")) return [codePostal.slice(0, 3)];
  return [codePostal.slice(0, 2)];
}

/** The communes of the pinned copy (typecom « COM » only), by comparable name. */
export function indexCommunes(csv: string): IndexCommunes {
  const lignes = lignesCsv(csv);
  const entete = lignes.next().value ?? [];
  const i = (colonne: string) => entete.indexOf(colonne);
  const [iType, iCom, iDep, iReg, iNom] = [i("typecom"), i("com"), i("dep"), i("reg"), i("libelle")];
  if ([iType, iCom, iDep, iReg, iNom].some((k) => k < 0))
    throw new Error("communes du COG : colonnes attendues absentes");
  const index: IndexCommunes = new Map();
  for (const l of lignes) {
    const [type, code, dep, reg, nom] = [l[iType], l[iCom], l[iDep], l[iReg], l[iNom]];
    if (type !== "COM" || !code || !dep || !reg || !nom) continue;
    const cle = normaliserCommune(nom);
    index.set(cle, [...(index.get(cle) ?? []), { code, nom, dep, reg }]);
  }
  return index;
}

/**
 * The commune of an office: « confirmé » when its name, within its postcode's département, gives one commune;
 * « probable » when the name alone gives one commune elsewhere (a neighbour's postcode); null otherwise.
 */
export function communeDe(nom: string, codePostal: string | null, index: IndexCommunes): CommuneTrouvee | null {
  const candidates = index.get(normaliserCommune(nom)) ?? [];
  const deps = codePostal === null ? [] : departementsDuCodePostal(codePostal);
  const dansLeDepartement = candidates.filter((c) => deps.includes(c.dep));
  if (dansLeDepartement.length === 1 && dansLeDepartement[0])
    return { commune: dansLeDepartement[0], niveau: "confirmé" };
  if (dansLeDepartement.length === 0 && candidates.length === 1 && candidates[0])
    return { commune: candidates[0], niveau: "probable" };
  return null;
}

/** The kinds of local authority an office of the directory stands for (fiche 50: its « types »). */
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
  niveau: "confirmé" | "probable";
};

/**
 * The territory of a domain, from the offices of the directory whose websites are among its names: a town hall gives
 * its commune (and from it the département and région); an EPCI, its group; a départemental or régional council, only
 * the kind (its code needs its commune). Several town halls of different communes on one domain (a shared site) give
 * no commune. Null when no office links it.
 */
export function territoireDe(
  noms: readonly string[],
  guichetsParHote: ReadonlyMap<string, readonly Guichet[]>,
  index: IndexCommunes,
): Territoire | null {
  const guichets = [...new Set(noms.flatMap((n) => guichetsParHote.get(n) ?? []))];
  if (guichets.length === 0) return null;
  const mairies = guichets
    .filter((g) => g.type === MAIRIE && g.commune !== null)
    .map((g) => communeDe(g.commune ?? "", g.codePostal, index));
  const codes = new Set(mairies.map((m) => m?.commune.code ?? null));
  const groupement = guichets.find((g) => g.type === GROUPEMENT) ?? null;
  if (mairies.length > 0 && codes.size === 1 && !codes.has(null) && groupement === null) {
    const trouvee = mairies[0];
    if (trouvee) {
      const { commune, niveau } = trouvee;
      return {
        commune: { code: commune.code, nom: commune.nom },
        groupement: null,
        departement: commune.dep,
        region: commune.reg,
        niveau,
      };
    }
  }
  if (groupement !== null) {
    // The group's seat, when its office's town is found, gives its département and région.
    const siege = groupement.commune === null ? null : communeDe(groupement.commune, groupement.codePostal, index);
    return {
      commune: null,
      groupement: { nom: groupement.nom, siren: groupement.siren },
      departement: siege?.commune.dep ?? null,
      region: siege?.commune.reg ?? null,
      niveau: siege?.niveau ?? "probable",
    };
  }
  const conseil = guichets.find((g) => g.type === DEPARTEMENT || g.type === REGION);
  if (conseil !== undefined) {
    const siege = conseil.commune === null ? null : communeDe(conseil.commune, conseil.codePostal, index);
    return {
      commune: null,
      groupement: null,
      departement: conseil.type === DEPARTEMENT ? (siege?.commune.dep ?? null) : null,
      region: siege?.commune.reg ?? null,
      niveau: siege?.niveau ?? "probable",
    };
  }
  return null;
}
