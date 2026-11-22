import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { lecteur } from "@/lib/donnees/lecture";
import { lireIndexPays, paysDuSlug, societesDuPays } from "@/lib/donnees/pays";
import { lireIndexSocietes } from "@/lib/donnees/radiographie";
import { dateFr, nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

type Props = { params: Promise<{ slug: string }> };

const t = fr.pays;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = paysDuSlug((await params).slug);
  return p === null ? {} : { title: t.titrePage(p.nom), description: t.descriptionPage(p.nom) };
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
  if (index === null || societes === null || etat.statut !== "ok") {
    return (
      <Coque>
        <h1 className="titre-page">{p.nom}</h1>
        <p className="note">{fr.radiographie.indisponible}</p>
      </Coque>
    );
  }
  const chiffres = index.get(p.code) ?? { domaines: 0, domainesEtat: 0 };
  const liste = societesDuPays(p.code, societes);
  return (
    <Coque>
      <p className="etiquette-capitales">{t.surtitre}</p>
      <h1 className="titre-page">{p.nom}</h1>
      <p className="chapo">{t.honnetete}</p>
      <p className="releve-note">{fr.radiographie.collecte(dateFr(etat.donnees.date))}</p>
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
