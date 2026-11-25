import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Domaines } from "@/components/territoires/Domaines";
import { adresseDepartement, adresseGroupement, adresseRegion, codeDeAdresse } from "@/lib/donnees/territoires";
import { fichierDepartementDuJour, indexTerritoiresDuJour } from "@/lib/donnees/territoires-lecture";
import { fr } from "@/lib/i18n/fr";
import { partageDe, robotsDe } from "@/lib/referencement";

type Props = { params: Promise<{ cle: string }> };
const t = fr.territoires;

/** The group an address names, by its SIREN: the day's index gives the département whose file lists it. */
async function groupementDe(cle: string) {
  const siren = codeDeAdresse(cle, "groupement");
  if (siren === null) notFound();
  const territoires = await indexTerritoiresDuJour();
  const code = territoires.groupements.get(siren);
  const departement = code === undefined ? undefined : territoires.departements.get(code);
  if (departement === undefined) notFound();
  const groupement = (await fichierDepartementDuJour(departement.code)).groupements.find((g) => g.siren === siren);
  if (groupement === undefined) notFound();
  const region = departement.region === null ? undefined : territoires.regions.get(departement.region);
  return { siren, groupement, departement, region };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siren, groupement } = await groupementDe((await params).cle);
  return {
    title: t.titreGroupement(groupement.nom),
    description: t.descriptionPage(groupement.nom),
    alternates: { canonical: adresseGroupement(siren, groupement.nom) },
    // As the communes' (D.7): out of the engines' indexes.
    robots: robotsDe(false),
    openGraph: partageDe(
      "accueil",
      fr.meta.titre(t.titreGroupement(groupement.nom)),
      t.descriptionPage(groupement.nom),
    ),
  };
}

// A group of communes (D.2; address: spec EX-26, by its SIREN): its sites, each with the category of its retained
// seat. An address whose name is not the group's answers with a permanent redirect to the right one.
export default async function GroupementPage({ params }: Props) {
  const { cle } = await params;
  const { siren, groupement, departement, region } = await groupementDe(cle);
  const adresse = adresseGroupement(siren, groupement.nom);
  if (`/groupements/${cle}` !== adresse) permanentRedirect(adresse);
  return (
    <Coque large>
      <FilAriane
        miettes={[
          { nom: fr.coque.navigation.territoires, chemin: "/territoires" },
          ...(region === undefined ? [] : [{ nom: region.nom, chemin: adresseRegion(region.code, region.nom) }]),
          { nom: departement.nom, chemin: adresseDepartement(departement.code, departement.nom) },
          { nom: groupement.nom, chemin: adresse },
        ]}
      />
      <p className="etiquette-capitales">{t.surtitres.groupement}</p>
      <h1 className="titre-page">{t.titreGroupement(groupement.nom)}</h1>
      <section className="releve" aria-labelledby="groupement-sites">
        <h2 id="groupement-sites">{t.sites}</h2>
        <Domaines domaines={groupement.domaines} />
      </section>
      <p className="releve-note">{t.source}</p>
    </Coque>
  );
}
