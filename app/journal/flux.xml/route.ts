import { cheminJour, joursPublies, lireJour, type Jour } from "@/lib/donnees/journal";
import { lecteur } from "@/lib/donnees/lecture";
import { fluxAtom, JOURS_DU_FLUX } from "@/lib/journal-flux";
import { CACHE_PLANS } from "@/lib/referencement";
import { origineDuSite } from "@/lib/site";

// The Journal's Atom feed (point 13, § 10): the latest published days, read from the day's data and shared an hour,
// like the sitemaps. Behind a closed door, the door answers 404 before this route, and no data is read.
const ABSENT = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
const INDISPONIBLE = () => new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });

export async function GET(): Promise<Response> {
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") return etat.statut === "indisponible" ? INDISPONIBLE() : ABSENT();
  const dates = joursPublies(etat.donnees).slice(0, JOURS_DU_FLUX);
  const lus = await Promise.all(dates.map((date) => lecteur.fichier(cheminJour(date))));
  // A day published but unreadable is an error, never a day left out silently.
  const jours: Jour[] = [];
  for (const lu of lus) {
    const jour = lu.statut === "ok" ? lireJour(lu.donnees) : null;
    if (jour === null) return INDISPONIBLE();
    jours.push(jour);
  }
  return new Response(fluxAtom(origineDuSite(), jours), {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": CACHE_PLANS,
      "X-Robots-Tag": "noindex",
    },
  });
}
