import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { cheminJour, joursPublies, lireJour } from "@/lib/donnees/journal";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { dateFr, nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { CHEMIN_FLUX } from "@/lib/journal-flux";
import { partageDe } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata: Metadata = {
  title: fr.journal.titre,
  description: fr.journal.description,
  // The Atom feed of the journal (point 13, § 10), announced to feed readers.
  alternates: {
    canonical: "/journal",
    types: { "application/atom+xml": [{ url: CHEMIN_FLUX, title: fr.journal.flux.titre }] },
  },
  openGraph: partageDe("accueil", fr.meta.titre(fr.journal.titre), fr.journal.description),
};

const t = fr.journal;

// The journal (D.2, R10): every published day, the latest first, with its number of confirmed changes, or why it has
// none (the first day; a day of new rules). Behind a closed door, no data is read: « not found ».
export default async function JournalPage() {
  // Behind a closed door, never rendered (« not found »); behind an open door, rendered on demand with the day's data,
  // never frozen at build time (its caching: D.4).
  if (!sitePublic()) notFound();
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  if (etat.statut !== "ok") indisponible();
  const jours = await Promise.all(
    joursPublies(etat.donnees).map(async (date) => {
      const lu = await lecteur.fichier(cheminJour(date));
      return { date, jour: lu.statut === "ok" ? lireJour(lu.donnees) : null };
    }),
  );
  return (
    <Coque>
      <FilAriane miettes={[{ nom: fr.coque.navigation.journal, chemin: "/journal" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      {/* A file, not a page: a plain link (no prefetch, no navigation of the app). */}
      <p className="releve-note">
        <a href={CHEMIN_FLUX} type="application/atom+xml">
          {t.flux.lien}
        </a>
      </p>
      <ul className="liste-societes">
        {jours.map(({ date, jour }) => (
          <li key={date}>
            <Link href={`/journal/${date}`} prefetch={false}>
              {t.jour(dateFr(date))}
            </Link>
            <p>
              {jour === null
                ? fr.radiographie.indisponible
                : jour.etatInitial
                  ? t.etatInitial
                  : jour.reglesChangees
                    ? t.reglesChangees
                    : t.changements(jour.changements.length, nombre(jour.changements.length))}
            </p>
          </li>
        ))}
      </ul>
    </Coque>
  );
}
