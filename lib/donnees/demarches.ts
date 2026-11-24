// The démarches' page (C.8, D.2): the online démarches the DINUM's Observatoire follows, the most used first (the
// volume its edition gives), each with the name of its address and what serves it that day. From the day's index
// (index/demarches.json, checked here, entry by entry). Pure.
import { raisonExclusion } from "@/pipeline/noms";
import type { Lecture } from "./lecture";
import type { Categorie, Niveau } from "./radiographie";

/** The state of a name, as the collection publishes it (pipeline/mesure.ts): never another word. */
export type EtatNom = "ok" | "nxdomain" | "nodata" | "echec";

export type MesureDemarche = {
  etat: EtatNom;
  categorie: Categorie;
  horsUE: boolean | null;
  niveau: Niveau;
  /** The keys of the companies that serve its web name, as index/exploitants.json names them. */
  societes: string[];
  cdn: string | null;
  /** The record of its name was reduced or shortened that day: what it says is partial. */
  partiel: boolean;
};

export type DemarcheServie = {
  id: string;
  nom: string;
  perimetre: string;
  administration: string | null;
  volumeTotal: number | null;
  volumeEnLigne: number | null;
  hote: string | null;
  domaine: string | null;
  /** What serves its address that day; null when the name of its address was not measured. */
  mesure: MesureDemarche | null;
};

export type IndexDemarches = { edition: number; periode: string; publiee: string; demarches: DemarcheServie[] };

const CATEGORIES: readonly Categorie[] = [
  "France",
  "UE hors France",
  "Europe hors UE",
  "hors d'Europe",
  "non déterminé",
];
const NIVEAUX: readonly Niveau[] = ["confirmé", "probable", "non déterminé"];
const ETATS: readonly EtatNom[] = ["ok", "nxdomain", "nodata", "echec"];
const NOM = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)+$/;
const CLE = /^[a-z0-9-]{1,80}$/;

const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const texte = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
const volume = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null);
const nom = (v: unknown): string | null => (typeof v === "string" && v.length <= 253 && NOM.test(v) ? v : null);

/** A measure whose state is not one the collection publishes is no measure: never told as a failure. */
function mesureDe(v: unknown): MesureDemarche | null {
  const m = objet(v);
  if (m === null) return null;
  const categorie = CATEGORIES.find((c) => c === m["categorie"]);
  const niveau = NIVEAUX.find((n) => n === m["niveau"]);
  const etat = ETATS.find((e) => e === m["etat"]);
  if (categorie === undefined || niveau === undefined || etat === undefined) return null;
  const societes = Array.isArray(m["societes"])
    ? (m["societes"] as unknown[]).filter((s): s is string => typeof s === "string" && CLE.test(s)).slice(0, 20)
    : [];
  return {
    etat,
    categorie,
    horsUE: typeof m["horsUE"] === "boolean" ? m["horsUE"] : null,
    niveau,
    societes,
    cdn: typeof m["cdn"] === "string" && CLE.test(m["cdn"]) ? m["cdn"] : null,
    partiel: m["partiel"] === true,
  };
}

/**
 * index/demarches.json, checked: an entry that is not a démarche is left out; the most used first (the edition's
 * total volume; a démarche the edition gives no volume comes after), then in the alphabetical order of their names. An
 * address the method calls internal or technical is never shown (docs/methode.md § 3: « ni mesurés ni affichés »).
 */
export function lireIndexDemarches(valeur: unknown): IndexDemarches | null {
  const racine = objet(valeur);
  const source = objet(racine?.["source"]);
  const edition = source?.["edition"];
  const periode = texte(source?.["periode"], 40);
  const publiee = source?.["publiee"];
  if (
    typeof edition !== "number" ||
    !Number.isSafeInteger(edition) ||
    edition < 1 ||
    periode === null ||
    typeof publiee !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(publiee) ||
    !Array.isArray(racine?.["demarches"])
  )
    return null;
  const demarches: DemarcheServie[] = [];
  for (const brute of (racine["demarches"] as unknown[]).slice(0, 2000)) {
    const d = objet(brute);
    const id = d?.["id"];
    const nomDemarche = texte(d?.["nom"], 300);
    const perimetre = texte(d?.["perimetre"], 120);
    if (d === null || typeof id !== "string" || !/^\d{1,9}$/.test(id) || nomDemarche === null || perimetre === null)
      continue;
    const hote = nom(d["hote"]);
    const domaine = nom(d["domaine"]);
    const adresse = hote !== null && domaine !== null && raisonExclusion(hote, domaine) === null;
    demarches.push({
      id,
      nom: nomDemarche,
      perimetre,
      administration: texte(d["administration"], 120),
      volumeTotal: volume(d["volumeTotal"]),
      volumeEnLigne: volume(d["volumeEnLigne"]),
      hote: adresse ? hote : null,
      domaine: adresse ? domaine : null,
      mesure: adresse ? mesureDe(d["mesure"]) : null,
    });
  }
  const ordre = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  demarches.sort(
    (a, b) =>
      (b.volumeTotal ?? -1) - (a.volumeTotal ?? -1) || ordre.compare(a.nom, b.nom) || Number(a.id) - Number(b.id),
  );
  return { edition, periode, publiee, demarches };
}

/** What the « served by » cell of a démarche says: nothing measured, a name that does not answer, or its companies. */
export type Servie =
  | { sorte: "non mesuree" }
  | { sorte: "sans reponse"; etat: Exclude<EtatNom, "ok"> }
  | { sorte: "servie"; societes: { cle: string; nom: string | null }[]; partiel: boolean };

/**
 * The « served by » cell of a démarche (its page): its companies by their names in the day's index (`nomDe`; null when
 * the index names none that day), or why there are none. Pure, so that each case is tested.
 */
export function servieDe(mesure: MesureDemarche | null, nomDe: (cle: string) => string | undefined): Servie {
  if (mesure === null) return { sorte: "non mesuree" };
  switch (mesure.etat) {
    case "ok":
      return {
        sorte: "servie",
        societes: mesure.societes.map((cle) => ({ cle, nom: nomDe(cle) ?? null })),
        partiel: mesure.partiel,
      };
    case "nxdomain":
    case "nodata":
    case "echec":
      return { sorte: "sans reponse", etat: mesure.etat };
    default: {
      const jamais: never = mesure.etat;
      return jamais;
    }
  }
}

/**
 * The démarches' edition and its period, for the attribution of card 55 (the open data's page, the Sources page):
 * « ok » when their index is published and reads; « absent » when it is not published (no attribution); « indisponible »
 * when it is published but does not read (the page answers an error, never cached without the attribution).
 */
export function editionDemarches(
  lu: Lecture<unknown>,
): { statut: "ok"; edition: number; periode: string } | { statut: "absent" } | { statut: "indisponible" } {
  if (lu.statut === "absent" || lu.statut === "porte fermée") return { statut: "absent" };
  const index = lu.statut === "ok" ? lireIndexDemarches(lu.donnees) : null;
  return index === null ? { statut: "indisponible" } : { statut: "ok", edition: index.edition, periode: index.periode };
}
