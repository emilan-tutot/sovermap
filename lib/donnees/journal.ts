// The journal (D.2, R10): the changes of hosting confirmed by two successive collections, day by day. The days are
// those whose file the day's state publishes (etat.json, sommes); each day's file is checked against its schema.
import { JOURNAL, valider } from "@/pipeline/schemas";
import type { EtatPublie } from "./lecture";

export type Couche = "adresses" | "serveursDeNoms" | "messagerie";
export type Changement = { domaine: string; couche: Couche; avant: string; apres: string };
export type Jour = { date: string; etatInitial: boolean; reglesChangees: boolean; changements: Changement[] };

const MOTIF_JOUR = /^journal\/(\d{4})\/(\d{2})\/(\d{4}-\d{2}-\d{2})\.json$/;

/** A day of the journal (« 2026-11-21 ») as an address may carry it. */
export const estJour = (date: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));

/** The path of a day's file. */
export const cheminJour = (date: string): string => `journal/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.json`;

/** The days whose journal the day's state publishes, the latest first. */
export function joursPublies(etat: EtatPublie): string[] {
  return Object.keys(etat.sommes)
    .flatMap((chemin) => {
      const m = MOTIF_JOUR.exec(chemin);
      return m !== null && m[3] !== undefined && m[3].startsWith(`${m[1]}-${m[2]}-`) ? [m[3]] : [];
    })
    .sort()
    .reverse();
}

/** A day's file, checked against its schema: null when it is not one. */
export function lireJour(valeur: unknown): Jour | null {
  return valider(valeur, JOURNAL).length === 0 ? (valeur as Jour) : null;
}

/** The changes of a day by layer, in the method's order, each layer's changes sorted by domain. */
export function parCouche(changements: readonly Changement[]): [Couche, Changement[]][] {
  const ordre: Couche[] = ["adresses", "serveursDeNoms", "messagerie"];
  return ordre
    .map((c): [Couche, Changement[]] => [
      c,
      changements
        .filter((x) => x.couche === c)
        .sort((a, b) => (a.domaine < b.domaine ? -1 : a.domaine > b.domaine ? 1 : 0)),
    ])
    .filter(([, liste]) => liste.length > 0);
}
