// Names of the reference list: internal or technical names (excluded, docs/methode.md § 3), registrable domain and web
// name (decision D1, b2).

/** Second-level suffixes under which names are registered (a short list, enough for the public-sector list). */
const SUFFIXES_DE_DEUXIEME_NIVEAU = new Set([
  "gouv.fr",
  "asso.fr",
  "com.fr",
  "tm.fr",
  "nom.fr",
  "presse.fr",
  "prd.fr",
  "cci.fr",
  "notaires.fr",
  "port.fr",
  "avocat.fr",
  "gouv.nc",
  "gouv.pf",
  "gov.pf",
  "com.pf",
  "co.uk",
  "gov.uk",
  "org.uk",
  "ac.uk",
]);

export function normaliser(name: string): string {
  return name.trim().toLowerCase().replace(/\.$/, "");
}

/** The registrable domain of a name: `www.impots.gouv.fr` → `impots.gouv.fr`, `www.paris.fr` → `paris.fr`. */
export function domaineEnregistre(name: string): string {
  const labels = normaliser(name).split(".");
  const k = labels.length >= 3 && SUFFIXES_DE_DEUXIEME_NIVEAU.has(labels.slice(-2).join(".")) ? 3 : 2;
  return labels.slice(-k).join(".");
}

const ZONES_INTERNES = ["rie.gouv.fr"];
const ENVIRONNEMENTS = new Set([
  "preprod",
  "preproduction",
  "pprd",
  "ppd",
  "recette",
  "rec",
  "staging",
  "test",
  "tests",
  "testing",
  "dev",
  "devel",
  "develop",
  "development",
  "qualif",
  "qualification",
  "integration",
  "sandbox",
  "demo",
  "review",
  "preview",
  "uat",
  "isoprod",
  "k8sdev",
]);
const OUTILS = new Set([
  "rancher",
  "traefik",
  "portainer",
  "grafana",
  "kibana",
  "prometheus",
  "metabase",
  "metrics",
  "hasura",
  "matrix",
  "turn",
  "jenkins",
  "gitlab",
  "sentry",
  "argocd",
  "vault",
  "intra",
  "intranet",
  "extranet",
  "admin",
  "webmail",
  "mail",
  "smtp",
  "imap",
  "pop",
  "mx",
  "autodiscover",
  "lyncdiscover",
  "sip",
  "vpn",
]);

export type RaisonExclusion = "zone interne" | "environnement" | "outil technique" | "sous-zone interne";

/**
 * The rules that can be set aside: the fourth (the owner's decision of 21/11/2026, point 04) is suspended when one of
 * its names answers from outside (pipeline/regle-interne.ts): its names then come back into the measurement.
 */
export type ReglesExclusion = { sousZoneInterne: boolean };
export const REGLES_EXCLUSION: ReglesExclusion = { sousZoneInterne: true };

/**
 * Why a name is internal or technical (never measured, never shown), or null for a public name. `registrable` is its
 * registrable domain (the Public Suffix List's, in the collection; the short list of this file by default).
 */
export function raisonExclusion(
  name: string,
  registrable = domaineEnregistre(name),
  regles: ReglesExclusion = REGLES_EXCLUSION,
): RaisonExclusion | null {
  const n = normaliser(name);
  if (ZONES_INTERNES.some((zone) => n === zone || n.endsWith(`.${zone}`))) return "zone interne";
  const sousDomaine = n === registrable ? [] : n.slice(0, -(registrable.length + 1)).split(".");
  const morceaux = sousDomaine.flatMap((label) => label.split(/[-_]/));
  if (morceaux.some((m) => ENVIRONNEMENTS.has(m))) return "environnement";
  const premier = sousDomaine[0]?.split(/[-_0-9]/)[0] ?? "";
  if (premier !== "" && OUTILS.has(premier)) return "outil technique";
  // An inner label « in » (never the first one) marks an internal sub-zone (`x.in.phm.education.gouv.fr`); a first
  // label « in » may be a country's code (`in.ambafrance.org`), and stays.
  if (regles.sousZoneInterne && sousDomaine.slice(1).includes("in")) return "sous-zone interne";
  return null;
}

/** The web name of a domain: `www.` if it is in the list, otherwise the apex (decision D1, b2). */
export function nomWeb(domaine: string, nomsConnus: ReadonlySet<string>): string {
  const d = normaliser(domaine);
  return nomsConnus.has(`www.${d}`) ? `www.${d}` : d;
}
