// The territory of a domain (brief C.6): a local office's town, as the local directory writes it (its name and its
// postcode), found among the INSEE's official communes (referentiels/cog/, card 52), with its département and région.
// The postcode only narrows the candidates: it is not an INSEE code, and a few communes have a neighbour's.
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
