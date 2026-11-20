// The production door (brief of chantier 2, A.6), in ONE place. While it is closed, only the waiting page's addresses
// answer: the root, its files and icons, robots.txt and the empty sitemap. Every other address is rewritten, before any
// file or route is looked up, to a path that no route serves, so Next.js answers with the 404 page: pages, Next.js
// internal requests (`?_rsc=`), search index, share images, sitemaps, API routes and data files alike.
// The rule is a routing rewrite computed at build time from the deployment's own variables (next.config.ts): no
// function runs per request (nothing counted in the shared quotas), and a deployment built closed stays closed.
// No "@/" alias here: next.config.ts imports this file.
import { sitePublic } from "./site";

type Env = Readonly<Record<string, string | undefined>>;

/**
 * What still answers behind a closed door, besides the root « / » (the waiting page). Regular expressions on the path
 * without its leading slash; each must end with « $ » or « / ».
 */
export const LISTE_BLANCHE: readonly string[] = [
  "robots\\.txt$",
  "sitemap\\.xml$",
  // The icons of the waiting page.
  "icon\\.svg$",
  // The licences of the fonts it uses (SIL OFL 1.1).
  "licenses/[a-z0-9-]+\\.txt$",
  // Its scripts, styles and fonts: files of the build, which hold no data.
  "_next/static/",
  // The reload channel of the development server (`next dev`); a production build has none.
  "_next/webpack-hmr$",
];

/** A path that no route serves: the target of the rewrite, answered by the 404 page. */
export const CHEMIN_FERME = "/_porte-fermee";

/** Any path (without its leading slash) that is not on the white list. */
export const MOTIF_FERME = `(?!(?:${LISTE_BLANCHE.join("|")})).+`;

export type Reecriture = { source: string; destination: string };

/** The rewrites of the door (next.config.ts, `beforeFiles`): none when it is open, one that closes everything else. */
export function reecrituresPorte(env: Env = process.env): Reecriture[] {
  return sitePublic(env) ? [] : [{ source: `/:chemin(${MOTIF_FERME})`, destination: CHEMIN_FERME }];
}

/** What a closed door must answer at an address. */
export type Attendu = "attente" | "robots-ferme" | "plan-vide" | "fichier" | "introuvable";

export type AdressePorte = { chemin: string; famille: string; attendu: Attendu };

/**
 * The addresses that `npm run probe:prod` and the e2e tests ask while the door is closed: at least one REAL address of
 * every family the site has. A PR that adds a family (pages, data files, search index, share images, sitemaps, API
 * routes) adds one of its real addresses here, in the same PR (brief A.6).
 */
export const ADRESSES_PORTE: readonly AdressePorte[] = [
  { chemin: "/", famille: "page d'attente", attendu: "attente" },
  { chemin: "/robots.txt", famille: "robots.txt", attendu: "robots-ferme" },
  { chemin: "/sitemap.xml", famille: "plan du site", attendu: "plan-vide" },
  { chemin: "/icon.svg", famille: "icône de la page d'attente", attendu: "fichier" },
  { chemin: "/licenses/manrope-OFL.txt", famille: "licences des polices", attendu: "fichier" },
  { chemin: "/page-qui-n-existe-pas", famille: "pages", attendu: "introuvable" },
  { chemin: "/page-qui-n-existe-pas?_rsc=porte", famille: "requêtes internes de Next.js", attendu: "introuvable" },
  { chemin: "/globe/monde.json", famille: "fichiers publics hors de la page d'attente", attendu: "introuvable" },
  { chemin: "/globe/repli.svg", famille: "images hors de la page d'attente", attendu: "introuvable" },
  { chemin: "/_next/image?url=%2Ficon.svg&w=64&q=75", famille: "images optimisées", attendu: "introuvable" },
];
