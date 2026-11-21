// The fourth rule of the method (docs/methode.md § 3; the owner's decision of 21/11/2026, point 04): a name with an
// inner label « in » (never the first one) belongs to an internal sub-zone, and is neither measured nor shown. Two
// safeguards: the number of names it sets aside is published with the rule (etat.json, the Quality page); at each new
// official list, 20 of them drawn at random are asked again to Quad9, and if one answers, the rule is suspended: its
// names come back into the measurement until the rule is reviewed at the next point. A suspension changes the rules of
// the day (brief B.7 bis): it never enters the journal as a move.
import type { ClientDns, Code } from "./dns-bas";
import { melanger } from "./politesse";

export const TEXTE_REGLE_INTERNE =
  "sous-zone interne : une étiquette du sous-domaine, autre que la première, vaut « in »";

/** How many of the rule's names are asked again at each new list. */
export const NOMS_REPOSES = 20;

export type EtatRegleInterne = {
  /** « appliquée », or « suspendue » since one of its names answered (to be reviewed at the next point). */
  etat: "appliquée" | "suspendue";
  /** The newest list (its date) and the method under which the names were last asked again. */
  liste: string;
  methode: string;
  /** The day they were asked, how many, how many answered, and Quad9's codes. */
  controle: { date: string; poses: number; reponses: number; codes: Record<string, number> };
};

/**
 * Must the rule's names be asked again today? At a new list, or under a new method (after a review). A suspended rule
 * stays suspended under the same method: only a review lifts it, never a new draw.
 */
export function controleDu(precedent: EtatRegleInterne | null, liste: string, methode: string): "reposer" | "garder" {
  if (precedent === null || precedent.methode !== methode) return "reposer";
  if (precedent.etat === "suspendue") return "garder";
  return precedent.liste === liste ? "garder" : "reposer";
}

/** An answer from the name's servers: anything but a failure (NOERROR, with or without data, or NXDOMAIN). */
export const repond = (code: Code) => code === "NOERROR" || code === "NXDOMAIN";

/** Asks `NOMS_REPOSES` of the rule's names, drawn at random, to the control resolver (its own pace). */
export async function reposerNoms(
  client: ClientDns,
  noms: readonly string[],
  aleatoire: () => number,
  date: string,
  liste: string,
  methode: string,
  precedent: EtatRegleInterne | null = null,
): Promise<EtatRegleInterne> {
  const tires = melanger(noms, aleatoire).slice(0, NOMS_REPOSES);
  const reponses = await Promise.all(tires.map((nom) => client.demander(nom, "A")));
  const codes: Record<string, number> = {};
  for (const r of reponses) codes[r.code] = (codes[r.code] ?? 0) + 1;
  const repondus = reponses.filter((r) => repond(r.code)).length;
  // Quad9 never answered (every question timed out, or could not be sent): the check proves nothing. The rule keeps
  // its state, and the list is asked again the next day.
  if (tires.length > 0 && reponses.every((r) => r.code === "TIMEOUT" || r.code === "ERREUR")) {
    return {
      etat: precedent?.etat ?? "appliquée",
      liste: precedent?.liste ?? "",
      methode,
      controle: { date, poses: tires.length, reponses: 0, codes },
    };
  }
  return {
    etat: repondus > 0 ? "suspendue" : "appliquée",
    liste,
    methode,
    controle: { date, poses: tires.length, reponses: repondus, codes },
  };
}

/** Yesterday's state of the rule, read from the published etat.json (an outside input: checked field by field). */
export function lireEtatRegleInterne(valeur: unknown): EtatRegleInterne | null {
  if (typeof valeur !== "object" || valeur === null) return null;
  const v = valeur as Record<string, unknown>;
  const c = v["controle"];
  // A list's date (or none yet), a method's version and a day: nothing else is ever published again from here.
  if (
    (v["etat"] !== "appliquée" && v["etat"] !== "suspendue") ||
    typeof v["liste"] !== "string" ||
    !/^(\d{4}-\d{2}-\d{2})?$/.test(v["liste"]) ||
    typeof v["methode"] !== "string" ||
    !/^\d{1,3}(\.\d{1,3}){0,3}$/.test(v["methode"]) ||
    typeof c !== "object" ||
    c === null
  ) {
    return null;
  }
  const controle = c as Record<string, unknown>;
  const entier = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x >= 0 ? x : null);
  const poses = entier(controle["poses"]);
  const reponses = entier(controle["reponses"]);
  const codesBruts = controle["codes"];
  if (
    typeof controle["date"] !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(controle["date"]) ||
    poses === null ||
    reponses === null
  ) {
    return null;
  }
  const codes: Record<string, number> = {};
  if (typeof codesBruts === "object" && codesBruts !== null) {
    for (const [code, n] of Object.entries(codesBruts)) {
      const k = entier(n);
      if (/^[A-Z_]{1,20}$/.test(code) && k !== null) codes[code] = k;
    }
  }
  return {
    etat: v["etat"],
    liste: v["liste"],
    methode: v["methode"],
    controle: { date: controle["date"], poses, reponses, codes },
  };
}
