// The démarches' page (C.8, D.2): the online démarches the DINUM's Observatoire follows, the most used first (the
// volume its edition gives), each with the name of its address and what serves it that day. From the day's index
// (index/demarches.json, checked here, entry by entry). Pure.
import type { Categorie, Niveau } from "./radiographie";

export type MesureDemarche = {
  etat: string;
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
const NOM = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)+$/;
const CLE = /^[a-z0-9-]{1,80}$/;

const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const texte = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
const volume = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null);
const nom = (v: unknown): string | null => (typeof v === "string" && v.length <= 253 && NOM.test(v) ? v : null);

function mesureDe(v: unknown): MesureDemarche | null {
  const m = objet(v);
  if (m === null) return null;
  const categorie = CATEGORIES.find((c) => c === m["categorie"]);
  const niveau = NIVEAUX.find((n) => n === m["niveau"]);
  const etat = texte(m["etat"], 20);
  if (categorie === undefined || niveau === undefined || etat === null) return null;
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
 * total volume; a démarche the edition gives no volume comes after), then in the alphabetical order of their names.
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
    demarches.push({
      id,
      nom: nomDemarche,
      perimetre,
      administration: texte(d["administration"], 120),
      volumeTotal: volume(d["volumeTotal"]),
      volumeEnLigne: volume(d["volumeEnLigne"]),
      hote: hote !== null && domaine !== null ? hote : null,
      domaine: hote !== null && domaine !== null ? domaine : null,
      mesure: hote !== null && domaine !== null ? mesureDe(d["mesure"]) : null,
    });
  }
  const ordre = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  demarches.sort(
    (a, b) =>
      (b.volumeTotal ?? -1) - (a.volumeTotal ?? -1) || ordre.compare(a.nom, b.nom) || Number(a.id) - Number(b.id),
  );
  return { edition, periode, publiee, demarches };
}
