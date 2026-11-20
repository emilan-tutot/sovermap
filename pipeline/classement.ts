// Classification of one domain (docs/methode.md § 5 and § 6, decision D1): who serves it (« diffusé par » / « hébergé
// par »), the country category of their ultimate parents, the confidence, and whether it depends on a company whose
// ultimate parent is outside the EU.
import { detecterCdn, type DetectionCdn, type PlagesOfficielles, type ReferentielCdn } from "./cdn";
import type { ObservationDns } from "./dns";
import { coucheReseau, type CoucheReseau, type TableIpToAsn, type TableRis } from "./reseau";
import {
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
};

export type Servant = { role: "diffusé par" | "hébergé par"; chaine: ChaineSociete; preuve: string; niveau: Niveau };

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
const niveauMax = (niveaux: Niveau[]): Niveau =>
  niveaux.reduce<Niveau>((a, b) => (ORDRE_NIVEAU.indexOf(a) >= ORDRE_NIVEAU.indexOf(b) ? a : b), "non déterminé");

/** The companies that serve the addresses of one observation (the CDN if there is one). */
function servants(
  observation: ObservationDns,
  contexte: Contexte,
): { cdn: DetectionCdn | null; reseau: CoucheReseau[]; servants: Servant[] } {
  const adresses = [...observation.a, ...observation.aaaa];
  const reseau = adresses.map((a) => coucheReseau(a, contexte.iptoasn, contexte.ris));
  const asns = [...new Set(reseau.flatMap((r) => r.asns))];
  const cdn = detecterCdn(observation.chaineCname, adresses, asns, contexte.cdn, contexte.plages);
  if (cdn) {
    const chaine = chaineDepuisSociete(cdn.societe, contexte.societes);
    return {
      cdn,
      reseau,
      servants: [{ role: "diffusé par", chaine, preuve: cdn.preuve, niveau: niveauMin(chaine.niveau, cdn.niveau) }],
    };
  }
  const parSociete = new Map<string, Servant>();
  for (const couche of reseau) {
    for (const asn of couche.asns) {
      const chaine = chaineDepuisAs(asn, contexte.tableAs, contexte.societes);
      const cle = chaine.societe?.cle ?? `AS${asn}`;
      const niveau = niveauMin(chaine.niveau, couche.niveau);
      const existant = parSociete.get(cle);
      if (!existant || ORDRE_NIVEAU.indexOf(niveau) < ORDRE_NIVEAU.indexOf(existant.niveau)) {
        parSociete.set(cle, { role: "hébergé par", chaine, preuve: `AS${asn}`, niveau });
      }
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
  const liste = base.servants.map((s) => ({ ...s, niveau: niveauMin(s.niveau, niveauControle) }));

  const determines = liste.filter((s) => s.chaine.categorie !== "non déterminé");
  const horsUE = liste.filter((s) => HORS_UE.has(s.chaine.categorie));
  const categorie =
    determines.length === 0
      ? "non déterminé"
      : determines
          .map((s) => s.chaine.categorie)
          .reduce((a, b) => (ORDRE_CATEGORIE.indexOf(a) >= ORDRE_CATEGORIE.indexOf(b) ? a : b));

  let estHorsUE: boolean | null;
  let niveau: Niveau;
  if (horsUE.length > 0) {
    estHorsUE = true;
    niveau = niveauMax(horsUE.map((s) => s.niveau));
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
