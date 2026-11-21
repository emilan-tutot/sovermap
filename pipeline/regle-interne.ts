// The fourth rule of the method (docs/methode.md § 3; the owner's decision of 21/11/2026, point 04): a name with an
// inner label « in » (never the first one) belongs to an internal sub-zone, and is neither measured nor shown. Two
// safeguards: the number of names it sets aside is published with the rule (etat.json, the Quality page); at each new
// official list, 20 of them drawn at random are asked again to Quad9, and if one answers — it has an address (point 05)
// — the rule is suspended: its names come back into the measurement until the rule is reviewed at the next point. A
// suspension changes the rules of the day (brief B.7 bis): it never enters the journal as a move.
import type { ClientDns, Reponse } from "./dns-bas";
import { melanger } from "./politesse";

export const TEXTE_REGLE_INTERNE =
  "sous-zone interne : une étiquette du sous-domaine, autre que la première, vaut « in »";

/** How many of the rule's names are asked again at each new list. */
export const NOMS_REPOSES = 20;

/**
 * What the check of one name gave, in the owner's categories (point 05): an address (NOERROR with at least one A or
 * AAAA record), NXDOMAIN, NOERROR without an address, SERVFAIL, a timeout, or another failure (REFUSED, a question
 * that could not be sent).
 */
export const ISSUES = ["avecAdresse", "nxdomain", "sansAdresse", "servfail", "delai", "autre"] as const;
export type Issue = (typeof ISSUES)[number];
export type Codes = Record<Issue, number>;

export type EtatRegleInterne = {
  /** « appliquée », or « suspendue » since one of its names had an address (to be reviewed at the next point). */
  etat: "appliquée" | "suspendue";
  /** The newest list (its date) and the method under which the names were last asked again. */
  liste: string;
  methode: string;
  /** The day they were asked, how many, how many had an address, and every name's category. */
  controle: { date: string; poses: number; reponses: number; codes: Codes };
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

/** A name answers when it has an address: NOERROR with at least one A or AAAA record (the owner's decision, point 05). */
const avecAdresse = (r: Reponse) =>
  r.code === "NOERROR" && r.reponses.some((e) => e.donnee.type === "A" || e.donnee.type === "AAAA");

/** One name's category: its A, and its AAAA when the A answered without an address. */
async function issueDe(client: ClientDns, nom: string): Promise<Issue> {
  const a = await client.demander(nom, "A");
  if (avecAdresse(a)) return "avecAdresse";
  if (a.code === "NOERROR") return avecAdresse(await client.demander(nom, "AAAA")) ? "avecAdresse" : "sansAdresse";
  switch (a.code) {
    case "NXDOMAIN":
      return "nxdomain";
    case "SERVFAIL":
      return "servfail";
    case "TIMEOUT":
      return "delai";
    default:
      return "autre";
  }
}

const codesVides = (): Codes => ({ avecAdresse: 0, nxdomain: 0, sansAdresse: 0, servfail: 0, delai: 0, autre: 0 });

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
  const issues = await Promise.all(tires.map((nom) => issueDe(client, nom)));
  const codes = codesVides();
  for (const issue of issues) codes[issue] += 1;
  // Quad9 gave no verdict on any name (every question timed out, or could not be sent): the check proves nothing. The
  // rule keeps its state, and the list is asked again the next day.
  if (tires.length > 0 && issues.every((i) => i === "delai" || i === "autre")) {
    return {
      etat: precedent?.etat ?? "appliquée",
      liste: precedent?.liste ?? "",
      methode: precedent?.methode ?? "",
      controle: { date, poses: tires.length, reponses: 0, codes },
    };
  }
  return {
    etat: codes.avecAdresse > 0 ? "suspendue" : "appliquée",
    liste,
    methode,
    controle: { date, poses: tires.length, reponses: codes.avecAdresse, codes },
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
    !/^(\d{1,3}(\.\d{1,3}){0,3})?$/.test(v["methode"]) ||
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
  // The six categories only, each a count: anything else is dropped.
  const codes = codesVides();
  if (typeof codesBruts === "object" && codesBruts !== null) {
    const bruts = codesBruts as Record<string, unknown>;
    for (const issue of ISSUES) codes[issue] = entier(bruts[issue]) ?? 0;
  }
  return {
    etat: v["etat"],
    liste: v["liste"],
    methode: v["methode"],
    controle: { date: controle["date"], poses, reponses, codes },
  };
}
