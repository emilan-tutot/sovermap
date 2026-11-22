// The production door (brief of chantier 2, A.6), in ONE place. While it is closed, only the waiting page's addresses
// answer: the root, its files and icons, robots.txt and the empty sitemap. Every other address is rewritten, before any
// file or route is looked up, to an address that nothing serves, so the 404 page answers every kind of request (a
// page, an internal navigation or a prefetch of Next.js): search index, share images, sitemaps, API routes and data
// files alike.
// The rule is a routing rewrite computed at build time from the deployment's own variables (next.config.ts): no
// function runs per request (nothing counted in the shared quotas), and a deployment built closed stays closed.
// Identifiers keep the project's French domain words (porte, chemin…), like the rest of the code base.
// No "@/" alias here: next.config.ts imports this file.
import { sitePublic } from "./site";

type Env = Readonly<Record<string, string | undefined>>;

/**
 * What still answers behind a closed door, besides the root « / » (the waiting page). Regular expressions on the path
 * without its leading slash; each must end with « $ » or « / ». Next.js matches them without regard to letter case:
 * /ROBOTS.TXT is let through by the rule, then finds no file and answers 404. So a dynamic segment added later at
 * the root must also refuse what it does not know (dynamicParams = false), and every data reader checks sitePublic().
 */
export const LISTE_BLANCHE: readonly string[] = [
  "robots\\.txt$",
  "sitemap\\.xml$",
  // The icons of the waiting page (tab, home screen) and its share image (scripts/design/icones.ts).
  "icon\\.svg$",
  "apple-touch-icon\\.png$",
  "partage\\.png$",
  // The licences of the fonts it uses (SIL OFL 1.1), for example manrope-OFL.txt.
  "licenses/[A-Za-z0-9-]+\\.txt$",
  // Its scripts, styles and fonts: files of the build, which hold no data.
  "_next/static/",
  // The reload channel of the development server (`next dev`); a production build has none.
  "_next/webpack-hmr$",
];

/**
 * The target of the rewrite: an address that nothing serves. A folder whose name starts with « _ » is private in the
 * App Router (never a route); tests/porte.test.ts refuses a file of that name in public/ and any dynamic segment at the
 * root of app/ (it would take the target for a value and serve a page). A real page that only calls notFound() would
 * not do: on Vercel, its internal format answers 200 to a navigation or a prefetch (point 01, 20/11/2026).
 */
export const CHEMIN_FERME = "/_porte-fermee";

/** Any path (without its leading slash) that is not on the white list. */
export const MOTIF_FERME = `(?!(?:${LISTE_BLANCHE.join("|")})).+`;

export type Reecriture = { source: string; destination: string };

/** The rewrites of the door (next.config.ts, `beforeFiles`): none when it is open, one that closes everything else. */
export function reecrituresPorte(env: Env = process.env): Reecriture[] {
  return sitePublic(env) ? [] : [{ source: `/:chemin(${MOTIF_FERME})`, destination: CHEMIN_FERME }];
}

/**
 * What a closed door must answer at an address.
 * - « attente-rsc »: the waiting page's payload for an internal navigation of Next.js (header `RSC: 1`).
 * - « refusee »: an address the hosting platform answers itself, before the site's routing (Vercel's image service
 *   at /_next/image answers 400 « INVALID_IMAGE_OPTIMIZE_REQUEST »): any 4xx, never an image, never data.
 */
export type Attendu = "attente" | "attente-rsc" | "robots-ferme" | "plan-vide" | "fichier" | "introuvable" | "refusee";

export type AdressePorte = {
  chemin: string;
  famille: string;
  attendu: Attendu;
  /** Request headers, to ask the way a browser really does (an internal navigation sends `RSC: 1`). */
  entetes?: Readonly<Record<string, string>>;
  /** The rule lets it through (letter case, or a build file that does not exist): its 404 comes from the absence. */
  laisseeParLaRegle?: true;
};

/** The headers of an internal navigation of Next.js 16 (App Router), and of its two kinds of prefetch. */
const RSC = { RSC: "1" } as const;
const PRECHARGEMENT = { RSC: "1", "Next-Router-Prefetch": "1" } as const;
const PRECHARGEMENT_SEGMENTS = { RSC: "1", "Next-Router-Prefetch": "1", "Next-Router-Segment-Prefetch": "/_tree" } as const;

/**
 * The addresses that `npm run probe:prod` and the e2e tests ask while the door is closed: at least one REAL address of
 * every family the site has. A PR that adds a family (pages, data files, search index, share images, sitemaps, API
 * routes) adds one of its real addresses here, in the same PR (brief A.6).
 */
export const ADRESSES_PORTE: readonly AdressePorte[] = [
  { chemin: "/", famille: "page d'attente", attendu: "attente" },
  { chemin: "/", famille: "navigation interne vers la page d'attente", attendu: "attente-rsc", entetes: RSC },
  { chemin: "/robots.txt", famille: "robots.txt", attendu: "robots-ferme" },
  { chemin: "/sitemap.xml", famille: "plan du site", attendu: "plan-vide" },
  { chemin: "/icon.svg", famille: "icône de la page d'attente", attendu: "fichier" },
  { chemin: "/apple-touch-icon.png", famille: "icône d'écran d'accueil", attendu: "fichier" },
  { chemin: "/partage.png", famille: "image de partage de la page d'attente", attendu: "fichier" },
  { chemin: "/licenses/manrope-OFL.txt", famille: "licences des polices", attendu: "fichier" },
  { chemin: "/page-qui-n-existe-pas", famille: "pages", attendu: "introuvable" },
  { chemin: "/qualite", famille: "pages de données", attendu: "introuvable" },
  { chemin: "/qualite", famille: "page de données, navigation interne", attendu: "introuvable", entetes: RSC },
  { chemin: "/radiographie/impots.gouv.fr", famille: "fiches des domaines", attendu: "introuvable" },
  { chemin: "/societes", famille: "liste des sociétés", attendu: "introuvable" },
  { chemin: "/ministeres", famille: "liste des ministères", attendu: "introuvable" },
  { chemin: "/journal", famille: "journal", attendu: "introuvable" },
  { chemin: "/recherche/index.json", famille: "index de recherche", attendu: "introuvable" },
  { chemin: "/plans/pages.xml", famille: "sous-plans du site", attendu: "introuvable" },
  { chemin: "/pays/etats-unis", famille: "pages des pays", attendu: "introuvable" },
  { chemin: "/pays/etats-unis", famille: "page d'un pays, navigation interne", attendu: "introuvable", entetes: RSC },
  { chemin: "/journal/2026-11-21", famille: "jours du journal", attendu: "introuvable" },
  { chemin: "/journal/2026-11-21", famille: "jour du journal, navigation interne", attendu: "introuvable", entetes: RSC },
  { chemin: "/ministeres/ministere-de-la-culture", famille: "pages des ministères", attendu: "introuvable" },
  { chemin: "/ministeres/ministere-de-la-culture", famille: "page d'un ministère, navigation interne", attendu: "introuvable", entetes: RSC },
  { chemin: "/societes/celeste", famille: "pages des sociétés", attendu: "introuvable" },
  { chemin: "/societes/celeste", famille: "page d'une société, navigation interne", attendu: "introuvable", entetes: RSC },
  { chemin: "/radiographie/impots.gouv.fr", famille: "fiche d'un domaine, navigation interne", attendu: "introuvable", entetes: RSC },
  { chemin: "/page-qui-n-existe-pas", famille: "navigation interne de Next.js", attendu: "introuvable", entetes: RSC },
  { chemin: "/page-qui-n-existe-pas", famille: "préchargement", attendu: "introuvable", entetes: PRECHARGEMENT },
  {
    chemin: "/page-qui-n-existe-pas",
    famille: "préchargement par segments",
    attendu: "introuvable",
    entetes: PRECHARGEMENT_SEGMENTS,
  },
  { chemin: "/page-qui-n-existe-pas?_rsc=porte", famille: "requêtes internes de Next.js", attendu: "introuvable" },
  { chemin: CHEMIN_FERME, famille: "cible de la porte", attendu: "introuvable" },
  { chemin: CHEMIN_FERME, famille: "cible de la porte, navigation interne", attendu: "introuvable", entetes: RSC },
  { chemin: "/globe/monde.json", famille: "fichiers publics hors de la page d'attente", attendu: "introuvable" },
  { chemin: "/globe/monde.json", famille: "fichier public, préchargement", attendu: "introuvable", entetes: PRECHARGEMENT },
  { chemin: "/globe/repli.svg", famille: "images hors de la page d'attente", attendu: "introuvable" },
  { chemin: "/_next/image?url=%2Ficon.svg&w=64&q=75", famille: "images optimisées", attendu: "refusee" },
  { chemin: "/ROBOTS.TXT", famille: "liste blanche en capitales", attendu: "introuvable", laisseeParLaRegle: true },
  {
    chemin: "/_NEXT/STATIC/x.js",
    famille: "liste blanche en capitales",
    attendu: "introuvable",
    laisseeParLaRegle: true,
  },
  {
    chemin: "/_next/static/x.js",
    famille: "fichier du build inexistant",
    attendu: "introuvable",
    laisseeParLaRegle: true,
  },
];
