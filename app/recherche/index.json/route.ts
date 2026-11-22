// The search's index (D.2, R4): built on demand from the day's data (never at build time, so that a new day needs no
// deployment: EX-14), served with a shared cache, loaded whole by the browser at the search's first use. Behind a closed
// door, the door's rewrite answers « not found » before this route; it checks the door again, and reads nothing.
import { lecteur } from "@/lib/donnees/lecture";
import { lireMinisteres } from "@/lib/donnees/ministeres";
import { lireIndexPays, slugDuCode } from "@/lib/donnees/pays";
import { lireIndexSocietes, nomPays } from "@/lib/donnees/radiographie";
import { lireDomainesSociete } from "@/lib/donnees/societes";
import type { Entree } from "@/lib/recherche";
import { sitePublic } from "@/lib/site";

const ABSENT = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/** index/domaines.json, checked: every registered domain, with 1 for the « État » perimeter; null when absent. */
function lireDomaines(valeur: unknown): [string, 0 | 1][] | null {
  if (typeof valeur !== "object" || valeur === null || !Array.isArray((valeur as { domaines?: unknown }).domaines))
    return null;
  return (valeur as { domaines: unknown[] }).domaines.flatMap((e): [string, 0 | 1][] =>
    Array.isArray(e) && typeof e[0] === "string" && /^[a-z0-9_.-]{1,253}$/.test(e[0]) && (e[1] === 0 || e[1] === 1)
      ? [[e[0], e[1]]]
      : [],
  );
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
  // lists give, « État » when the perimeter's exact reasons say so (.gouv.fr, a ministry of the Référentiel).
  let domaines = luDomaines.statut === "ok" ? lireDomaines(luDomaines.donnees) : null;
  if (domaines === null) {
    const desMinisteres = new Set(ministeres.flatMap((m) => m.domaines));
    const listes = await Promise.all(
      [...societes.keys()].map((cle) => lecteur.fichier(`index/exploitants/${cle}.json`)),
    );
    const tous = new Set(
      listes.flatMap((lu, i) =>
        lu.statut === "ok" ? (lireDomainesSociete(lu.donnees, [...societes.keys()][i] ?? "") ?? []) : [],
      ),
    );
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
  return Response.json(
    { date: etat.donnees.date, entrees },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
