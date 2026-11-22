// Classification of one domain (docs/methode.md § 5 and § 6, decision D1 modified by C2-4 in method 0.3): who serves
// it (« diffusé par » / « hébergé par »), the country category of their ultimate parents, the confidence, and whether it
// depends on a company whose own seat, or whose ultimate parent's, is outside the EU.
import { detecterCdn, type DetectionCdn, type PlagesOfficielles, type ReferentielCdn } from "./cdn";
import type { ObservationDns } from "./dns";
import { coucheReseau, type CoucheReseau, type TableIpToAsn, type TableRis } from "./reseau";
import {
  categorie as categorieDuPays,
  siegeRetenu,
  chaineDepuisAs,
  chaineDepuisSociete,
  type ChaineSociete,
  type ReferentielAs,
  type ReferentielSocietes,
} from "./societes";
import { type Categorie, type DnsStatus, type Niveau, niveauMin, ORDRE_NIVEAU } from "./types";

export type Perimetre = "État" | "hors État";

export type Contexte = {
  iptoasn: TableIpToAsn;
  ris: TableRis;
  cdn: ReferentielCdn;
  plages: PlagesOfficielles;
  tableAs: ReferentielAs;
  societes: ReferentielSocietes;
  /** The network layer of one address (coucheReseau by default; the collection v1 passes the version it may publish). */
  coucheReseau?: typeof coucheReseau;
};

export type Servant = {
  role: "diffusé par" | "hébergé par";
  chaine: ChaineSociete;
  preuve: string;
  /** The whole chain's level: the address layer, the link to the company, the company and its parents. */
  niveau: Niveau;
  /**
   * The level of « this company serves the site, and has its seat there »: the address layer, the link to the company
   * (the CDN, or the AS) and the company's own sources, without its parents: what rule C2-4 needs when the company
   * alone is outside the EU.
   */
  niveauSociete: Niveau;
};

export type Classement = {
  nom: string;
  perimetre: Perimetre;
  statut: DnsStatus;
  cdn: DetectionCdn | null;
  reseau: CoucheReseau[];
  servants: Servant[];
  hebergePar: "non observable" | "voir les sociétés";
  controle: { resolveur: string; accord: boolean } | null;
  categorie: Categorie;
  horsUE: boolean | null;
  niveau: Niveau;
};

const ORDRE_CATEGORIE: readonly Categorie[] = ["France", "UE hors France", "Europe hors UE", "hors d'Europe"];
const HORS_UE = new Set<Categorie>(["Europe hors UE", "hors d'Europe"]);
/** A servant's category: the farther of its company's seat and its ultimate parent's (ARRÊT 2, plan § 15). */
export const categorieDuServant = (s: Pick<Servant, "chaine">): Categorie =>
  s.chaine.societe === null
    ? s.chaine.categorie
    : siegeRetenu(s.chaine.societe.pays, s.chaine.mere?.pays ?? null).categorie;

const niveauMax = (niveaux: Niveau[]): Niveau =>
  niveaux.reduce<Niveau>((a, b) => (ORDRE_NIVEAU.indexOf(a) >= ORDRE_NIVEAU.indexOf(b) ? a : b), "non déterminé");

/** The companies that serve the addresses of one observation (the CDN if there is one). */
function servants(
  observation: ObservationDns,
  contexte: Contexte,
): { cdn: DetectionCdn | null; reseau: CoucheReseau[]; servants: Servant[] } {
  const adresses = [...observation.a, ...observation.aaaa];
  const reseau = adresses.map((a) => (contexte.coucheReseau ?? coucheReseau)(a, contexte.iptoasn, contexte.ris));
  const asns = [...new Set(reseau.flatMap((r) => r.asns))];
  const cdn = detecterCdn(observation.chaineCname, adresses, asns, contexte.cdn, contexte.plages);
  if (cdn) {
    const chaine = chaineDepuisSociete(cdn.societe, contexte.societes);
    return {
      cdn,
      reseau,
      servants: [
        {
          role: "diffusé par",
          chaine,
          preuve: cdn.preuve,
          niveau: niveauMin(chaine.niveau, cdn.niveau),
          niveauSociete: niveauMin(chaine.niveauSociete, cdn.niveau),
        },
      ],
    };
  }
  const parSociete = new Map<string, Servant>();
  for (const couche of reseau) {
    for (const asn of couche.asns) {
      const chaine = chaineDepuisAs(asn, contexte.tableAs, contexte.societes);
      const cle = chaine.societe?.cle ?? `AS${asn}`;
      const niveau = niveauMin(chaine.niveau, couche.niveau);
      const niveauSociete = niveauMin(chaine.niveauSociete, chaine.niveauAs, couche.niveau);
      const existant = parSociete.get(cle);
      // The weakest of each level over the company's addresses, whatever their order (the entry kept is the weakest).
      const plusFaible = !existant || ORDRE_NIVEAU.indexOf(niveau) < ORDRE_NIVEAU.indexOf(existant.niveau);
      const garde: Omit<Servant, "niveauSociete"> =
        plusFaible || !existant ? { role: "hébergé par", chaine, preuve: `AS${asn}`, niveau } : existant;
      parSociete.set(cle, {
        ...garde,
        niveauSociete: existant ? niveauMin(existant.niveauSociete, niveauSociete) : niveauSociete,
      });
    }
  }
  return { cdn: null, reseau, servants: [...parSociete.values()] };
}

const empreinte = (liste: Servant[]) =>
  liste
    .map((s) => s.chaine.societe?.cle ?? s.preuve)
    .sort()
    .join("|");

/** Classifies one domain from its main observation and, when available, the control resolver's observation. */
export function classer(
  principale: ObservationDns,
  controle: ObservationDns | null,
  perimetre: Perimetre,
  contexte: Contexte,
): Classement {
  const vide: Classement = {
    nom: principale.nom,
    perimetre,
    statut: principale.statut,
    cdn: null,
    reseau: [],
    servants: [],
    hebergePar: "voir les sociétés",
    controle: null,
    categorie: "non déterminé",
    horsUE: null,
    niveau: "non déterminé",
  };
  if (principale.statut !== "NOERROR") return vide;
  const base = servants(principale, contexte);

  // The address layer is « confirmé » only when the control resolver sees the same serving companies.
  let niveauControle: Niveau = "probable";
  let accord: { resolveur: string; accord: boolean } | null = null;
  if (controle !== null && controle.statut === "NOERROR") {
    const autre = servants(controle, contexte);
    const ok = empreinte(autre.servants) === empreinte(base.servants);
    accord = { resolveur: controle.resolveur, accord: ok };
    niveauControle = ok ? "confirmé" : "non déterminé";
  }
  const liste = base.servants.map((s) => ({
    ...s,
    niveau: niveauMin(s.niveau, niveauControle),
    niveauSociete: niveauMin(s.niveauSociete, niveauControle),
  }));

  const determines = liste.filter((s) => categorieDuServant(s) !== "non déterminé");
  // Rule C2-4 (method 0.3; plan § 15): a servant puts the site outside the EU when its ultimate parent's seat is, or
  // its own is (the Imperva case: an American subsidiary of a French group). Either proof is enough, so the servant
  // takes the best of the levels of its proofs: the whole chain for the parent's seat; the address layer, the link to
  // the company and the company's own sources for its own seat.
  const horsUE = liste.flatMap((s): Niveau[] => {
    const preuves: Niveau[] = [];
    if (HORS_UE.has(s.chaine.categorie)) preuves.push(s.niveau);
    if (s.chaine.societe !== null && HORS_UE.has(categorieDuPays(s.chaine.societe.pays))) preuves.push(s.niveauSociete);
    return preuves.length === 0 ? [] : [niveauMax(preuves)];
  });
  const categorie =
    determines.length === 0
      ? "non déterminé"
      : determines
          .map(categorieDuServant)
          .reduce((a, b) => (ORDRE_CATEGORIE.indexOf(a) >= ORDRE_CATEGORIE.indexOf(b) ? a : b));

  let estHorsUE: boolean | null;
  let niveau: Niveau;
  if (horsUE.length > 0) {
    estHorsUE = true;
    niveau = niveauMax(horsUE);
  } else if (liste.length > 0 && determines.length === liste.length) {
    estHorsUE = false;
    niveau = niveauMin(...liste.map((s) => s.niveau));
  } else {
    estHorsUE = null;
    niveau = "non déterminé";
  }
  return {
    ...vide,
    cdn: base.cdn,
    reseau: base.reseau,
    servants: liste,
    hebergePar: base.cdn ? "non observable" : "voir les sociétés",
    controle: accord,
    categorie,
    horsUE: estHorsUE,
    niveau,
  };
}

export type ChiffreTitre = {
  domaines: number;
  horsUEConfirme: number;
  horsUEProbable: number;
  nonDetermine: number;
  /** « au moins X % » : only the « confirmé » counts. */
  auMoinsPourcent: number;
  probablePourcent: number;
  nonDeterminePourcent: number;
};

/** The headline figure (decision D1) over the domains of the « État » perimeter that answer. */
export function chiffreTitre(
  resultats: readonly Classement[],
  filtre: (c: Classement) => boolean = () => true,
): ChiffreTitre {
  const repondent = resultats.filter((r) => r.perimetre === "État" && r.statut === "NOERROR" && filtre(r));
  const n = repondent.length;
  const horsUEConfirme = repondent.filter((r) => r.horsUE === true && r.niveau === "confirmé").length;
  const horsUEProbable = repondent.filter((r) => r.horsUE === true && r.niveau === "probable").length;
  const nonDetermine = repondent.filter((r) => r.horsUE === null || r.niveau === "non déterminé").length;
  const pourcent = (x: number) => (n === 0 ? 0 : Math.round((1000 * x) / n) / 10);
  return {
    domaines: n,
    horsUEConfirme,
    horsUEProbable,
    nonDetermine,
    auMoinsPourcent: pourcent(horsUEConfirme),
    probablePourcent: pourcent(horsUEProbable),
    nonDeterminePourcent: pourcent(nonDetermine),
  };
}
