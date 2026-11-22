// The search's index (D.2, R4): built on demand from the day's data (never at build time, so that a new day needs no
// deployment: EX-14), served with a shared cache, loaded whole by the browser at the search's first use. Behind a closed
// door, the door's rewrite answers « not found » before this route; it checks the door again, and reads nothing.
import { lireIndexDomaines } from "@/lib/donnees/domaines";
import { lecteur } from "@/lib/donnees/lecture";
import { lireMinisteres } from "@/lib/donnees/ministeres";
import { lireIndexPays, slugDuCode } from "@/lib/donnees/pays";
import { lireIndexSocietes, nomPays } from "@/lib/donnees/radiographie";
import { lireDomainesSociete } from "@/lib/donnees/societes";
import type { Entree } from "@/lib/recherche";
import { sitePublic } from "@/lib/site";

const ABSENT = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/** index/domaines.json, checked (lib/donnees/domaines.ts): every registered domain, with 1 for the « État » perimeter. */
function lireDomaines(valeur: unknown): [string, 0 | 1][] | null {
  return lireIndexDomaines(valeur)?.map((d): [string, 0 | 1] => [d.domaine, d.etat ? 1 : 0]) ?? null;
}

export async function GET(): Promise<Response> {
  if (!sitePublic()) return ABSENT();
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") {
    return etat.statut === "indisponible"
      ? new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } })
      : ABSENT();
  }
  const [luDomaines, luSocietes, luMinisteres, luPays] = await Promise.all([
    lecteur.fichier("index/domaines.json"),
    lecteur.fichier("index/exploitants.json"),
    lecteur.fichier("index/ministeres.json"),
    lecteur.fichier("index/pays.json"),
  ]);
  const societes = luSocietes.statut === "ok" ? lireIndexSocietes(luSocietes.donnees) : null;
  const ministeres = luMinisteres.statut === "ok" ? lireMinisteres(luMinisteres.donnees) : null;
  const pays = luPays.statut === "ok" ? lireIndexPays(luPays.donnees) : null;
  if (societes === null || ministeres === null || pays === null) {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  // Every registered domain from the index; before it was published (until 23/11/2026), the domains the companies'
  // lists give, « État » when the perimeter's exact reasons say so (.gouv.fr, a ministry of the Référentiel). An index
  // published but unreadable is an error, never a smaller index kept 6 hours (the review of PR 22).
  const indisponibleSansCache = () => new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (luDomaines.statut !== "ok" && luDomaines.statut !== "absent") return indisponibleSansCache();
  let domaines = luDomaines.statut === "ok" ? lireDomaines(luDomaines.donnees) : null;
  if (luDomaines.statut === "ok" && domaines === null) return indisponibleSansCache();
  if (domaines === null) {
    const desMinisteres = new Set(ministeres.flatMap((m) => m.domaines));
    const listes = await Promise.all(
      [...societes.keys()].map((cle) => lecteur.fichier(`index/exploitants/${cle}.json`)),
    );
    if (listes.some((lu) => lu.statut !== "ok" && lu.statut !== "absent")) return indisponibleSansCache();
    const parSociete = listes.map((lu, i) =>
      lu.statut === "ok" ? lireDomainesSociete(lu.donnees, [...societes.keys()][i] ?? "") : [],
    );
    if (parSociete.some((l) => l === null)) return indisponibleSansCache();
    const tous = new Set(parSociete.flatMap((l) => l ?? []));
    for (const d of desMinisteres) tous.add(d);
    domaines = [...tous].sort().map((d) => [d, d.endsWith(".gouv.fr") || desMinisteres.has(d) ? 1 : 0]);
  }
  const entrees: Entree[] = [
    ...ministeres.map((m): Entree => ["m", m.nom, m.slug]),
    ...[...societes].map(([cle, s]): Entree => ["s", s.nom, cle]),
    ...[...pays.keys()].flatMap((code): Entree[] => {
      const nom = nomPays(code);
      const slug = slugDuCode(code);
      return nom === null || slug === null ? [] : [["p", nom, slug]];
    }),
    ...domaines.map(([d, e]): Entree => ["d", d, e]),
  ];
  // Shared 6 hours by the CDN (the data change once a day): about 750 KB rendered at most 4 times a day and a region,
  // rather than 24 (plan § 11, D.4: the Fast Origin Transfer is the tightest quota).
  return Response.json(
    { date: etat.donnees.date, entrees },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400" } },
  );
}
