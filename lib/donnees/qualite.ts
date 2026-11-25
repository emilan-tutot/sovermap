// The figures of the Quality page (part D, D.2; plan § 15, point 05): what etat.json publishes about the day's
// collection, checked at the border. A field that is missing or malformed gives null (the page says « non publié »),
// never an error, and every text is bounded: etat.json is an outside input.
import type { EtatPublie } from "./lecture";

export type SourceDuJour = {
  id: string;
  fiche: number | null;
  etat: string;
  date: string | null;
  ageJours: number | null;
};

export type Qualite = {
  date: string;
  /** Days published in a row, this one included. */
  jours: number;
  collecte: { debut: string | null; fin: string | null; dureeMinutes: number | null; pointDeMesure: string | null };
  methode: string | null;
  couverture: {
    nomsDeLaListe: number | null;
    nomsMesures: number | null;
    pourcent: number | null;
    domaines: number | null;
    domainesEtat: number | null;
  };
  echecs: {
    noms: number | null;
    pourcent: number | null;
    parCode: Record<string, number>;
    pannesConfirmees: number | null;
    pannesPourcent: number | null;
    /** The share of domains whose failure the control resolver did not confirm: what the guard measures (under 2 %). */
    nonConfirmesPourcent: number | null;
  };
  temoinsConcordants: boolean | null;
  regleInterne: {
    texte: string | null;
    noms: number | null;
    etat: string | null;
    controle: { date: string | null; poses: number | null; codes: Record<string, number> } | null;
  } | null;
  debit: { secondes: number | null; secondesAuDela: number | null; pourcent: number | null; max: number | null } | null;
  sources: SourceDuJour[];
};

const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const champ = (o: Record<string, unknown> | null, cle: string): unknown =>
  o !== null && Object.hasOwn(o, cle) ? o[cle] : undefined;
const nombre = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const texte = (v: unknown, max = 200): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
const dateIso = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
/** A table of counts by code (failures, the control's answers): only bounded keys and counts. */
const comptes = (v: unknown): Record<string, number> => {
  const o = objet(v);
  const r: Record<string, number> = Object.create(null) as Record<string, number>;
  if (o === null) return r;
  for (const [cle, n] of Object.entries(o).slice(0, 30)) {
    if (/^[A-Za-z_]{1,30}$/.test(cle) && nombre(n) !== null) r[cle] = n as number;
  }
  return r;
};

/** The Quality page's figures, from the published state. */
export function qualiteDe(etat: EtatPublie): Qualite {
  const brut = etat.brut;
  const collecte = objet(champ(brut, "collecte"));
  const q = objet(champ(brut, "qualite"));
  const regles = objet(champ(objet(champ(brut, "versions")), "regles"));
  const regle = objet(champ(q, "regleSousZoneInterne"));
  const controle = objet(champ(regle, "controle"));
  const debit = objet(champ(q, "debitMaxParServeur"));
  const sources = champ(brut, "sources");
  return {
    date: etat.date,
    jours: etat.jours,
    collecte: {
      debut: dateIso(champ(collecte, "debut")),
      fin: dateIso(champ(collecte, "fin")),
      dureeMinutes: nombre(champ(collecte, "dureeMinutes")),
      pointDeMesure: texte(champ(collecte, "pointDeMesure")),
    },
    methode: texte(champ(regles, "methode"), 20),
    couverture: {
      nomsDeLaListe: nombre(champ(q, "nomsDeLaListe")),
      nomsMesures: nombre(champ(q, "nomsMesures")),
      pourcent: nombre(champ(q, "couverturePourcent")),
      domaines: nombre(champ(q, "domaines")),
      domainesEtat: nombre(champ(q, "domainesEtat")),
    },
    echecs: {
      noms: nombre(champ(q, "echecs")),
      pourcent: nombre(champ(q, "tauxEchecPourcent")),
      parCode: comptes(champ(q, "echecsParCode")),
      pannesConfirmees: nombre(champ(q, "pannesConfirmees")),
      pannesPourcent: nombre(champ(q, "pannesConfirmeesPourcent")),
      nonConfirmesPourcent: nombre(champ(q, "tauxEchecNonConfirmesPourcent")),
    },
    temoinsConcordants: ((t) => (typeof t === "boolean" ? t : null))(champ(objet(champ(q, "temoins")), "concordants")),
    regleInterne:
      regle === null
        ? null
        : {
            texte: texte(champ(regle, "texte"), 300),
            noms: nombre(champ(regle, "noms")),
            etat: texte(champ(regle, "etat"), 40),
            controle:
              controle === null
                ? null
                : {
                    date: dateIso(champ(controle, "date")),
                    poses: nombre(champ(controle, "poses")),
                    codes: comptes(champ(controle, "codes")),
                  },
          },
    debit:
      debit === null
        ? null
        : {
            secondes: nombre(champ(debit, "secondes")),
            secondesAuDela: nombre(champ(debit, "secondesAuDela")),
            pourcent: nombre(champ(debit, "partAuDelaPourcent")),
            max: nombre(champ(debit, "max")),
          },
    sources: (Array.isArray(sources) ? sources : []).slice(0, 50).flatMap((s): SourceDuJour[] => {
      const o = objet(s);
      const id = texte(champ(o, "id"), 60);
      const etatSource = texte(champ(o, "etat"), 40);
      if (id === null || etatSource === null) return [];
      const fiche = nombre(champ(o, "fiche"));
      return [
        {
          id,
          fiche: fiche !== null && Number.isInteger(fiche) ? fiche : null,
          etat: etatSource,
          date: dateIso(champ(o, "date")),
          ageJours: nombre(champ(o, "ageJours")),
        },
      ];
    }),
  };
}
