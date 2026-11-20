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

export type RaisonExclusion = "zone interne" | "environnement" | "outil technique";

/** Why a name is internal or technical (never measured, never shown), or null for a public name. */
export function raisonExclusion(name: string): RaisonExclusion | null {
  const n = normaliser(name);
  if (ZONES_INTERNES.some((zone) => n === zone || n.endsWith(`.${zone}`))) return "zone interne";
  const registrable = domaineEnregistre(n);
  const sousDomaine = n === registrable ? [] : n.slice(0, -(registrable.length + 1)).split(".");
  const morceaux = sousDomaine.flatMap((label) => label.split(/[-_]/));
  if (morceaux.some((m) => ENVIRONNEMENTS.has(m))) return "environnement";
  const premier = sousDomaine[0]?.split(/[-_0-9]/)[0] ?? "";
  if (premier !== "" && OUTILS.has(premier)) return "outil technique";
  return null;
}

/** The web name of a domain: `www.` if it is in the list, otherwise the apex (decision D1, b2). */
export function nomWeb(domaine: string, nomsConnus: ReadonlySet<string>): string {
  const d = normaliser(domaine);
  return nomsConnus.has(`www.${d}`) ? `www.${d}` : d;
}
