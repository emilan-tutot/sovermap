import { lireIndexDemarches } from "@/lib/donnees/demarches";
import { lecteur } from "@/lib/donnees/lecture";
import { PAGES_DE_TEXTE } from "@/lib/i18n/fr-textes";
import { lireMinisteres } from "@/lib/donnees/ministeres";
import { lireIndexPays, slugDuCode } from "@/lib/donnees/pays";
import { lireIndexSocietes } from "@/lib/donnees/radiographie";
import { adresseDepartement, adresseRegion, lireIndexTerritoires } from "@/lib/donnees/territoires";
import { type AdressePlan, CACHE_PLANS, plan } from "@/lib/referencement";
import { indexingOpen, origineDuSite } from "@/lib/site";

// The sitemap of the site's pages (D.7): the Atlas, the lists, every ministry and company, and the countries that
// serve at least one domain; never a page the indexing policy keeps out (docs/referencement.md). Absent until indexing
// opens (behind a closed door, the door already answers 404); read from the day's data and shared an hour.
const ABSENT = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
const INDISPONIBLE = () => new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });

export async function GET(): Promise<Response> {
  if (!indexingOpen()) return ABSENT();
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") return etat.statut === "indisponible" ? INDISPONIBLE() : ABSENT();
  const [luMinisteres, luSocietes, luPays, luTerritoires, luDemarches] = await Promise.all([
    lecteur.fichier("index/ministeres.json"),
    lecteur.fichier("index/exploitants.json"),
    lecteur.fichier("index/pays.json"),
    lecteur.fichier("index/territoires.json"),
    lecteur.fichier("index/demarches.json"),
  ]);
  const ministeres = luMinisteres.statut === "ok" ? lireMinisteres(luMinisteres.donnees) : null;
  const societes = luSocietes.statut === "ok" ? lireIndexSocietes(luSocietes.donnees) : null;
  const pays = luPays.statut === "ok" ? lireIndexPays(luPays.donnees) : null;
  if (ministeres === null || societes === null || pays === null) return INDISPONIBLE();
  // The territories (D.2), once their index is published: the map, the régions and the départements (the communes'
  // and groups' pages stay out of the indexes, D.7). An index published but unreadable is an error.
  if (luTerritoires.statut !== "ok" && luTerritoires.statut !== "absent") return INDISPONIBLE();
  const territoires = luTerritoires.statut === "ok" ? lireIndexTerritoires(luTerritoires.donnees) : null;
  if (luTerritoires.statut === "ok" && territoires === null) return INDISPONIBLE();
  // The démarches' page, once their index is published (C.8, D.2); an index published but unreadable, or that does not
  // read as one, is an error: never a page in the plan that answers an error (the review of the démarches' page).
  if (luDemarches.statut !== "ok" && luDemarches.statut !== "absent") return INDISPONIBLE();
  if (luDemarches.statut === "ok" && lireIndexDemarches(luDemarches.donnees) === null) return INDISPONIBLE();
  const adresses: AdressePlan[] = [
    { chemin: "/" },
    { chemin: "/ministeres" },
    ...(luDemarches.statut === "ok" ? [{ chemin: "/demarches" }] : []),
    ...ministeres.map((m) => ({ chemin: `/ministeres/${m.slug}` })),
    { chemin: "/societes" },
    ...[...societes.keys()].map((cle) => ({ chemin: `/societes/${cle}` })),
    ...[...pays].flatMap(([code, c]) => {
      const slug = slugDuCode(code);
      return slug !== null && c.domaines > 0 ? [{ chemin: `/pays/${slug}` }] : [];
    }),
    ...(territoires === null
      ? []
      : [
          { chemin: "/territoires" },
          ...[...territoires.regions.values()].map((r) => ({ chemin: adresseRegion(r.code, r.nom) })),
          ...[...territoires.departements.values()].map((d) => ({ chemin: adresseDepartement(d.code, d.nom) })),
        ]),
    { chemin: "/journal" },
    { chemin: "/qualite" },
    { chemin: "/donnees" },
    ...PAGES_DE_TEXTE.map((p) => ({ chemin: p.chemin })),
  ];
  return new Response(plan(origineDuSite(), adresses), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": CACHE_PLANS },
  });
}
