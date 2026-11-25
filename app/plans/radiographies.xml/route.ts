import { lireIndexDomaines } from "@/lib/donnees/domaines";
import { lecteur } from "@/lib/donnees/lecture";
import { ADRESSES_PAR_PLAN, type AdressePlan, CACHE_PLANS, plan } from "@/lib/referencement";
import { indexingOpen, origineDuSite } from "@/lib/site";

// The sitemap of the Radiographies the indexing policy lists (D.7): those of the « État » perimeter, each with the day
// of its last confirmed change once the collection publishes it (docs/referencement.md). Absent until indexing opens
// (behind a closed door, the door already answers 404); read from the day's index and shared an hour.
const ABSENT = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
const INDISPONIBLE = () => new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });

export async function GET(): Promise<Response> {
  if (!indexingOpen()) return ABSENT();
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") return etat.statut === "indisponible" ? INDISPONIBLE() : ABSENT();
  const lu = await lecteur.fichier("index/domaines.json");
  const domaines = lu.statut === "ok" ? lireIndexDomaines(lu.donnees) : null;
  if (domaines === null) return INDISPONIBLE();
  const adresses = domaines
    .filter((d) => d.etat)
    .map((d): AdressePlan => {
      const chemin = `/radiographie/${d.domaine}`;
      return d.date === null ? { chemin } : { chemin, date: d.date };
    });
  // About 1,900 today: far from the protocol's limit; past it, the sitemap must be split, and the logs say so.
  if (adresses.length > ADRESSES_PAR_PLAN) {
    console.warn(`plans : ${adresses.length} Radiographies de l'État, le plan n'en donne que ${ADRESSES_PAR_PLAN}`);
  }
  return new Response(plan(origineDuSite(), adresses), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": CACHE_PLANS },
  });
}
