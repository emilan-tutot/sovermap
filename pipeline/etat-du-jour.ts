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
};

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
      reseaux: [],
      cdn: null,
      exploitants: [],
      ...INDETERMINE,
      controle: null,
      reduit: true,
    });
    const construire = () => {
      const c = coucheAdresses(m, controles.noms.get(entree.nom) ?? null, domaine.perimetre, contexte, heure);
      return bornerNom({
        nom: entree.nom,
        domaine: entree.domaine,
        provenances: entree.provenances,
        types: entree.types,
        etat: c.etat,
        echec,
        cname: c.cname,
        dnssec: c.dnssec,
        reseaux: c.reseaux.map((r) => ({ as: r.as, plage: r.plage })),
        cdn: c.cdn ? { id: c.cdn.id, methode: c.cdn.methode } : null,
        exploitants: exploitantsDe(c),
        categorie: c.categorie,
        horsUE: c.horsUE,
        niveau: c.niveau,
        controle: c.controle,
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
