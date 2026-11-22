import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Valeur } from "@/components/texte/Valeur";
import { cheminJour, estJour, joursPublies, lireJour, parCouche } from "@/lib/donnees/journal";
import { lecteur } from "@/lib/donnees/lecture";
import { dateFr, nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe, robotsDe } from "@/lib/referencement";

type Props = { params: Promise<{ date: string }> };

const t = fr.journal;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  // A day of the journal is never indexed: one a day, all alike; its links are followed (docs/referencement.md).
  return estJour(date)
    ? {
        title: t.titreJour(dateFr(date)),
        description: t.descriptionJour(dateFr(date)),
        alternates: { canonical: `/journal/${date}` },
        robots: robotsDe(false),
        openGraph: partageDe("accueil", fr.meta.titre(t.titreJour(dateFr(date))), t.descriptionJour(dateFr(date))),
      }
    : {};
}

// A day of the journal (D.2, R10): its confirmed changes by layer, each domain leading to its Radiographie. A day the
// state does not publish: « not found ». Behind a closed door, no data is read: « not found ».
export default async function JourPage({ params }: Props) {
  const { date } = await params;
  if (!estJour(date)) notFound();
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
  if (!joursPublies(etat.donnees).includes(date)) notFound();
  const lu = await lecteur.fichier(cheminJour(date));
  const jour = lu.statut === "ok" ? lireJour(lu.donnees) : null;
  return (
    <Coque>
      <FilAriane
        miettes={[
          { nom: fr.coque.navigation.journal, chemin: "/journal" },
          { nom: dateFr(date), chemin: `/journal/${date}` },
        ]}
      />
      <p className="etiquette-capitales">{t.titre}</p>
      <h1 className="titre-page">{t.jour(dateFr(date))}</h1>
      {jour === null ? (
        <p className="note">{fr.radiographie.indisponible}</p>
      ) : jour.etatInitial ? (
        <p className="chapo">{t.etatInitial}</p>
      ) : jour.reglesChangees ? (
        <p className="chapo">{t.reglesChangees}</p>
      ) : (
        <>
          <p className="chapo">{t.changements(jour.changements.length, nombre(jour.changements.length))}</p>
          {parCouche(jour.changements).map(([couche, liste]) => (
            <section key={couche} className="releve" aria-labelledby={`couche-${couche}`}>
              <h2 id={`couche-${couche}`}>{t.couches[couche]}</h2>
              <ul className="liste-societes">
                {liste.map((c) => (
                  <li key={`${c.domaine}-${c.avant}-${c.apres}`}>
                    <Link href={`/radiographie/${c.domaine}`} prefetch={false} className="valeur">
                      <Valeur texte={c.domaine} />
                    </Link>
                    <p>{t.avantApres(c.avant, c.apres)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      <p>
        <Link href="/journal" prefetch={false}>
          {t.retour}
        </Link>
      </p>
    </Coque>
  );
}
