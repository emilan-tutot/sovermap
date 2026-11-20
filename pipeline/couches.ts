// The layers of the method, from the day's measurement (docs/methode.md § 4 and § 5): the addresses of every name
// (classified by the v0 rules of classement.ts), the name servers and the mail exchangers of every domain (their hosts'
// addresses, classified the same way), and the SPF record's networks. Only what may be republished is kept here: the
// AS and its IPtoASN range and description (PDDL), the registry's country of registration of the AS, the companies of
// referentiels/; never RIS's prefixes (« en contrôle seulement », brief F.3), which only decide the confidence level.
import { type Classement, classer, type Contexte, type Perimetre, type Servant } from "./classement";
import type { ObservationDns } from "./dns";
import type { MesureNom } from "./mesure";
import { adresseEnEntier, type CoucheReseau, type TableIpToAsn, type TableRis } from "./reseau";
import type { ResultatSpf } from "./spf";
import { type Categorie, type DnsStatus, type Niveau, niveauMin } from "./types";

export type ContexteV1 = Contexte & {
  /** Country of registration of each AS (the five RIRs' delegation files): a registration, never a location. */
  paysAs: ReadonlyMap<number, string>;
  /** Holder of each AS of the RIPE region, from the RIPE database (organisation name and country). */
  titulairesRipe: ReadonlyMap<number, { orgName: string | null; pays: string | null }>;
};

export type Reseau = {
  as: number;
  plage: string | null;
  descriptionAs: string | null;
  paysEnregistrement: string | null;
};

export type Exploitant = {
  role: Servant["role"];
  societe: string | null;
  nom: string | null;
  pays: string | null;
  mere: string | null;
  paysMere: string | null;
  categorie: Categorie;
  preuve: string;
  niveau: Niveau;
};

export type CoucheAdresses = {
  etat: MesureNom["etat"];
  cname: string[];
  dnssec: boolean;
  reseaux: Reseau[];
  cdn: { id: string; methode: string; niveau: Niveau } | null;
  exploitants: Exploitant[];
  categorie: Categorie;
  horsUE: boolean | null;
  niveau: Niveau;
  controle: { resolveur: string; accord: boolean } | null;
};

/**
 * The network layer as the collection may publish it: the AS comes from IPtoASN only (« retenue »); RIS (« en contrôle
 * seulement », brief F.3) only says whether it confirms it, and none of its values is ever kept: without IPtoASN, the
 * layer is « non déterminé »; when RIS disagrees, IPtoASN's AS is kept, « non déterminé » (methode § 5).
 */
export function coucheReseauPubliable(adresse: string, iptoasn: TableIpToAsn, ris: TableRis): CoucheReseau {
  const a = iptoasn.chercher(adresse);
  if (a === null) {
    return {
      adresse,
      asns: [],
      prefixe: null,
      descriptionAs: null,
      sources: { iptoasn: null, ris: null },
      niveau: "non déterminé",
    };
  }
  const r = ris.chercher(adresse);
  const niveau: Niveau = r === null ? "probable" : r.origines.includes(a.asn) ? "confirmé" : "non déterminé";
  return {
    adresse,
    asns: [a.asn],
    prefixe: null,
    descriptionAs: a.description,
    sources: { iptoasn: a.asn, ris: null },
    niveau,
  };
}

const STATUTS: Record<MesureNom["etat"], DnsStatus> = {
  ok: "NOERROR",
  nxdomain: "NXDOMAIN",
  nodata: "NODATA",
  echec: "ERROR",
};

/** The v0 observation of a measured name (classement.ts reads addresses, the CNAME chain and the state). */
export function observationDe(m: MesureNom, resolveur: string, heure: string): ObservationDns {
  const statut: DnsStatus =
    m.etat === "echec"
      ? m.echec === "TIMEOUT"
        ? "TIMEOUT"
        : m.echec === "SERVFAIL"
          ? "SERVFAIL"
          : "ERROR"
      : STATUTS[m.etat];
  return {
    nom: m.nom,
    resolveur,
    heure,
    statut,
    chaineCname: m.cname,
    a: m.a.map((x) => x.adresse),
    aaaa: m.aaaa.map((x) => x.adresse),
    zone: null,
    ns: [],
    adressesNs: {},
  };
}

const parTexte = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The IPtoASN range of an address, written « first–last » (stable, unlike a CDN's addresses). */
function plageDe(adresse: string, contexte: ContexteV1): { as: number; plage: string; description: string } | null {
  const ligne = contexte.iptoasn.chercher(adresse);
  if (!ligne) return null;
  const ecrire = (v: bigint, famille: 4 | 6) =>
    famille === 4
      ? [24n, 16n, 8n, 0n].map((d) => String((v >> d) & 255n)).join(".")
      : Array.from({ length: 8 }, (_, i) => ((v >> BigInt(112 - 16 * i)) & 0xffffn).toString(16)).join(":");
  const famille = adresseEnEntier(adresse).famille;
  return {
    as: ligne.asn,
    plage: `${ecrire(ligne.debut, famille)}-${ecrire(ligne.fin, famille)}`,
    description: ligne.description,
  };
}

function exploitants(c: Classement): Exploitant[] {
  return c.servants
    .map((s) => ({
      role: s.role,
      societe: s.chaine.societe?.cle ?? null,
      nom: s.chaine.societe?.nom ?? null,
      pays: s.chaine.societe?.pays ?? null,
      mere: s.chaine.mere?.cle ?? null,
      paysMere: s.chaine.mere?.pays ?? null,
      categorie: s.chaine.categorie,
      preuve: s.preuve,
      niveau: s.niveau,
    }))
    .sort((x, y) => parTexte(`${x.societe ?? ""}${x.preuve}`, `${y.societe ?? ""}${y.preuve}`));
}

/** The addresses layer of one name, with the control resolver's answer when it was asked. */
export function coucheAdresses(
  m: MesureNom,
  controle: { resolveur: string; mesure: MesureNom } | null,
  perimetre: Perimetre,
  contexte: ContexteV1,
  heure: string,
): CoucheAdresses {
  const c = classer(
    observationDe(m, "knot", heure),
    controle === null ? null : observationDe(controle.mesure, controle.resolveur, heure),
    perimetre,
    contexte,
  );
  const reseaux = new Map<string, Reseau>();
  for (const adresse of [...m.a, ...m.aaaa].map((x) => x.adresse)) {
    // Only IPtoASN's AS and range are kept; RIS never gives a value (brief F.3).
    const p = plageDe(adresse, contexte);
    for (const as of p ? [p.as] : []) {
      const cle = `${as} ${p?.plage ?? ""}`;
      if (!reseaux.has(cle)) {
        reseaux.set(cle, {
          as,
          plage: p?.plage ?? null,
          descriptionAs: p?.description ?? null,
          paysEnregistrement: contexte.paysAs.get(as) ?? null,
        });
      }
    }
  }
  return {
    etat: m.etat,
    cname: m.cname,
    dnssec: m.ad,
    reseaux: [...reseaux.values()].sort((x, y) => x.as - y.as || parTexte(x.plage ?? "", y.plage ?? "")),
    cdn: c.cdn ? { id: c.cdn.id, methode: c.cdn.methode, niveau: c.cdn.niveau } : null,
    exploitants: exploitants(c),
    categorie: c.categorie,
    horsUE: c.horsUE,
    niveau: c.niveau,
    controle: c.controle,
  };
}

export type CoucheHotes = {
  hotes: { hote: string; couche: CoucheAdresses }[];
  categorie: Categorie;
  /** At least one host depends on a company whose ultimate parent is outside the EU; null when undetermined. */
  horsUE: boolean | null;
  niveau: Niveau;
};

const ORDRE: Categorie[] = ["France", "UE hors France", "Europe hors UE", "hors d'Europe"];

/** A domain's name servers or mail exchangers: each host classified, then the farthest category wins (methode § 6). */
export function coucheHotes(
  hotes: readonly string[],
  mesures: ReadonlyMap<string, MesureNom>,
  controles: ReadonlyMap<string, { resolveur: string; mesure: MesureNom }>,
  perimetre: Perimetre,
  contexte: ContexteV1,
  heure: string,
): CoucheHotes {
  const liste = hotes.flatMap((hote) => {
    const m = mesures.get(hote);
    return m === undefined
      ? []
      : [{ hote, couche: coucheAdresses(m, controles.get(hote) ?? null, perimetre, contexte, heure) }];
  });
  const determines = liste.filter((h) => h.couche.categorie !== "non déterminé");
  const horsUE = liste.filter((h) => h.couche.horsUE === true);
  const categorie =
    determines.length === 0
      ? "non déterminé"
      : determines.map((h) => h.couche.categorie).reduce((a, b) => (ORDRE.indexOf(a) >= ORDRE.indexOf(b) ? a : b));
  if (horsUE.length > 0) {
    const niveau = horsUE.some((h) => h.couche.niveau === "confirmé")
      ? "confirmé"
      : horsUE.some((h) => h.couche.niveau === "probable")
        ? "probable"
        : "non déterminé";
    return { hotes: liste, categorie, horsUE: true, niveau };
  }
  if (liste.length > 0 && liste.every((h) => h.couche.horsUE === false)) {
    return { hotes: liste, categorie, horsUE: false, niveau: niveauMin(...liste.map((h) => h.couche.niveau)) };
  }
  return { hotes: liste, categorie, horsUE: null, niveau: "non déterminé" };
}

export type CoucheSpf = {
  statut: ResultatSpf["statut"];
  inclus: string[];
  /** The AS numbers of the networks allowed to send mail, with their IPtoASN description (« probable »: one source). */
  reseaux: { as: number; descriptionAs: string | null }[];
  /** How many AS the record allows in all (the list keeps the first 50, by number). */
  reseauxTotal: number;
  /** Terms that depend on the sender (macros, exists, ptr), never evaluated: the list is then incomplete. */
  nonEvalues: number;
};

/** The SPF record's networks, reduced to their AS (the first address of each network). */
export function coucheSpf(r: ResultatSpf, contexte: ContexteV1): CoucheSpf {
  const parAs = new Map<number, string | null>();
  for (const { reseau } of r.reseaux) {
    const adresse = reseau.split("/")[0] ?? "";
    const ligne = adresse === "" ? undefined : contexte.iptoasn.chercher(adresse);
    if (ligne && !parAs.has(ligne.asn)) parAs.set(ligne.asn, ligne.description);
  }
  return {
    statut: r.statut,
    inclus: [...r.inclus].sort(),
    reseaux: [...parAs.entries()]
      .map(([as, descriptionAs]) => ({ as, descriptionAs }))
      .sort((x, y) => x.as - y.as)
      .slice(0, 50),
    reseauxTotal: parAs.size,
    nonEvalues: r.nonEvalues.length,
  };
}
