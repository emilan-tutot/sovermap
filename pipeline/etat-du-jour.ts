// The records of a day (publication.ts), from the reference list, the measurement, the controls and the context of
// classification. The same function builds today's state and yesterday's, classified again with today's rules
// (brief B.7 bis): the list of today gives the units and the perimeter, the observations give the facts.
import { bornerDomaine, bornerNom } from "./borner";
import type { ResultatCollecte } from "./collecte";
import { coucheAdresses, type ContexteV1, coucheHotes, coucheSpf } from "./couches";
import type { MesureNom } from "./mesure";
import type { ListeReference } from "./perimetre";
import { type EnregistrementDomaine, type EnregistrementNom, type Etat, exploitantsDe, hoteDe } from "./publication";

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
): Etat {
  const noms = new Map<string, EnregistrementNom>();
  for (const entree of [...liste.noms.values()].sort((a, b) => (a.nom < b.nom ? -1 : 1))) {
    const m = mesures.noms.get(entree.nom);
    const domaine = liste.domaines.get(entree.domaine);
    if (m === undefined || domaine === undefined) continue;
    const c = coucheAdresses(m, controles.noms.get(entree.nom) ?? null, domaine.perimetre, contexte, heure);
    noms.set(
      entree.nom,
      bornerNom({
        nom: entree.nom,
        domaine: entree.domaine,
        provenances: entree.provenances,
        types: entree.types,
        etat: c.etat,
        echec:
          m.etat === "echec"
            ? { code: m.echec ?? "ERREUR", confirmePar: pannes.noms.has(entree.nom) ? pannes.resolveur : null }
            : null,
        cname: c.cname,
        dnssec: c.dnssec,
        reseaux: c.reseaux.map((r) => ({ as: r.as, plage: r.plage })),
        cdn: c.cdn ? { id: c.cdn.id, methode: c.cdn.methode } : null,
        exploitants: exploitantsDe(c),
        categorie: c.categorie,
        horsUE: c.horsUE,
        niveau: c.niveau,
        controle: c.controle,
      }),
    );
  }
  const domaines = new Map<string, EnregistrementDomaine>();
  for (const d of [...liste.domaines.values()].sort((a, b) => (a.domaine < b.domaine ? -1 : 1))) {
    const z = mesures.domaines.get(d.domaine);
    if (z === undefined) continue;
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
    domaines.set(
      d.domaine,
      bornerDomaine({
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
          echec:
            z.etat === "echec"
              ? { code: z.echec ?? "ERREUR", confirmePar: pannes.zones.has(d.domaine) ? pannes.resolveur : null }
              : null,
          ns: z.ns,
          soa: z.soa?.mname ?? null,
          ds: z.ds.length > 0,
          caa: z.caa,
        },
        serveursDeNoms: { hotes: ns.hotes.map(hoteDe), categorie: ns.categorie, horsUE: ns.horsUE, niveau: ns.niveau },
        messagerie: {
          etat: z.mxEtat,
          mx: z.mx,
          hotes: mx.hotes.map(hoteDe),
          categorie: mx.categorie,
          horsUE: mx.horsUE,
          niveau: desaccordMx ? "non déterminé" : mx.niveau,
          spf: spf === undefined ? null : coucheSpf(spf, contexte),
        },
      }),
    );
  }
  return { noms, domaines };
}
