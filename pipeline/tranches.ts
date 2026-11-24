// The collection split into jobs of one run (brief B.8, « découpage en tâches d'une même exécution si une collecte
// approche 3 h »; day 3 took 216 minutes): each half of the list is measured in its own job, one after the other,
// never two at once (the load on the servers stays the same); then a last job puts the two halves together and runs
// the guards on the whole day. This module is pure: the half of a domain, what a half's job hands on, and the merging
// of the two halves.
import { createHash } from "node:crypto";
import type { UrgenceDuJour } from "./collecte";
import type { DebitServeurs } from "./debit-serveurs";
import type { MesureNom, MesureZone } from "./mesure";
import type { ResultatSpf } from "./spf";

export type Tranche = 1 | 2;

/**
 * The half a domain is measured in: by a stable hash of its name, never by its place in the list, so that each half
 * gets its share of every kind of domain (the State's, the local bodies', those behind a CDN, the slow zones).
 */
export function trancheDe(domaine: string): Tranche {
  const premier = createHash("sha256").update(domaine).digest()[0] ?? 0;
  return premier % 2 === 0 ? 1 : 2;
}

/** The waits of the brake (collecter.ts). */
export type Attentes = { ouvertures: number; questions: number; secondes: number };

/**
 * What a half's job hands on to the next one: its measurement (as the day's observations keep it), its controls,
 * its confirmations, its pace and the emergency stop's counts. A file of the run's artifact, never published: the raw
 * DNS answers of public names (never a SOA's contact, a CAA's, or a TXT other than SPF).
 */
export type ResultatTranche = {
  tranche: Tranche;
  date: string;
  noms: [string, MesureNom][];
  domaines: [string, MesureZone][];
  hotes: [string, MesureNom][];
  spf: [string, ResultatSpf][];
  controleNoms: [string, { resolveur: string; mesure: MesureNom }][];
  controleMx: [string, string[] | null][];
  /** The failures Quad9 confirmed (point 02, Q2). */
  pannes: { noms: string[]; zones: string[] };
  /** The domains whose MX question alone failed, and Quad9's too. */
  pannesMx: string[];
  /** The domains Quad9 was asked about after their attempts. */
  demandes: string[];
  /** The failures still to confirm after the attempts, for the summary. */
  aConfirmer: number;
  /** Why the half stopped before its end (the emergency stop), or null. */
  arret: string | null;
  inacheves: string[];
  premierePasseCoupee: number;
  /** The witnesses, asked by the first half only (empty in the second). */
  temoinsKnot: [string, MesureNom][];
  temoinsCloudflare: [string, MesureNom][];
  /** What the control resolver was given: the plan's names and MX, and the hosts of the « État » domains. */
  controle: { noms: number; mx: number; hotes: number };
  debit: DebitServeurs | null;
  attentes: Attentes;
  /** The emergency stop's counts at the half's end, the day's so far: the second half starts from the first's. */
  urgence: UrgenceDuJour;
  /** The half's minutes, from its own start, for the summary. */
  minutes: number;
};

const tableau = (v: unknown): boolean => Array.isArray(v);

/** Reads a half's result back (the previous job of the same run wrote it): its shape is checked, never trusted. */
export function lireTranche(texte: string, attendue: Tranche, date: string): ResultatTranche {
  const r = JSON.parse(texte) as Partial<ResultatTranche>;
  if (r.tranche !== attendue) throw new Error(`tranche ${attendue} attendue, ${String(r.tranche)} lue`);
  if (r.date !== date) throw new Error(`tranche ${attendue} : jour ${String(r.date)}, ${date} attendu`);
  const listes = [
    r.noms,
    r.domaines,
    r.hotes,
    r.spf,
    r.controleNoms,
    r.controleMx,
    r.pannesMx,
    r.demandes,
    r.inacheves,
    r.temoinsKnot,
    r.temoinsCloudflare,
  ];
  if (!listes.every(tableau) || !tableau(r.pannes?.noms) || !tableau(r.pannes?.zones)) {
    throw new Error(`tranche ${attendue} : fichier incomplet`);
  }
  for (const n of [
    r.aConfirmer,
    r.premierePasseCoupee,
    r.minutes,
    r.controle?.noms,
    r.controle?.mx,
    r.controle?.hotes,
    r.urgence?.pauses,
    r.urgence?.depassements,
  ]) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0)
      throw new Error(`tranche ${attendue} : un compte illisible`);
  }
  if (r.arret !== null && typeof r.arret !== "string") throw new Error(`tranche ${attendue} : arrêt illisible`);
  return r as ResultatTranche;
}

/** Two lists keyed by name that never share a key (a name, a domain belongs to one half): a shared key is an error. */
function disjointes<T>(quoi: string, a: [string, T][], b: [string, T][]): [string, T][] {
  const vus = new Set(a.map(([k]) => k));
  const doublon = b.find(([k]) => vus.has(k));
  if (doublon !== undefined) throw new Error(`les deux tranches ont mesuré ${quoi} « ${doublon[0]} »`);
  return [...a, ...b];
}

/**
 * Two lists keyed by host, which two halves may share (a name server serves domains of both): one measurement per
 * key, the first half's unless it failed and the second's did not.
 */
function partagees<T>(a: [string, T][], b: [string, T][], echec: (v: T) => boolean): [string, T][] {
  const fusion = new Map(a);
  for (const [k, v] of b) {
    const deja = fusion.get(k);
    if (deja === undefined || (echec(deja) && !echec(v))) fusion.set(k, v);
  }
  return [...fusion];
}

const enEchec = (m: MesureNom) => m.etat === "echec";

/** Merges two lists of the busiest (keyed), summing by key, then sorting and capping them as each half did. */
function fusionnerPar<T>(
  a: readonly T[],
  b: readonly T[],
  cle: (x: T) => string,
  ajouter: (x: T, y: T) => T,
  ordre: (x: T, y: T) => number,
  plafond: number,
): T[] {
  const parCle = new Map<string, T>();
  for (const x of [...a, ...b]) {
    const deja = parCle.get(cle(x));
    parCle.set(cle(x), deja === undefined ? x : ajouter(deja, x));
  }
  return [...parCle.values()].sort(ordre).slice(0, plafond);
}

const sommeTypes = (a: Record<string, number>, b: Record<string, number>) => {
  const s: Record<string, number> = { ...a };
  for (const [k, n] of Object.entries(b)) s[k] = (s[k] ?? 0) + n;
  return Object.fromEntries(Object.entries(s).sort(([, x], [, y]) => y - x));
};

/**
 * The pace of the whole day from its two halves. The halves ran one after the other: their seconds never overlap, so
 * the counts add up and the highest second is the higher of the two. The lists of the busiest (addresses above 10 in
 * a second, hot cuts, loaded addresses, amplifying zones) are merged by key where they have one, then sorted and
 * capped as each half did; an address above 10 in both halves may be listed twice (it has no key there).
 */
export function fusionnerDebits(a: DebitServeurs | null, b: DebitServeurs | null): DebitServeurs | null {
  if (a === null || b === null) return a ?? b;
  const haut = b.max > a.max ? b : a;
  return {
    questions: a.questions + b.questions,
    depassements: a.depassements + b.depassements,
    secondes: a.secondes + b.secondes,
    secondesAuDela: a.secondesAuDela + b.secondesAuDela,
    auDela: [...a.auDela, ...b.auDela].sort((x, y) => y.secondes - x.secondes || y.max - x.max).slice(0, 5),
    max: haut.max,
    adresse: haut.adresse,
    seconde: haut.seconde,
    tldsMax: haut.tldsMax,
    coupesChaudes: fusionnerPar(
      a.coupesChaudes,
      b.coupesChaudes,
      (c) => c.coupe,
      (x, y) => ({ coupe: x.coupe, secondes: x.secondes + y.secondes }),
      (x, y) => y.secondes - x.secondes || (x.coupe < y.coupe ? -1 : 1),
      5,
    ),
    adressesChargees: fusionnerPar(
      a.adressesChargees,
      b.adressesChargees,
      (c) => c.adresse,
      (x, y) => ({
        adresse: x.adresse,
        questions: x.questions + y.questions,
        parType: sommeTypes(x.parType, y.parType),
        tlds: [...new Set([...x.tlds, ...y.tlds])].sort(),
      }),
      (x, y) => y.questions - x.questions || (x.adresse < y.adresse ? -1 : 1),
      3,
    ),
    amplifications: fusionnerPar(
      a.amplifications,
      b.amplifications,
      (z) => z.zone,
      (x, y) => ({
        zone: x.zone,
        envois: x.envois + y.envois,
        amont: x.amont + y.amont,
        parType: sommeTypes(x.parType, y.parType),
      }),
      (x, y) => y.amont / y.envois - x.amont / x.envois || (x.zone < y.zone ? -1 : 1),
      5,
    ),
  };
}

/**
 * The whole day from its two halves (the first, then the second). A name, a domain or a domain's MX measured in both
 * is an error (the halves are disjoint by domain); a host may be in both (one measurement kept). The day stopped if
 * either half stopped: the second half does not run after a stopped first one (collecte.yml), and a stopped day is
 * never published.
 */
export function fusionnerTranches(a: ResultatTranche, b: ResultatTranche): ResultatTranche {
  if (a.tranche !== 1 || b.tranche !== 2) throw new Error("la tranche 1, puis la tranche 2");
  if (a.date !== b.date) throw new Error(`deux jours différents : ${a.date} et ${b.date}`);
  return {
    tranche: 1,
    date: a.date,
    noms: disjointes("le nom", a.noms, b.noms),
    domaines: disjointes("le domaine", a.domaines, b.domaines),
    hotes: partagees(a.hotes, b.hotes, enEchec),
    spf: disjointes("le SPF du domaine", a.spf, b.spf),
    controleNoms: partagees(a.controleNoms, b.controleNoms, (c) => enEchec(c.mesure)),
    controleMx: disjointes("les MX du domaine", a.controleMx, b.controleMx),
    pannes: {
      noms: [...new Set([...a.pannes.noms, ...b.pannes.noms])].sort(),
      zones: [...new Set([...a.pannes.zones, ...b.pannes.zones])].sort(),
    },
    pannesMx: [...new Set([...a.pannesMx, ...b.pannesMx])].sort(),
    demandes: [...new Set([...a.demandes, ...b.demandes])].sort(),
    aConfirmer: a.aConfirmer + b.aConfirmer,
    arret: a.arret ?? b.arret,
    inacheves: [...new Set([...a.inacheves, ...b.inacheves])].sort(),
    premierePasseCoupee: a.premierePasseCoupee + b.premierePasseCoupee,
    temoinsKnot: disjointes("le témoin", a.temoinsKnot, b.temoinsKnot),
    temoinsCloudflare: disjointes("le témoin", a.temoinsCloudflare, b.temoinsCloudflare),
    controle: {
      noms: a.controle.noms + b.controle.noms,
      mx: a.controle.mx + b.controle.mx,
      // A host of the « État » that serves domains of both halves was given to Quad9 by each: counted once (the review
      // of B.8). The plans' names never are (a domain, and its web name, belong to one half).
      hotes: a.controle.hotes + b.controle.hotes - communes(a.controleNoms, b.controleNoms),
    },
    debit: fusionnerDebits(a.debit, b.debit),
    attentes: {
      ouvertures: a.attentes.ouvertures + b.attentes.ouvertures,
      questions: a.attentes.questions + b.attentes.questions,
      secondes: a.attentes.secondes + b.attentes.secondes,
    },
    // The second half started from the first's counts: its own are the day's.
    urgence: b.urgence,
    minutes: a.minutes + b.minutes,
  };
}

/** The keys two lists share. */
function communes<T>(a: readonly [string, T][], b: readonly [string, T][]): number {
  const cles = new Set(a.map(([k]) => k));
  return b.filter(([k]) => cles.has(k)).length;
}
