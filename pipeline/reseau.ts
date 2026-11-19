// Network layer (docs/methode.md § 4, couche 4): address → prefix and origin AS, by two bulk sources read locally.
// IPtoASN (PDDL) is the published source; the RIS table of the day (RIPE NCC, control only) confirms it.
// Their agreement gives « confirmé », whatever the age of the IPtoASN file (decision of 19/11/2026).
import { isIP } from "node:net";
import type { Niveau } from "./types";

/** An IPv4 or IPv6 address as a big integer, with its family. */
export function adresseEnEntier(ip: string): { famille: 4 | 6; valeur: bigint } {
  const famille = isIP(ip);
  if (famille === 4) {
    const valeur = ip.split(".").reduce((acc, octet) => (acc << 8n) + BigInt(Number(octet)), 0n);
    return { famille: 4, valeur };
  }
  if (famille === 6) {
    // An IPv4 address written at the end (::ffff:192.0.2.1) stands for the last two groups.
    const v4 = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
    const texte = v4
      ? `${ip.slice(0, v4.index)}${((Number(v4[1]) << 8) | Number(v4[2])).toString(16)}:${((Number(v4[3]) << 8) | Number(v4[4])).toString(16)}`
      : ip;
    const [tete = "", queue] = texte.toLowerCase().split("::");
    const groupes = (s: string | undefined) => (s === undefined || s === "" ? [] : s.split(":"));
    const debut = groupes(tete);
    const fin = groupes(queue);
    const manquants = queue === undefined ? 0 : 8 - debut.length - fin.length;
    const tous = [...debut, ...Array<string>(manquants).fill("0"), ...fin];
    const valeur = tous.reduce((acc, g) => (acc << 16n) + BigInt(parseInt(g, 16)), 0n);
    return { famille: 6, valeur };
  }
  throw new Error("adresse IP invalide");
}

export type LigneIpToAsn = { debut: bigint; fin: bigint; asn: number; pays: string; description: string };

/** IPtoASN table (ip2asn-combined.tsv): one range per line, `start end AS country description`. */
export class TableIpToAsn {
  readonly #v4: LigneIpToAsn[] = [];
  readonly #v6: LigneIpToAsn[] = [];

  constructor(contenu: string) {
    for (const ligne of contenu.split("\n")) {
      const [debut, fin, asn, pays = "", ...description] = ligne.split("\t");
      if (debut === undefined || fin === undefined || asn === undefined || debut === "") continue;
      const d = adresseEnEntier(debut);
      const entree = {
        debut: d.valeur,
        fin: adresseEnEntier(fin).valeur,
        asn: Number(asn),
        pays,
        description: description.join(" ").trim(),
      };
      (d.famille === 4 ? this.#v4 : this.#v6).push(entree);
    }
    const ordre = (x: LigneIpToAsn, y: LigneIpToAsn) => (x.debut < y.debut ? -1 : x.debut > y.debut ? 1 : 0);
    this.#v4.sort(ordre);
    this.#v6.sort(ordre);
  }

  get taille(): number {
    return this.#v4.length + this.#v6.length;
  }

  /** The routed AS of an address (AS 0 means « not routed »), or null. */
  chercher(ip: string): LigneIpToAsn | null {
    const { famille, valeur } = adresseEnEntier(ip);
    const lignes = famille === 4 ? this.#v4 : this.#v6;
    let bas = 0;
    let haut = lignes.length - 1;
    while (bas <= haut) {
      const milieu = (bas + haut) >> 1;
      const l = lignes[milieu];
      if (l === undefined) break;
      if (valeur < l.debut) haut = milieu - 1;
      else if (valeur > l.fin) bas = milieu + 1;
      else return l.asn === 0 ? null : l;
    }
    return null;
  }
}

export type PrefixeRis = { prefixe: string; origines: number[]; pairs: number };

/** An IPv4 address as an unsigned 32-bit number, or null. Numbers, not big integers: the RIS table has a million lines. */
function ipv4EnNombre(ip: string): number | null {
  const octets = ip.split(".");
  if (octets.length !== 4) return null;
  let valeur = 0;
  for (const octet of octets) {
    const n = Number(octet);
    if (octet === "" || !Number.isInteger(n) || n < 0 || n > 255) return null;
    valeur = valeur * 256 + n;
  }
  return valeur;
}
const masque4 = (longueur: number) => (longueur === 0 ? 0 : (0xffffffff << (32 - longueur)) >>> 0);
const masque6 = (longueur: number) => (longueur === 0 ? 0n : ((1n << BigInt(longueur)) - 1n) << BigInt(128 - longueur));

/** RIS « riswhoisdump » table: `origin AS <tab> prefix <tab> seen by n peers`; longest prefix match. */
export class TableRis {
  /** Prefix length → network → prefix, for IPv4 (number keys) and IPv6 (hexadecimal keys). */
  readonly #v4 = new Map<number, Map<number, PrefixeRis>>();
  readonly #v6 = new Map<number, Map<string, PrefixeRis>>();

  constructor(contenus: string[], minPairs = 5) {
    for (const contenu of contenus) {
      for (const ligne of contenu.split("\n")) {
        if (ligne === "" || ligne.startsWith("%")) continue;
        const [origine, prefixe, pairsTexte] = ligne.trim().split(/\s+/);
        if (origine === undefined || prefixe === undefined || pairsTexte === undefined) continue;
        const pairs = Number(pairsTexte);
        if (!(pairs >= minPairs)) continue;
        const barre = prefixe.indexOf("/");
        const adresse = prefixe.slice(0, barre);
        const longueur = Number(prefixe.slice(barre + 1));
        if (barre < 0 || !Number.isInteger(longueur)) continue;
        const asns = origine
          .replace(/[{}]/g, "")
          .split(",")
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0);
        let table: Map<number | string, PrefixeRis>;
        let cle: number | string;
        if (adresse.includes(":")) {
          if (isIP(adresse) !== 6 || longueur > 128) continue;
          cle = (adresseEnEntier(adresse).valeur & masque6(longueur)).toString(16);
          table = (this.#v6.get(longueur) ?? new Map<string, PrefixeRis>()) as Map<number | string, PrefixeRis>;
          this.#v6.set(longueur, table as Map<string, PrefixeRis>);
        } else {
          const n = ipv4EnNombre(adresse);
          if (n === null || longueur > 32) continue;
          cle = (n & masque4(longueur)) >>> 0;
          table = (this.#v4.get(longueur) ?? new Map<number, PrefixeRis>()) as Map<number | string, PrefixeRis>;
          this.#v4.set(longueur, table as Map<number, PrefixeRis>);
        }
        const existant = table.get(cle);
        if (existant) {
          for (const asn of asns) if (!existant.origines.includes(asn)) existant.origines.push(asn);
          existant.pairs = Math.max(existant.pairs, pairs);
        } else {
          table.set(cle, { prefixe, origines: asns, pairs });
        }
      }
    }
  }

  /** The most specific announced prefix that covers the address, or null. */
  chercher(ip: string): PrefixeRis | null {
    const n = ipv4EnNombre(ip);
    if (n !== null) {
      for (let longueur = 32; longueur >= 0; longueur -= 1) {
        const trouve = this.#v4.get(longueur)?.get((n & masque4(longueur)) >>> 0);
        if (trouve) return trouve;
      }
      return null;
    }
    const { valeur } = adresseEnEntier(ip);
    for (let longueur = 128; longueur >= 0; longueur -= 1) {
      const table = this.#v6.get(longueur);
      const trouve = table?.get((valeur & masque6(longueur)).toString(16));
      if (trouve) return trouve;
    }
    return null;
  }
}

export type CoucheReseau = {
  adresse: string;
  asns: number[];
  prefixe: string | null;
  descriptionAs: string | null;
  sources: { iptoasn: number | null; ris: number[] | null };
  niveau: Niveau;
};

/** Network layer of one address: « confirmé » when IPtoASN's AS is among the RIS origins of the day. */
export function coucheReseau(adresse: string, iptoasn: TableIpToAsn, ris: TableRis): CoucheReseau {
  const a = iptoasn.chercher(adresse);
  const r = ris.chercher(adresse);
  const sources = { iptoasn: a?.asn ?? null, ris: r?.origines ?? null };
  if (a && r && r.origines.includes(a.asn)) {
    return { adresse, asns: [a.asn], prefixe: r.prefixe, descriptionAs: a.description, sources, niveau: "confirmé" };
  }
  if (a && !r)
    return { adresse, asns: [a.asn], prefixe: null, descriptionAs: a.description, sources, niveau: "probable" };
  if (!a && r)
    return { adresse, asns: r.origines, prefixe: r.prefixe, descriptionAs: null, sources, niveau: "probable" };
  // Disagreement or nothing: shown as such.
  const asns = [...new Set([...(a ? [a.asn] : []), ...(r?.origines ?? [])])];
  return {
    adresse,
    asns,
    prefixe: r?.prefixe ?? null,
    descriptionAs: a?.description ?? null,
    sources,
    niveau: "non déterminé",
  };
}
