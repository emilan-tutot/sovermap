import { indexDesPlans, PLAN_VIDE } from "@/lib/referencement";
import { indexingOpen, origineDuSite } from "@/lib/site";

// The index of the sitemaps (D.7), made once at build time and served as a file: empty while the site is closed to
// indexing (behind a closed door, the waiting page's empty sitemap: lib/porte.ts), then the absolute addresses of the
// sitemaps (lib/referencement.ts). No data is read.
export const dynamic = "force-static";

export function GET(): Response {
  const corps = indexingOpen() ? indexDesPlans(origineDuSite()) : PLAN_VIDE;
  return new Response(corps, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
