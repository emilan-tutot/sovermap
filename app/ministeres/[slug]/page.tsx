import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Constellation } from "@/components/ministeres/Constellation";
import { Citer } from "@/components/texte/Citer";
import { Valeur } from "@/components/texte/Valeur";
import { fiche } from "@/lib/donnees/fiches";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { type DomaineServi, groupesDe, lireMinisteres, parCategorie } from "@/lib/donnees/ministeres";
import { type Categorie, lireIndexSocietes, nomPays } from "@/lib/donnees/radiographie";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe } from "@/lib/referencement";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";

type Props = { params: Promise<{ slug: string }> };

const t = fr.ministeres;
const CATEGORIES: readonly Categorie[] = [
  "France",
  "UE hors France",
  "Europe hors UE",
  "hors d'Europe",
  "non déterminé",
];
const estSlug = (s: string) => /^[a-z0-9-]{1,100}$/.test(s);

/**
 * The ministry of an address: null when the day's index has none (or is not published yet); « indisponible » when the
 * index cannot be read or does not pass its checks, an error, never a « not found » kept by the CDN (the review of PR
 * 22).
 */
async function ministereDe(slug: string) {
  const lu = await lecteur.fichier("index/ministeres.json");
  if (lu.statut === "absent" || lu.statut === "porte fermée") return null;
  const liste = lu.statut === "ok" ? lireMinisteres(lu.donnees) : null;
  return liste === null ? "indisponible" : (liste.find((m) => m.slug === slug) ?? null);
}

/** Maps a list a few at a time: a ministry's records are read 16 at once, never hundreds (GitHub's limits). */
async function parLots<T, U>(liste: readonly T[], fn: (e: T) => Promise<U>, n = 16): Promise<U[]> {
  const resultats: U[] = [];
  for (let i = 0; i < liste.length; i += n) resultats.push(...(await Promise.all(liste.slice(i, i + n).map(fn))));
  return resultats;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!estSlug(slug)) return {};
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") return {};
  const m = await ministereDe(slug);
  return m === null || m === "indisponible"
    ? {}
    : {
        title: t.titrePage(m.nom),
        description: t.descriptionPage(m.nom),
        alternates: { canonical: `/ministeres/${slug}` },
        openGraph: partageDe("ministere", fr.meta.titre(t.titrePage(m.nom)), t.descriptionPage(m.nom)),
      };
}

/** The company that serves a web name: the one that delivers it when a CDN does, otherwise the first that hosts it. */
function servi(domaine: string, web: EnregistrementNom | null): DomaineServi {
  const exploitants = web?.exploitants ?? [];
  const e =
    exploitants.find((x) => x.role === "diffusé par" && x.societe !== null) ??
    exploitants.find((x) => x.societe !== null);
  const categorie = CATEGORIES.find((c) => c === web?.categorie) ?? "non déterminé";
  return { domaine, societe: e?.societe ?? null, categorie };
}

// A ministry's page (D.2, R8): its domains, how many fall in each category of seat, and the domains grouped by the
// company that serves them, each leading to its Radiographie. First version: each domain's records are read (cached);
// a per-ministry index will lighten it (D.4). Behind a closed door, no data is read: « not found ».
export default async function MinisterePage({ params }: Props) {
  const { slug } = await params;
  if (!estSlug(slug)) notFound();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  if (etat.statut !== "ok") indisponible();
  const m = await ministereDe(slug);
  if (m === "indisponible") indisponible();
  if (m === null) notFound();
  const lire = (chemin: string) => lecteur.fichier(chemin);
  // A record that cannot be read is an error, never « non déterminé » kept by the CDN; a record that is not published
  // stays « non déterminé » (the review of PR 22).
  const luSocietes = await lire("index/exploitants.json");
  const servis = await parLots(m.domaines, async (d): Promise<DomaineServi | null> => {
    const lu = await fiche(lire, "domaines", d, etat.donnees.date);
    if (lu.statut === "absent") return servi(d, null);
    if (lu.statut !== "ok") return null;
    const nomWeb = (lu.donnees as unknown as EnregistrementDomaine).nomWeb;
    const web = await fiche(lire, "noms", nomWeb, etat.donnees.date);
    if (web.statut !== "ok" && web.statut !== "absent") return null;
    return servi(d, web.statut === "ok" ? (web.donnees as unknown as EnregistrementNom) : null);
  });
  if (luSocietes.statut !== "ok" && luSocietes.statut !== "absent") indisponible();
  const societes = luSocietes.statut === "ok" ? lireIndexSocietes(luSocietes.donnees) : new Map();
  if (societes === null || servis.some((s) => s === null)) indisponible();
  const domaines = servis.filter((s): s is DomaineServi => s !== null);
  const groupes = groupesDe(domaines, societes);
  return (
    <Coque>
      <FilAriane
        miettes={[
          { nom: fr.coque.navigation.ministeres, chemin: "/ministeres" },
          { nom: m.nom, chemin: `/ministeres/${m.slug}` },
        ]}
      />
      <p className="etiquette-capitales">{t.surtitre}</p>
      <h1 className="titre-page">{m.nom}</h1>
      <section className="releve" aria-labelledby="titre-repartition">
        <h2 id="titre-repartition">{t.repartition}</h2>
        <p>{t.domaines(domaines.length, nombre(domaines.length))}</p>
        <ul className="couche-liste">
          {parCategorie(domaines).map(([c, n]) => (
            <li key={c} className={c === "hors d'Europe" || c === "Europe hors UE" ? "hors-ue" : undefined}>
              {t.ligne(fr.radiographie.categories[c], nombre(n))}
            </li>
          ))}
        </ul>
        <p className="releve-note">{t.repartitionNote}</p>
      </section>
      <section className="releve" aria-labelledby="titre-constellation">
        <h2 id="titre-constellation">{t.constellation.titre}</h2>
        <Constellation groupes={groupes} />
      </section>
      <section className="releve" aria-labelledby="titre-groupes">
        <h2 id="titre-groupes">{t.groupes}</h2>
        {groupes.map((g) => (
          <div key={g.societe ?? "aucune"} className="groupe-ministere">
            <h3>
              {g.societe === null ? (
                t.sansSociete
              ) : (
                <Link href={`/societes/${g.societe}`} prefetch={false}>
                  {g.nom}
                </Link>
              )}
            </h3>
            {g.societe === null ? null : (
              <p className="releve-note">
                {g.categorie !== "non déterminé"
                  ? fr.radiographie.pays.valeur(
                      nomPays(societes.get(g.societe)?.paysRetenu ?? null) ?? fr.radiographie.categories[g.categorie],
                      fr.radiographie.categories[g.categorie],
                    )
                  : fr.societes.siegeInconnu}
              </p>
            )}
            <ul className="liste-domaines">
              {g.domaines.map((d) => (
                <li key={d}>
                  <Link href={`/radiographie/${d}`} prefetch={false} className="valeur">
                    <Valeur texte={d} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="releve-note">{t.source}</p>
      </section>
      {etat.statut === "ok" ? (
        <Citer titre={t.titrePage(m.nom)} chemin={`/ministeres/${slug}`} date={etat.donnees.date} />
      ) : null}
    </Coque>
  );
}
