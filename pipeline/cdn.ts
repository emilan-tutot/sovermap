// CDN layer (docs/methode.md § 4, couche 9): a CDN is recognised by a documented CNAME suffix, an address in an official
// range list of the provider, or an AS dedicated to the CDN. Never by the AS of the address alone when that AS is shared.
import { isIP } from "node:net";
import { adresseEnEntier } from "./reseau";
import type { Niveau } from "./types";

export type FournisseurCdn = {
  id: string;
  nom: string;
  /** Key of the operating company in referentiels/societes.json. */
  societe: string;
  suffixes: { suffixe: string; source: string; lu_le: string }[];
  as: { numero: number; suffit_seul: boolean; source: string; lu_le: string }[];
  /** Official range lists, downloaded at run time; « texte »: one range per line; « fastly-json »: Fastly's format. */
  listes_plages?: { url: string; format: "texte" | "fastly-json" }[];
};

export type ReferentielCdn = { version: string; fournisseurs: FournisseurCdn[] };

/** Official ranges of a provider, downloaded at run time (never copied into the repository). */
export type PlagesOfficielles = Record<string, { plages: string[]; source: string; date: string }>;

export type DetectionCdn = {
  id: string;
  nom: string;
  societe: string;
  methode: "cname" | "plage" | "as";
  niveau: Niveau;
  preuve: string;
};

/** An official range is « address/length », the length within its family (32 for IPv4, 128 for IPv6). */
export function estPlage(plage: string): boolean {
  const morceaux = plage.trim().split("/");
  const [base = "", longueurTexte = ""] = morceaux;
  const famille = isIP(base);
  return (
    morceaux.length === 2 &&
    famille !== 0 &&
    /^\d{1,3}$/.test(longueurTexte) &&
    Number(longueurTexte) <= (famille === 4 ? 32 : 128)
  );
}

function dansPlage(adresse: string, plage: string): boolean {
  // A range without its length would read as a mask of 0, that is every address of the family: it is refused.
  if (!estPlage(plage)) return false;
  const [base = "", longueurTexte = ""] = plage.trim().split("/");
  try {
    const a = adresseEnEntier(adresse);
    const b = adresseEnEntier(base);
    if (a.famille !== b.famille) return false;
    const bits = a.famille === 4 ? 32 : 128;
    const longueur = Number(longueurTexte);
    const masque = longueur === 0 ? 0n : ((1n << BigInt(longueur)) - 1n) << BigInt(bits - longueur);
    return (a.valeur & masque) === (b.valeur & masque);
  } catch {
    return false;
  }
}

/** The CDN in front of a name, if any, with the strongest proof found. */
export function detecterCdn(
  chaineCname: readonly string[],
  adresses: readonly string[],
  asns: readonly number[],
  referentiel: ReferentielCdn,
  plages: PlagesOfficielles = {},
): DetectionCdn | null {
  for (const f of referentiel.fournisseurs) {
    const suffixe = f.suffixes.find((s) =>
      chaineCname.some((maillon) => maillon === s.suffixe.replace(/^\./, "") || maillon.endsWith(s.suffixe)),
    );
    if (suffixe)
      return {
        id: f.id,
        nom: f.nom,
        societe: f.societe,
        methode: "cname",
        niveau: "confirmé",
        preuve: `CNAME *${suffixe.suffixe}`,
      };
  }
  for (const f of referentiel.fournisseurs) {
    const officielles = plages[f.id];
    // The proof is the official range, never the address (a CDN's addresses change every day: plan § 4).
    const plage = officielles?.plages.find((p) => adresses.some((a) => dansPlage(a, p)));
    if (officielles && plage) {
      return {
        id: f.id,
        nom: f.nom,
        societe: f.societe,
        methode: "plage",
        niveau: "confirmé",
        preuve: `plage ${plage} de la liste officielle (${officielles.date})`,
      };
    }
  }
  for (const f of referentiel.fournisseurs) {
    const as = f.as.find((a) => a.suffit_seul && asns.includes(a.numero));
    if (as)
      return {
        id: f.id,
        nom: f.nom,
        societe: f.societe,
        methode: "as",
        niveau: "probable",
        preuve: `AS${as.numero} réservé au CDN`,
      };
  }
  return null;
}
