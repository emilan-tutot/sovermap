// The cross-check of the published data by an independent path (brief C.9): 30 domains drawn at random by strata,
// with a written seed (the day of the state), then each layer asked again elsewhere and compared. Pure: the draw, the
// comparisons and the report; pipeline/cli/contre-verifier.ts asks the questions (another resolver, RIPEstat and Team
// Cymru, kept for control only, and the registries).
import { generateur, melanger } from "./politesse";
import type { EnregistrementDomaine, EnregistrementNom } from "./publication";

export type Strate = "État" | "opérateur" | "collectivité" | "CDN" | "messagerie";

/** The strata, in the order of the draw (a domain is drawn once, in the first stratum that takes it). */
export const STRATES: readonly { strate: Strate; nombre: number }[] = [
  { strate: "État", nombre: 10 },
  { strate: "opérateur", nombre: 5 },
  { strate: "collectivité", nombre: 5 },
  { strate: "CDN", nombre: 5 },
  { strate: "messagerie", nombre: 5 },
];

/** The types of the DINUM's list that are local authorities. */
const COLLECTIVITES = new Set(["Commune", "EPCI", "Collectivité", "Conseil départemental", "Conseil régional"]);

export type Tire = { strate: Strate; domaine: EnregistrementDomaine; web: EnregistrementNom };

/**
 * An operator of the State: its domain is in the « État » perimeter by the SIG's or the MESR's lists when the state has
 * them, else by the DILA's Référentiel only (not under gouv.fr).
 */
const operateur = (d: EnregistrementDomaine, avecListesOperateurs: boolean) =>
  d.perimetre === "État" &&
  (avecListesOperateurs
    ? d.raisons.some((r) => r === "sig" || r === "mesr")
    : d.raisons.includes("dila") && !d.raisons.includes("gouv.fr"));

/** Whether a domain belongs to a stratum; « État » and « opérateur » are apart by definition. */
function dans(
  strate: Strate,
  d: EnregistrementDomaine,
  web: EnregistrementNom,
  noms: readonly EnregistrementNom[],
  avecListesOperateurs: boolean,
): boolean {
  switch (strate) {
    case "État":
      return d.perimetre === "État" && !operateur(d, avecListesOperateurs);
    case "opérateur":
      return operateur(d, avecListesOperateurs);
    case "collectivité":
      return d.perimetre === "hors État" && noms.some((n) => n.types.some((t) => COLLECTIVITES.has(t)));
    case "CDN":
      return web.cdn !== null;
    case "messagerie":
      return d.messagerie.etat === "ok" && d.messagerie.mx.length > 0;
    default: {
      const jamais: never = strate;
      return jamais;
    }
  }
}

/**
 * The draw: in each stratum, in order, the domains measured that day (their web name answered, the record complete),
 * not drawn yet, sorted by name then shuffled with the seed; the first ones are taken.
 */
export function tirer(
  domaines: ReadonlyMap<string, EnregistrementDomaine>,
  noms: ReadonlyMap<string, EnregistrementNom>,
  graine: number,
): Tire[] {
  const nomsDe = new Map<string, EnregistrementNom[]>();
  for (const n of noms.values()) nomsDe.set(n.domaine, [...(nomsDe.get(n.domaine) ?? []), n]);
  const avecListesOperateurs = [...domaines.values()].some((d) => d.raisons.some((r) => r === "sig" || r === "mesr"));
  const aleatoire = generateur(graine);
  const tires: Tire[] = [];
  const pris = new Set<string>();
  for (const { strate, nombre } of STRATES) {
    const candidats: Tire[] = [];
    for (const d of [...domaines.values()].sort((a, b) => (a.domaine < b.domaine ? -1 : 1))) {
      const web = noms.get(d.nomWeb);
      if (pris.has(d.domaine) || d.reduit || web === undefined || web.reduit || web.etat !== "ok") continue;
      if (dans(strate, d, web, nomsDe.get(d.domaine) ?? [], avecListesOperateurs))
        candidats.push({ strate, domaine: d, web });
    }
    for (const t of melanger(candidats, aleatoire).slice(0, nombre)) {
      tires.push(t);
      pris.add(t.domaine.domaine);
    }
  }
  return tires;
}

export type Verdict = "concorde" | "diffère" | "non vérifiable";
export type Controle = { couche: string; verdict: Verdict; publie: string; independant: string; source: string };

const nomPropre = (n: string) => n.toLowerCase().replace(/\.$/, "");
const ensemble = (noms: readonly string[]) => [...new Set(noms.map(nomPropre))].sort();

/**
 * Two lists of names (servers, exchangers, a chain's links): they agree when they hold the same names. A record too
 * large for its fragment keeps the first of its sorted lists only (« tronque », pipeline/borner.ts): its names agree
 * when each of them is found elsewhere (the review of C.9). null: the independent path failed (never « agrees »).
 */
export function comparerNoms(
  publies: readonly string[],
  independants: readonly string[] | null,
  tronque = false,
): Verdict {
  if (independants === null) return "non vérifiable";
  const trouves = ensemble(independants);
  if (tronque) return ensemble(publies).every((n) => trouves.includes(n)) ? "concorde" : "diffère";
  return ensemble(publies).join(" ") === trouves.join(" ") ? "concorde" : "diffère";
}

/**
 * The category of the country of a company's ultimate parent: the published one (index/exploitants.json of the state)
 * against the one found elsewhere. A category the site publishes as « non déterminé » cannot be checked.
 */
export function comparerCategorie(publiee: string | null, trouvee: string | null): Verdict {
  if (publiee === null || publiee === "non déterminé" || trouvee === null || trouvee === "non déterminé") {
    return "non vérifiable";
  }
  return publiee === trouvee ? "concorde" : "diffère";
}

/** The AS of a name's addresses: they agree when every AS found elsewhere is one of the published ones. */
export function comparerAs(publies: readonly number[], independants: readonly number[] | null): Verdict {
  if (independants === null || independants.length === 0) return "non vérifiable";
  return independants.every((a) => publies.includes(a)) ? "concorde" : "diffère";
}

/**
 * The share of the checks that agree, among those that could be made; null when none could. One check per layer and
 * domain (one source for the AS: Team Cymru), and one per company for its ultimate parent, whatever its domains.
 */
export function partConcordante(controles: readonly Controle[]): {
  concordent: number;
  verifies: number;
  part: number | null;
} {
  const verifies = controles.filter((c) => c.verdict !== "non vérifiable");
  const concordent = verifies.filter((c) => c.verdict === "concorde").length;
  return { concordent, verifies: verifies.length, part: verifies.length === 0 ? null : concordent / verifies.length };
}
