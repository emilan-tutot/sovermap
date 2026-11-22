import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Constellation } from "@/components/ministeres/Constellation";
import { Valeur } from "@/components/texte/Valeur";
import { fiche } from "@/lib/donnees/fiches";
import { lecteur } from "@/lib/donnees/lecture";
import { type DomaineServi, groupesDe, lireMinisteres, parCategorie } from "@/lib/donnees/ministeres";
import { type Categorie, lireIndexSocietes, nomPays } from "@/lib/donnees/radiographie";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
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

async function ministereDe(slug: string) {
  const lu = await lecteur.fichier("index/ministeres.json");
  return lu.statut === "ok" ? (lireMinisteres(lu.donnees)?.find((m) => m.slug === slug) ?? null) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!estSlug(slug)) return {};
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") return {};
  const m = await ministereDe(slug);
  return m === null
    ? {}
    : {
        title: t.titrePage(m.nom),
        description: t.descriptionPage(m.nom),
        alternates: { canonical: `/ministeres/${slug}` },
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
  if (etat.statut !== "ok") {
    return (
      <Coque>
        <h1 className="titre-page">{t.titre}</h1>
        <p className="note">{fr.radiographie.indisponible}</p>
      </Coque>
    );
  }
  const m = await ministereDe(slug);
  if (m === null) notFound();
  const lire = (chemin: string) => lecteur.fichier(chemin);
  const [luSocietes, ...servis] = await Promise.all([
    lire("index/exploitants.json"),
    ...m.domaines.map(async (d): Promise<DomaineServi> => {
      const lu = await fiche(lire, "domaines", d);
      if (lu.statut !== "ok") return servi(d, null);
      const nomWeb = (lu.donnees as unknown as EnregistrementDomaine).nomWeb;
      const web = await fiche(lire, "noms", nomWeb);
      return servi(d, web.statut === "ok" ? (web.donnees as unknown as EnregistrementNom) : null);
    }),
  ]);
  const societes = (luSocietes.statut === "ok" ? lireIndexSocietes(luSocietes.donnees) : null) ?? new Map();
  const domaines = servis as DomaineServi[];
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
                {societes.get(g.societe)?.paysMere
                  ? fr.radiographie.pays.valeur(
                      nomPays(societes.get(g.societe)?.paysMere ?? null) ?? fr.radiographie.nonDetermine,
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
    </Coque>
  );
}
