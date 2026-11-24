// The shared cache of the data pages (D.4; plan § 11). Rendered on demand with the day's data (never at build time),
// they are kept by Vercel's CDN, so that a visit served from its cache costs no function invocation, no CPU and no ISR
// write. Vercel-CDN-Cache-Control is read by Vercel's CDN only, takes priority over the page's own Cache-Control, and
// never reaches the browser (vercel.com/docs/caching/cache-control-headers, read on 22/11/2026); whether the CDN really
// keeps these pages is checked in the preview (x-vercel-cache: MISS, then HIT). Behind a closed door, nothing: every
// data address answers the door's 404. next.config.ts imports this module: no "@/" alias here.
import { sitePublic } from "./site";

type Env = Readonly<Record<string, string | undefined>>;
export type RegleEnTetes = { source: string; headers: { key: string; value: string }[] };

/** A record (a domain's Radiographie, a day of the journal): kept a day, then served stale a week while read again. */
export const CACHE_FICHE = "max-age=86400, stale-while-revalidate=604800";
/** An aggregated page (the Atlas, a list, a ministry, a company, a country, Quality): an hour, then stale a day. */
export const CACHE_AGREGAT = "max-age=3600, stale-while-revalidate=86400";

// A day of the journal by its date only: « /journal/flux.xml » is not a day, and keeps its own Cache-Control (an hour
// when it answers, never stored when it fails), which a rule here would override (the review of PR 22). The routes of
// app/ set their own Cache-Control the same way: no rule here may cover one (tests/cache.test.ts).
const FICHES = [
  "/radiographie/:domaine",
  "/journal/:date(\\d{4}-\\d{2}-\\d{2})",
  "/communes/:cle",
  "/groupements/:cle",
];
const AGREGATS = [
  "/",
  "/societes",
  "/societes/:cle",
  "/ministeres",
  "/ministeres/:slug",
  "/demarches",
  "/pays/:slug",
  "/journal",
  "/qualite",
  "/donnees",
  "/sources",
  "/territoires",
  "/regions/:cle",
  "/departements/:cle",
];

/**
 * The text pages (part E): they carry the date of the last collection (Fraicheur), so they are rendered on demand too,
 * and kept like an aggregated page (the review of PR 22). /sources is among the aggregated pages. A test checks this
 * list against the pages' own (lib/i18n/fr-textes.ts).
 */
export const TEXTES = [
  "/a-propos",
  "/corrections",
  "/accessibilite",
  "/glossaire",
  "/pourquoi-ca-compte",
  "/credits",
  "/radiographie-de-sovermap",
  "/methode",
  "/confidentialite",
  "/mentions-legales",
];

/** The cache rules of next.config.ts's headers(): none behind a closed door. */
export function enTetesDeCache(env: Env = process.env): RegleEnTetes[] {
  if (!sitePublic(env)) return [];
  const regle = (source: string, valeur: string): RegleEnTetes => ({
    source,
    headers: [{ key: "Vercel-CDN-Cache-Control", value: valeur }],
  });
  return [...FICHES.map((s) => regle(s, CACHE_FICHE)), ...[...AGREGATS, ...TEXTES].map((s) => regle(s, CACHE_AGREGAT))];
}
