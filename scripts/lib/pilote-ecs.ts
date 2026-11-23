// The measurement point's pilot (brief B.4; plan § 9, point 6): on domains behind a CDN, does the company that serves a
// web name change with where its visitor is? Asked once, on GitHub's runners, to Google Public DNS's JSON API (card
// 15, control only), always with an explicit client subnet (EDNS Client Subnet: without one, part of the caller's own
// address would be passed on), at one question a second. The pure parts are here: the domains drawn, the companies
// behind a set of addresses, the comparison. The decision (plan § 9): beyond 1 % of domains whose company changes, the
// options of a European control go to a point.
import { generateur, melanger } from "@/pipeline/politesse";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import type { TableIpToAsn } from "@/pipeline/reseau";
import type { ReferentielAs } from "@/pipeline/societes";

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

/** At most this many domains, « État » ones first (brief B.4). */
export const DOMAINES_DU_PILOTE = 300;

export type DomaineDuPilote = { domaine: string; nomWeb: string; perimetre: "État" | "hors État"; publiees: string[] };

/**
 * The domains whose web name answered behind a CDN on the published day, « État » ones first, each group in an order
 * drawn from the seed; with the companies the published record names for the web name's addresses.
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
  const tirer = generateur(graine);
  const ordonnes = [
    ...melanger(
      candidats.filter((d) => d.perimetre === "État"),
      tirer,
    ),
    ...melanger(
      candidats.filter((d) => d.perimetre !== "État"),
      tirer,
    ),
  ];
  return ordonnes.slice(0, n).map((d) => ({
    domaine: d.domaine,
    nomWeb: d.nomWeb,
    perimetre: d.perimetre,
    publiees: societesDe((noms.get(d.nomWeb)?.exploitants ?? []).map((e) => e.societe ?? e.preuve)),
  }));
}

const societesDe = (liste: readonly string[]): string[] => [...new Set(liste)].sort();

/** The companies behind a set of addresses: each address's AS (IPtoASN), then its company (or « AS<n> » when none). */
export function societesDesAdresses(adresses: readonly string[], iptoasn: TableIpToAsn, tableAs: ReferentielAs): string[] {
  return societesDe(
    adresses.flatMap((ip) => {
      const ligne = iptoasn.chercher(ip);
      if (ligne === null || ligne.asn === 0) return [];
      return [tableAs.as[String(ligne.asn)]?.societe ?? `AS${ligne.asn}`];
    }),
  );
}

export type ResultatDomaine = DomaineDuPilote & {
  /** The companies behind the addresses each subnet received; null when its question got no address. */
  parSousReseau: Record<string, string[] | null>;
};

export type BilanPilote = {
  domaines: number;
  /** Domains every subnet got an answer for. */
  compares: number;
  /** Among them, those whose companies differ from one subnet to another. */
  changent: number;
  partPourcent: number;
  /** Beyond 1 %, the options of a European control go to a point (plan § 9). */
  auDelaDuSeuil: boolean;
  exemples: { domaine: string; parSousReseau: Record<string, string[] | null> }[];
};

export function bilanDuPilote(resultats: readonly ResultatDomaine[]): BilanPilote {
  const compares = resultats.filter((r) => Object.values(r.parSousReseau).every((s) => s !== null && s.length > 0));
  const changent = compares.filter((r) => new Set(Object.values(r.parSousReseau).map((s) => (s ?? []).join(","))).size > 1);
  const partPourcent = compares.length === 0 ? 0 : Math.round((1000 * changent.length) / compares.length) / 10;
  return {
    domaines: resultats.length,
    compares: compares.length,
    changent: changent.length,
    partPourcent,
    auDelaDuSeuil: partPourcent > 1,
    exemples: changent.slice(0, 20).map((r) => ({ domaine: r.domaine, parSousReseau: r.parSousReseau })),
  };
}
