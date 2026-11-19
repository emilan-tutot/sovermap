// The files read by the collection tools, checked at the boundary: a file of another shape stops the tool with the
// place and the reason, rather than producing wrong figures without a word.
import { isIP } from "node:net";
import type { Perimetre } from "./classement";
import type { ObservationDns } from "./dns";
import type { DnsStatus } from "./types";

export type EntreeListe = { nom: string; perimetre: Perimetre; groupe: string; raison: string };
export type FichierObservations = {
  principal: string;
  controle: string;
  debut: string;
  resultats: { entree: EntreeListe; principale: ObservationDns; controle: ObservationDns }[];
};

const STATUTS: readonly string[] = ["NOERROR", "NXDOMAIN", "NODATA", "SERVFAIL", "TIMEOUT", "ERROR"] satisfies DnsStatus[];
/** A DNS name: labels of letters, digits and hyphens, a final label that is not all digits. */
const NOM = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/i;

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const estTexte = (v: unknown): v is string => typeof v === "string";
const estTextes = (v: unknown): v is string[] => Array.isArray(v) && v.every(estTexte);
const estStatut = (v: unknown): v is DnsStatus => estTexte(v) && STATUTS.includes(v);

/** Stops with the place and what was expected when a value is not what the tool needs. */
function exiger(condition: boolean, ou: string, attendu: string): asserts condition {
  if (!condition) throw new Error(`${ou} : ${attendu}`);
}

export function validerEntree(v: unknown, ou: string): EntreeListe {
  exiger(estObjet(v), ou, "un objet attendu");
  const { nom, perimetre, groupe, raison } = v;
  exiger(estTexte(nom) && NOM.test(nom), `${ou}.nom`, "un nom de domaine attendu");
  exiger(perimetre === "État" || perimetre === "hors État", `${ou}.perimetre`, "« État » ou « hors État » attendu");
  exiger(estTexte(groupe) && estTexte(raison), ou, "un groupe et une raison attendus (texte)");
  return { nom, perimetre, groupe, raison };
}

/** The list of names to measure: { domaines: [{ nom, perimetre, groupe, raison }] }. */
export function validerListe(v: unknown): EntreeListe[] {
  exiger(estObjet(v) && Array.isArray(v["domaines"]), "liste", "{ domaines: [...] } attendu");
  return (v["domaines"] as unknown[]).map((e, i) => validerEntree(e, `liste.domaines[${i}]`));
}

export function validerObservation(v: unknown, ou: string): ObservationDns {
  exiger(estObjet(v), ou, "un objet attendu");
  const { nom, resolveur, heure, statut, chaineCname, a, aaaa, zone, ns, adressesNs } = v;
  exiger(estTexte(nom) && estTexte(resolveur) && estTexte(heure), ou, "un nom, un résolveur et une heure attendus (texte)");
  exiger(estStatut(statut), `${ou}.statut`, "un statut DNS attendu");
  exiger(estTextes(chaineCname) && estTextes(ns), ou, "chaineCname et ns : des listes de noms attendues");
  exiger(estTextes(a) && a.every((x) => isIP(x) === 4), `${ou}.a`, "des adresses IPv4 attendues");
  exiger(estTextes(aaaa) && aaaa.every((x) => isIP(x) === 6), `${ou}.aaaa`, "des adresses IPv6 attendues");
  exiger(zone === null || estTexte(zone), `${ou}.zone`, "un nom ou null attendu");
  exiger(estObjet(adressesNs), `${ou}.adressesNs`, "un objet attendu");
  const serveurs: Record<string, string | null> = {};
  for (const [serveur, adresse] of Object.entries(adressesNs)) {
    exiger(adresse === null || (estTexte(adresse) && isIP(adresse) !== 0), `${ou}.adressesNs.${serveur}`, "une adresse ou null attendue");
    serveurs[serveur] = adresse;
  }
  return { nom, resolveur, heure, statut, chaineCname, a, aaaa, zone, ns, adressesNs: serveurs };
}

/** The observations written by mesurer.ts. */
export function validerObservations(v: unknown): FichierObservations {
  exiger(estObjet(v), "observations", "un objet attendu");
  const { principal, controle, debut, resultats } = v;
  exiger(estTexte(principal) && estTexte(controle) && estTexte(debut) && Array.isArray(resultats), "observations", "{ principal, controle, debut, resultats: [...] } attendu");
  return {
    principal,
    controle,
    debut,
    resultats: resultats.map((r: unknown, i) => {
      const ou = `observations.resultats[${i}]`;
      exiger(estObjet(r), ou, "un objet attendu");
      return { entree: validerEntree(r["entree"], `${ou}.entree`), principale: validerObservation(r["principale"], `${ou}.principale`), controle: validerObservation(r["controle"], `${ou}.controle`) };
    }),
  };
}

/** Fastly's list of ranges: { addresses: [...], ipv6_addresses: [...] }, texts only. */
export function validerListeFastly(v: unknown): string[] {
  exiger(estObjet(v), "liste de Fastly", "un objet attendu");
  const { addresses = [], ipv6_addresses: v6 = [] } = v;
  exiger(estTextes(addresses) && estTextes(v6), "liste de Fastly", "addresses et ipv6_addresses : des listes de plages attendues");
  return [...addresses, ...v6];
}
