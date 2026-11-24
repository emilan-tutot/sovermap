// The records of a day (publication.ts), from the reference list, the measurement, the controls and the context of
// classification. The same function builds today's state and yesterday's, classified again with today's rules
// (brief B.7 bis): the list of today gives the units and the perimeter, the observations give the facts.
import { bornerDomaine, bornerNom } from "./borner";
import type { ResultatCollecte } from "./collecte";
import { coucheAdresses, type ContexteV1, coucheHotes, coucheSpf } from "./couches";
import type { MesureNom } from "./mesure";
import type { ListeReference } from "./perimetre";
import { type EnregistrementDomaine, type EnregistrementNom, type Etat, exploitantsDe, hoteDe } from "./publication";
import { DOMAINE, estNomDns, NOM, valider } from "./schemas";

/** Records built in a reduced form: after an error, or because they failed their schema. */
export type RapportConstruction = { erreurs: number; reduits: number };

/**
 * One record, built on its own: an error or a record that fails its schema gives the reduced record instead, counted,
 * and never stops the collection (no measured domain may stop the publication of the others).
 */
function assurer<T>(
  construire: () => T,
  reduit: () => T,
  schema: Parameters<typeof valider>[1],
  rapport: RapportConstruction,
): T {
  let e: T;
  try {
    e = construire();
  } catch {
    rapport.erreurs += 1;
    return reduit();
  }
  if (valider(e, schema).length === 0) return e;
  rapport.reduits += 1;
  return reduit();
}

/** The reduced record, checked too: when even its identity fails its schema, its lists are emptied. */
function reduitValide<T extends { provenances?: string[]; types?: string[]; ministeres?: string[] }>(
  e: T,
  schema: Parameters<typeof valider>[1],
): T {
  if (valider(e, schema).length === 0) return e;
  return {
    ...e,
    ...(e.provenances === undefined ? {} : { provenances: [] }),
    ...(e.types === undefined ? {} : { types: [] }),
    ...(e.ministeres === undefined ? {} : { ministeres: [] }),
  };
}

const INDETERMINE = { categorie: "non déterminé" as const, horsUE: null, niveau: "non déterminé" as const };

export type Mesures = Pick<ResultatCollecte, "noms" | "domaines" | "hotes" | "spf">;

export type Controles = {
  /** The control resolver's answers, by name (web names, the sample, the witnesses, the hosts of the « État »). */
  noms: ReadonlyMap<string, { resolveur: string; mesure: MesureNom }>;
  /** The MX hosts the control resolver saw, by domain (null: its answer failed). */
  mx: ReadonlyMap<string, string[] | null>;
  /** The day of these controls (AAAA-MM-JJ; by default, the day of the state's hour). */
  jour?: string;
  /** The agreements that a name not controlled today may carry, by name (B.6). */
  reports?: ReadonlyMap<string, AccordReporte>;
};

/**
 * An agreement of the control resolver that a name not controlled today may carry (B.6; methode § 5): its last one,
 * while what serves the name is the same (its CDN and the AS numbers of its addresses), and for 40 days at most from
 * that control (a cycle of 33 days, and a week for a control missed); never a disagreement. The agreements travel from
 * day to day in the day's observations (the Actions cache), never in the published state: the day of a control would
 * change the record at each control, and a record kept by the hysteresis would carry a stale day.
 */
export type AccordReporte = { resolveur: string; le: string; servi: string };

/** How long an agreement may be carried, in days from its control. */
export const VALIDITE_ACCORD_JOURS = 40;

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** The days from one day to another (AAAA-MM-JJ); NaN when one of them is not a day. */
function joursEntre(de: string, a: string): number {
  if (!JOUR.test(de) || !JOUR.test(a)) return Number.NaN;
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

/** What serves a name, as an agreement compares it: its CDN and the sorted AS numbers of its addresses. */
function servi(cdn: string | null, reseaux: readonly { as: number }[]): string {
  return `${cdn ?? ""}|${[...new Set(reseaux.map((r) => r.as))].sort((a, b) => a - b).join(",")}`;
}

/**
 * The agreements a day's state lets the next day's names carry (B.6): each name whose control agreed that day (`jour`),
 * or that carried an agreement that day (with the day of its control), and what served it; never a disagreement, nor
 * an agreement on a name that failed or a reduced record.
 */
export function accordsDuJour(etat: Etat, controles: Controles, jour: string): Map<string, AccordReporte> {
  const accords = new Map<string, AccordReporte>();
  for (const [nom, e] of etat.noms) {
    const c = e.controle;
    if (c === null || c.accord !== true || e.etat !== "ok" || e.reduit === true) continue;
    const le = controles.noms.has(nom) ? jour : controles.reports?.get(nom)?.le;
    if (le === undefined || !JOUR.test(le)) continue;
    accords.set(nom, { resolveur: c.resolveur.slice(0, 60), le, servi: servi(e.cdn?.id ?? null, e.reseaux) });
  }
  return accords;
}

/** A day's observations, as the next day reads them (the Actions cache): its day, its facts, its controls. */
export type ObservationsDuJour = { date: string; mesures: Mesures; controles: Controles; pannes: Pannes };

/**
 * Yesterday's state as today classifies it again (B.6, B.7 bis), and the agreements it lets today's names carry:
 * today's rules (`contexte`), but its own day and the agreements it carried, so that it is the state it was. The
 * hysteresis compares today's records with it; null without yesterday's observations.
 */
export function veilleEtAccords(
  liste: ListeReference,
  veille: ObservationsDuJour | null,
  contexte: ContexteV1,
  heure: string,
): { etat: Etat | null; accords: Map<string, AccordReporte> } {
  if (veille === null) return { etat: null, accords: new Map() };
  const controles = { ...veille.controles, jour: veille.date };
  const etat = construireEtat(liste, veille.mesures, controles, contexte, heure, veille.pannes);
  return { etat, accords: accordsDuJour(etat, controles, veille.date) };
}

/** The failures the control resolver confirmed after every attempt (methode § 7): names and zones. */
export type Pannes = { noms: ReadonlySet<string>; zones: ReadonlySet<string>; resolveur: string };

const AUCUNE_PANNE: Pannes = { noms: new Set(), zones: new Set(), resolveur: "quad9" };

export function construireEtat(
  liste: ListeReference,
  mesures: Mesures,
  controles: Controles,
  contexte: ContexteV1,
  heure: string,
  pannes: Pannes = AUCUNE_PANNE,
  rapport: RapportConstruction = { erreurs: 0, reduits: 0 },
): Etat {
  const noms = new Map<string, EnregistrementNom>();
  const jour = controles.jour ?? heure.slice(0, 10);
  for (const entree of [...liste.noms.values()].sort((a, b) => (a.nom < b.nom ? -1 : 1))) {
    const m = mesures.noms.get(entree.nom);
    const domaine = liste.domaines.get(entree.domaine);
    if (m === undefined || domaine === undefined) continue;
    const echec =
      m.etat === "echec"
        ? { code: m.echec ?? "ERREUR", confirmePar: pannes.noms.has(entree.nom) ? pannes.resolveur : null }
        : null;
    const reduit = (): EnregistrementNom => ({
      nom: entree.nom,
      domaine: entree.domaine,
      provenances: entree.provenances.slice(0, 20).map((p) => p.slice(0, 120)),
      types: entree.types.slice(0, 20).map((x) => x.slice(0, 80)),
      etat: m.etat,
      echec,
      cname: [],
      dnssec: false,
      familleEnEchec: m.echecFamille?.famille ?? null,
      reseaux: [],
      cdn: null,
      exploitants: [],
      ...INDETERMINE,
      controle: null,
      reduit: true,
    });
    const construire = () => {
      const duJour = controles.noms.get(entree.nom) ?? null;
      let c = coucheAdresses(m, duJour, domaine.perimetre, contexte, heure);
      let controle = c.controle;
      const report = duJour === null ? controles.reports?.get(entree.nom) : undefined;
      const age = report === undefined ? Number.NaN : joursEntre(report.le, jour);
      if (
        report !== undefined &&
        c.etat === "ok" &&
        servi(c.cdn?.id ?? null, c.reseaux) === report.servi &&
        age >= 0 &&
        age <= VALIDITE_ACCORD_JOURS
      ) {
        // Its last control agreed, and what serves the name has not changed since: that agreement still holds, and the
        // name is classified as if the control resolver had answered the same today (methode § 5).
        c = coucheAdresses(m, { resolveur: report.resolveur, mesure: m }, domaine.perimetre, contexte, heure);
        controle = { resolveur: report.resolveur, accord: true };
      }
      return bornerNom({
        nom: entree.nom,
        domaine: entree.domaine,
        provenances: entree.provenances,
        types: entree.types,
        etat: c.etat,
        echec,
        cname: c.cname,
        dnssec: c.dnssec,
        familleEnEchec: m.echecFamille?.famille ?? null,
        // Behind a CDN, the addresses turn every day: its networks are kept by their AS only, never by a range (B.6).
        reseaux:
          c.cdn === null
            ? c.reseaux.map((r) => ({ as: r.as, plage: r.plage }))
            : [...new Set(c.reseaux.map((r) => r.as))].map((as) => ({ as, plage: null })),
        cdn: c.cdn ? { id: c.cdn.id, methode: c.cdn.methode } : null,
        exploitants: exploitantsDe(c),
        categorie: c.categorie,
        horsUE: c.horsUE,
        niveau: c.niveau,
        controle,
      });
    };
    noms.set(
      entree.nom,
      assurer(construire, () => reduitValide(reduit(), NOM), NOM, rapport),
    );
  }
  const domaines = new Map<string, EnregistrementDomaine>();
  for (const d of [...liste.domaines.values()].sort((a, b) => (a.domaine < b.domaine ? -1 : 1))) {
    const z = mesures.domaines.get(d.domaine);
    if (z === undefined) continue;
    const echecZone =
      z.etat === "echec"
        ? { code: z.echec ?? "ERREUR", confirmePar: pannes.zones.has(d.domaine) ? pannes.resolveur : null }
        : null;
    const reduit = (): EnregistrementDomaine => ({
      domaine: d.domaine,
      nomWeb: d.nomWeb,
      perimetre: d.perimetre,
      raisons: d.raisons,
      plateforme: d.plateforme,
      organismes: d.organismes.length,
      ministeres: d.ministeres.slice(0, 50),
      noms: d.noms.length,
      zone: { etat: z.etat, echec: echecZone, ns: [], soa: null, ds: null, caa: null },
      serveursDeNoms: { hotes: [], ...INDETERMINE },
      messagerie: { etat: z.mxEtat, mx: [], hotes: [], ...INDETERMINE, spf: null },
      reduit: true,
    });
    const construire = () => {
      const ns = coucheHotes(z.ns, mesures.hotes, controles.noms, d.perimetre, contexte, heure);
      const mx = coucheHotes(
        z.mx.map((m) => m.hote),
        mesures.hotes,
        controles.noms,
        d.perimetre,
        contexte,
        heure,
      );
      // The control resolver saw other mail exchangers: the disagreement is shown, never settled (methode § 5).
      const vusParControle = controles.mx.get(d.domaine);
      const desaccordMx =
        vusParControle !== undefined &&
        vusParControle !== null &&
        vusParControle.join(",") !== [...new Set(z.mx.map((m) => m.hote))].sort().join(",");
      const spf = mesures.spf.get(d.domaine);
      return bornerDomaine({
        domaine: d.domaine,
        nomWeb: d.nomWeb,
        perimetre: d.perimetre,
        raisons: d.raisons,
        plateforme: d.plateforme,
        organismes: d.organismes.length,
        ministeres: d.ministeres,
        noms: d.noms.length,
        zone: {
          etat: z.etat,
          echec: echecZone,
          ns: z.ns,
          // The SOA's primary, published only when it reads as a DNS name (it is read from the DNS: a datum, never markup).
          soa: z.soa !== null && estNomDns(z.soa.mname) ? z.soa.mname : null,
          // DNSSEC: the zone's answers validated by the resolver (its DS at its parent, a sound chain).
          ds: z.etat === "ok" ? z.ad : z.etat === "echec" ? null : false,
          caa: z.echecs.includes("CAA") ? null : z.caa,
        },
        serveursDeNoms: { hotes: ns.hotes.map(hoteDe), categorie: ns.categorie, horsUE: ns.horsUE, niveau: ns.niveau },
        messagerie: {
          etat: z.mxEtat,
          mx: z.mx,
          hotes: mx.hotes.map(hoteDe),
          categorie: mx.categorie,
          horsUE: mx.horsUE,
          niveau: desaccordMx ? "non déterminé" : mx.niveau,
          spf: z.echecs.includes("TXT")
            ? { statut: "echec", inclus: [], reseaux: [], reseauxTotal: 0, nonEvalues: 0 }
            : spf === undefined
              ? null
              : coucheSpf(spf, contexte),
        },
      });
    };
    domaines.set(
      d.domaine,
      assurer(construire, () => reduitValide(reduit(), DOMAINE), DOMAINE, rapport),
    );
  }
  return { noms, domaines };
}
