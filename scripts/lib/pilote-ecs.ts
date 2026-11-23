// The measurement point's pilot (brief B.4; plan § 9, point 6): on domains behind a CDN, does the company that serves a
// web name change with where its visitor is? Asked once, on GitHub's runners, to Google Public DNS's JSON API (card
// 15, control only), always with an explicit client subnet (EDNS Client Subnet: without one, part of the caller's own
// address would be passed on), through the project's polite downloader (pipeline/sources.ts: robots.txt first and
// obeyed, one second at least between two requests, a time limit). Each answer is classified by the method itself
// (pipeline/classement.ts: the CDN first, by its CNAME suffix, an official range or a dedicated AS; the address's AS
// only without a CDN), and a domain « changes » when the method's own comparison of two observations (its control)
// disagrees. The decision (brief B.4): beyond 1 % of the compared domains, the options of a European control go to a
// point.
import { isIP } from "node:net";
import { estPlage, type PlagesOfficielles } from "@/pipeline/cdn";
import { classer, type Contexte } from "@/pipeline/classement";
import type { ObservationDns } from "@/pipeline/dns";
import { generateur, melanger } from "@/pipeline/politesse";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import { RefusRobots, type Reponse } from "@/pipeline/sources";
import type { DnsStatus } from "@/pipeline/types";
import { validerListeFastly } from "@/pipeline/valider";

/** An explicit client subnet: a /24 inside a large block of a residential network, registered in that country. */
export type SousReseau = { pays: string; prefixe: string; source: string };

export const SOUS_RESEAUX: readonly SousReseau[] = [
  {
    pays: "France",
    prefixe: "90.0.0.0/24",
    source:
      "RIPE NCC, fichier de délégation du 22/11/2026 : 90.0.0.0, 4 194 304 adresses, attribuées en FR (Orange S.A., AS3215 dans IPtoASN)",
  },
  {
    pays: "États-Unis",
    prefixe: "24.0.0.0/24",
    source:
      "ARIN, fichier de délégation du 22/11/2026 : 24.0.0.0, 1 048 576 adresses, attribuées aux US (Comcast, AS33659 dans IPtoASN)",
  },
];

export const API_GOOGLE = "https://dns.google";
/** At most this many domains behind a CDN, drawn at random (brief B.4). */
export const DOMAINES_DU_PILOTE = 300;
/** Below this many compared domains, one domain alone would weigh more than 1 %: the share is not judged. */
export const COMPARES_AU_MOINS = 100;
/** The pilot stops after this many questions in a row without the API's answer (a refusal, an error, a time-out). */
export const SANS_REPONSE_DE_SUITE_AU_PLUS = 5;

export type Perimetre = EnregistrementDomaine["perimetre"];
export type DomaineDuPilote = {
  domaine: string;
  nomWeb: string;
  perimetre: Perimetre;
  /** The companies the published record names for the web name (as the method's control compares them). */
  publiees: string[];
};

/**
 * The domains whose web name answered behind a CDN on the published day, drawn at random from the seed (the same seed
 * draws the same domains), at most n; with the companies the published record names.
 */
export function domainesDuPilote(
  domaines: Iterable<EnregistrementDomaine>,
  noms: ReadonlyMap<string, EnregistrementNom>,
  graine: number,
  n = DOMAINES_DU_PILOTE,
): DomaineDuPilote[] {
  const candidats = [...domaines]
    .filter((d) => {
      const web = noms.get(d.nomWeb);
      return web !== undefined && web.etat === "ok" && web.cdn !== null;
    })
    .sort((a, b) => (a.domaine < b.domaine ? -1 : a.domaine > b.domaine ? 1 : 0));
  return melanger(candidats, generateur(graine))
    .slice(0, n)
    .map((d) => ({
      domaine: d.domaine,
      nomWeb: d.nomWeb,
      perimetre: d.perimetre,
      publiees: [...new Set((noms.get(d.nomWeb)?.exploitants ?? []).map((e) => e.societe ?? e.preuve))].sort(),
    }));
}

/** The question for one name and one subnet: an A query, the subnet always explicit. */
export const adresseDeQuestion = (nom: string, s: SousReseau): string =>
  `${API_GOOGLE}/resolve?name=${encodeURIComponent(nom)}&type=A&edns_client_subnet=${encodeURIComponent(s.prefixe)}`;

/** What the pilot reads from one answer of the JSON API, checked at the border. */
export type ReponseGoogle = {
  /** The DNS response code (0: NOERROR, 2: SERVFAIL, 3: NXDOMAIN…). */
  code: number;
  /** The CNAME chain, in order, lower case, without the final dot (10 links at most, as the method). */
  chaineCname: string[];
  a: string[];
  /** The ECS scope the API gives back (« subnet/scope »): a scope of 0 means the answer does not depend on it. */
  portee: string | null;
};

const nomDns = (v: string) => v.toLowerCase().replace(/[.]$/, "");

/** An answer of the JSON API, or null when the body is not one. */
export function lireReponse(texte: string): ReponseGoogle | null {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return null;
  }
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return null;
  const o = brut as Record<string, unknown>;
  const code = o["Status"];
  if (typeof code !== "number" || !Number.isInteger(code)) return null;
  const chaineCname: string[] = [];
  const a: string[] = [];
  for (const r of Array.isArray(o["Answer"]) ? (o["Answer"] as unknown[]) : []) {
    if (typeof r !== "object" || r === null) continue;
    const { type, data } = r as Record<string, unknown>;
    if (typeof data !== "string") continue;
    if (type === 5) {
      const cible = nomDns(data);
      if (cible !== "" && !chaineCname.includes(cible)) chaineCname.push(cible);
    } else if (type === 1 && isIP(data) === 4 && !a.includes(data)) {
      a.push(data);
    }
  }
  const ecs = o["edns_client_subnet"];
  return { code, chaineCname: chaineCname.slice(0, 10), a, portee: typeof ecs === "string" ? ecs.slice(0, 64) : null };
}

const STATUT_DU_CODE = (code: number, adresses: number): DnsStatus =>
  code === 0 ? (adresses > 0 ? "NOERROR" : "NODATA") : code === 3 ? "NXDOMAIN" : "SERVFAIL";

/** One answer as the method's observation of a name (A only: both subnets are asked the same question). */
export function observationDe(nom: string, r: ReponseGoogle, resolveur: string, heure: string): ObservationDns {
  return {
    nom,
    resolveur,
    heure,
    statut: STATUT_DU_CODE(r.code, r.a.length),
    chaineCname: r.chaineCname,
    a: r.a,
    aaaa: [],
    zone: null,
    ns: [],
    adressesNs: {},
  };
}

/** The companies the method names for one observation (the CDN's when there is one), as its control compares them. */
export function societesDe(o: ObservationDns, perimetre: Perimetre, contexte: Contexte): string[] | null {
  if (o.statut !== "NOERROR") return null;
  return [...new Set(classer(o, null, perimetre, contexte).servants.map((s) => s.chaine.societe?.cle ?? s.preuve))].sort();
}

/**
 * Whether the company changes from the first subnet to any other, by the method's own comparison (its control
 * resolver's accord); null when one subnet got no address (the domain is then not compared).
 */
export function changeDeSociete(
  observations: readonly (ObservationDns | null)[],
  perimetre: Perimetre,
  contexte: Contexte,
): boolean | null {
  const [premiere, ...autres] = observations;
  if (premiere === undefined || premiere === null || premiere.statut !== "NOERROR" || autres.length === 0) return null;
  let change = false;
  for (const autre of autres) {
    if (autre === null || autre.statut !== "NOERROR") return null;
    const accord = classer(premiere, autre, perimetre, contexte).controle?.accord;
    if (accord === undefined) return null;
    if (!accord) change = true;
  }
  return change;
}

/** The official ranges of the CDNs, read as the collection reads them (pipeline/cli/collecter.ts, contexteDe). */
export function plagesOfficielles(cloudflare: readonly string[], fastly: string | null): PlagesOfficielles {
  const plages: PlagesOfficielles = {};
  const cf = cloudflare
    .flatMap((t) => t.split(/\r?\n/))
    .map((l) => l.trim())
    .filter((l) => l !== "" && estPlage(l));
  if (cf.length > 0) plages.cloudflare = { plages: cf, source: "https://www.cloudflare.com/ips-v4 et /ips-v6", date: "" };
  if (fastly !== null) {
    try {
      const liste = validerListeFastly(JSON.parse(fastly) as unknown).filter(estPlage);
      plages.fastly = { plages: liste, source: "https://api.fastly.com/public-ip-list", date: "" };
    } catch {
      // A list of another shape is left out, as in the collection: the CDN is then recognised by its suffix or its AS.
    }
  }
  return plages;
}

export type ResultatSousReseau = {
  pays: string;
  /** The answer, or null when the API gave none (a refusal, an error, a time-out). */
  reponse: ReponseGoogle | null;
  /** The companies the method names, or null without an address. */
  societes: string[] | null;
};
export type ResultatDomaine = DomaineDuPilote & { sousReseaux: ResultatSousReseau[]; change: boolean | null };

export type Mesure = {
  resultats: ResultatDomaine[];
  questions: number;
  /** Questions the API did not answer (an error status, a body that is not its answer, a time-out). */
  sansReponse: number;
  /** Questions answered without an address (NXDOMAIN, SERVFAIL, no A). */
  sansAdresse: number;
  /** Why the pilot stopped early, or null. */
  arret: string | null;
};

export const mesureVide = (): Mesure => ({ resultats: [], questions: 0, sansReponse: 0, sansAdresse: 0, arret: null });

/**
 * Asks every drawn domain once per subnet, one question at a time, through `obtenir` (the polite downloader: it
 * spaces the questions and obeys robots.txt). It fills `mesure` as it goes, so that the caller keeps what was measured
 * even if it stops; it stops when robots.txt forbids the questions, or after too many questions in a row without the
 * API's answer.
 */
export async function mesurer(
  tires: readonly DomaineDuPilote[],
  obtenir: (adresse: string) => Promise<Reponse>,
  contexte: Contexte,
  mesure: Mesure,
  sousReseaux: readonly SousReseau[] = SOUS_RESEAUX,
  maintenant: () => Date = () => new Date(),
): Promise<Mesure> {
  let sansReponseDeSuite = 0;
  for (const d of tires) {
    const sr: ResultatSousReseau[] = [];
    const observations: (ObservationDns | null)[] = [];
    for (const s of sousReseaux) {
      let reponse: ReponseGoogle | null = null;
      try {
        const r = await obtenir(adresseDeQuestion(d.nomWeb, s));
        reponse = r.statut === 200 ? lireReponse(r.corps.toString("utf8")) : null;
      } catch (e) {
        // Refused by robots.txt (or by a server error on it): the question was never sent.
        if (e instanceof RefusRobots) {
          mesure.arret = "le robots.txt de dns.google interdit ces questions";
          return mesure;
        }
      }
      mesure.questions += 1;
      if (reponse === null) {
        mesure.sansReponse += 1;
        sansReponseDeSuite += 1;
        if (sansReponseDeSuite >= SANS_REPONSE_DE_SUITE_AU_PLUS) {
          mesure.arret = `${sansReponseDeSuite} questions de suite sans réponse de l'API`;
          return mesure;
        }
      } else {
        sansReponseDeSuite = 0;
      }
      const observation =
        reponse === null ? null : observationDe(d.nomWeb, reponse, `Google ECS ${s.prefixe}`, maintenant().toISOString());
      if (observation !== null && observation.statut !== "NOERROR") mesure.sansAdresse += 1;
      observations.push(observation);
      sr.push({
        pays: s.pays,
        reponse,
        societes: observation === null ? null : societesDe(observation, d.perimetre, contexte),
      });
    }
    mesure.resultats.push({ ...d, sousReseaux: sr, change: changeDeSociete(observations, d.perimetre, contexte) });
  }
  return mesure;
}

export type Decision = "au-delà du seuil" | "seuil tenu" | "non déterminé";

export type BilanPilote = {
  domaines: number;
  /** Domains every subnet got an address for. */
  compares: number;
  /** Among them, those whose company changes from one subnet to another. */
  changent: number;
  /** For display only, rounded to a tenth; the threshold is judged on the exact counts. */
  partPourcent: number | null;
  decision: Decision;
  /** For information: the same counts by perimeter (the draw is one random sample, not a census of either). */
  parPerimetre: Record<Perimetre, { compares: number; changent: number }>;
  exemples: { domaine: string; sousReseaux: { pays: string; societes: string[] | null }[] }[];
};

export function bilanDuPilote(resultats: readonly ResultatDomaine[]): BilanPilote {
  const compares = resultats.filter((r) => r.change !== null);
  const changent = compares.filter((r) => r.change === true);
  const parPerimetre = { État: { compares: 0, changent: 0 }, "hors État": { compares: 0, changent: 0 } };
  for (const r of compares) {
    parPerimetre[r.perimetre].compares += 1;
    if (r.change === true) parPerimetre[r.perimetre].changent += 1;
  }
  const decision: Decision =
    compares.length < COMPARES_AU_MOINS
      ? "non déterminé"
      : changent.length * 100 > compares.length
        ? "au-delà du seuil"
        : "seuil tenu";
  return {
    domaines: resultats.length,
    compares: compares.length,
    changent: changent.length,
    partPourcent: compares.length === 0 ? null : Math.round((1000 * changent.length) / compares.length) / 10,
    decision,
    parPerimetre,
    exemples: changent.slice(0, 20).map((r) => ({
      domaine: r.domaine,
      sousReseaux: r.sousReseaux.map((s) => ({ pays: s.pays, societes: s.societes })),
    })),
  };
}
