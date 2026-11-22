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

const FICHES = ["/radiographie/:domaine", "/journal/:date"];
const AGREGATS = [
  "/",
  "/societes",
  "/societes/:cle",
  "/ministeres",
  "/ministeres/:slug",
  "/pays/:slug",
  "/journal",
  "/qualite",
];

/** The cache rules of next.config.ts's headers(): none behind a closed door. */
export function enTetesDeCache(env: Env = process.env): RegleEnTetes[] {
  if (!sitePublic(env)) return [];
  const regle = (source: string, valeur: string): RegleEnTetes => ({
    source,
    headers: [{ key: "Vercel-CDN-Cache-Control", value: valeur }],
  });
  return [...FICHES.map((s) => regle(s, CACHE_FICHE)), ...AGREGATS.map((s) => regle(s, CACHE_AGREGAT))];
}
