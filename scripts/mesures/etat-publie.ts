// Shared by the measurement tools of the points (scripts/mesures/): reads a published state from a local folder (a
// copy of the « donnees » branch, or the « sortie » folder of a run's artifact), every record checked at the border to
// be an object with its key. Local files only; nothing is asked to any server.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** A record as published: a JSON object, its fields read one by one. */
export type Fiche = Readonly<Record<string, unknown>>;

/** A JSON object, or null. */
export const objet = (v: unknown): Fiche | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Fiche) : null;

/** A string, or null. */
export const chaine = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** An array, or an empty one for anything else. */
export const liste = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);

/** A fragment of the published state: « 2c.json », or « 2c.1.json » when a bucket is split. */
const FRAGMENT = /^[0-9a-f]{2}(\.[0-9]+)?\.json$/;

/** Every record of a kind (« noms » by their name, « domaines » by their domain), from every fragment of the folder. */
export function lireFiches(dossier: string, sorte: "noms" | "domaines"): Map<string, Fiche> {
  const cle = sorte === "noms" ? "nom" : "domaine";
  const fiches = new Map<string, Fiche>();
  const racine = path.join(dossier, sorte);
  for (const haut of readdirSync(racine)) {
    for (const fichier of readdirSync(path.join(racine, haut))) {
      if (!FRAGMENT.test(fichier)) continue;
      const contenu = objet(JSON.parse(readFileSync(path.join(racine, haut, fichier), "utf8")));
      for (const e of liste(contenu?.[sorte])) {
        const fiche = objet(e);
        const valeur = chaine(fiche?.[cle]);
        if (fiche !== null && valeur !== null) fiches.set(valeur, fiche);
      }
    }
  }
  return fiches;
}
