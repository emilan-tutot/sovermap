import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ListeAttributions } from "@/components/donnees/ListeAttributions";
import { SourcesDuJour } from "@/components/donnees/SourcesDuJour";
import { PageTexte } from "@/components/texte/PageTexte";
import { attributionsDe } from "@/lib/donnees/attributions";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { donneesOuvertesDe } from "@/lib/donnees/ouvertes";
import { sources as page } from "@/lib/i18n/fr-textes";
import { metadonneesTexte } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata = metadonneesTexte(page);

// Sources and attributions (E.1, F.1): the rules of the registry of sources, in words (lib/i18n/fr-textes.ts), then
// what the day's state was made from: its downloads, and the attributions with the real dates of their files. Behind a
// closed door, no data is read: « not found ».
export default async function Page() {
  if (!sitePublic()) notFound();
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  if (etat.statut !== "ok") indisponible();
  return (
    <PageTexte page={page}>
      <SourcesDuJour donnees={donneesOuvertesDe(etat.donnees)} />
      <ListeAttributions attributions={attributionsDe(etat.donnees)} />
    </PageTexte>
  );
}
