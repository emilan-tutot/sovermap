import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { lireIndexPays, paysDuSlug, societesDuPays } from "@/lib/donnees/pays";
import { lireIndexSocietes } from "@/lib/donnees/radiographie";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe, robotsDe } from "@/lib/referencement";

type Props = { params: Promise<{ slug: string }> };

const t = fr.pays;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = paysDuSlug(slug);
  if (p === null) return {};
  // Indexable only when the country serves at least one domain: an empty page is never offered to the engines
  // (docs/referencement.md). Behind a closed door, the reader reads nothing.
  const etat = await lecteur.etat();
  const lu = etat.statut === "ok" ? await lecteur.fichier("index/pays.json") : etat;
  const index = lu.statut === "ok" ? lireIndexPays(lu.donnees) : null;
  return {
    title: t.titrePage(p.nom),
    description: t.descriptionPage(p.nom),
    alternates: { canonical: `/pays/${slug}` },
    robots: robotsDe((index?.get(p.code)?.domaines ?? 0) > 0),
    openGraph: partageDe("pays", fr.meta.titre(t.titrePage(p.nom)), t.descriptionPage(p.nom)),
  };
}

// A country's page (D.2, R7): the domains served from companies whose ultimate parent has its seat there, and those
// companies, each leading to its page. The country of a seat, never the place of the servers (DESIGN.md §8). Behind a
// closed door, no data is read: « not found ».
export default async function PaysPage({ params }: Props) {
  const p = paysDuSlug((await params).slug);
  if (p === null) notFound();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  const [luPays, luSocietes] =
    etat.statut === "ok"
      ? await Promise.all([lecteur.fichier("index/pays.json"), lecteur.fichier("index/exploitants.json")])
      : [etat, etat];
  const index = luPays.statut === "ok" ? lireIndexPays(luPays.donnees) : null;
  const societes = luSocietes.statut === "ok" ? lireIndexSocietes(luSocietes.donnees) : null;
  if (index === null || societes === null || etat.statut !== "ok") indisponible();
  const chiffres = index.get(p.code) ?? { domaines: 0, domainesEtat: 0 };
  const liste = societesDuPays(p.code, societes);
  return (
    <Coque>
      <FilAriane miettes={[{ nom: p.nom, chemin: `/pays/${(await params).slug}` }]} />
      <p className="etiquette-capitales">{t.surtitre}</p>
      <h1 className="titre-page titre-vole">
        {/* The name that flew from the Atlas's table of countries (DESIGN.md § 7). */}
        <ViewTransition name={`pays-${p.code}`} share={{ vole: "vole", default: "none" }} default="none">
          <span>{p.nom}</span>
        </ViewTransition>
      </h1>
      <p className="chapo">{t.honnetete}</p>
      <p className="valeur">{t.domaines(nombre(chiffres.domaines), nombre(chiffres.domainesEtat))}</p>
      <section className="releve" aria-labelledby="titre-societes">
        <h2 id="titre-societes">{t.societes}</h2>
        {liste.length === 0 ? (
          <p>{t.aucune}</p>
        ) : (
          <ul className="liste-societes">
            {liste.map(([cle, s]) => (
              <li key={cle}>
                <Link href={`/societes/${cle}`} prefetch={false}>
                  {s.nom}
                </Link>
                {s.controle === null ? null : <p>{fr.societes.controle(s.controle)}</p>}
                <p className="valeur">{fr.societes.domaines(s.domaines, nombre(s.domaines))}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Coque>
  );
}
