import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Domaines } from "@/components/territoires/Domaines";
import {
  adresseCommune,
  adresseDepartement,
  adresseRegion,
  codeDeAdresse,
  departementDeCommune,
} from "@/lib/donnees/territoires";
import { fichierDepartementDuJour, indexTerritoiresDuJour } from "@/lib/donnees/territoires-lecture";
import { fr } from "@/lib/i18n/fr";
import { partageDe, robotsDe } from "@/lib/referencement";

type Props = { params: Promise<{ cle: string }> };
const t = fr.territoires;

/** The commune an address names, from its département's file; « not found » when the day's indexes do not list it. */
async function communeDe(cle: string) {
  const code = codeDeAdresse(cle, "commune");
  if (code === null) notFound();
  const territoires = await indexTerritoiresDuJour();
  const departement = territoires.departements.get(departementDeCommune(code));
  if (departement === undefined) notFound();
  const commune = (await fichierDepartementDuJour(departement.code)).communes.find((c) => c.code === code);
  if (commune === undefined) notFound();
  const region = departement.region === null ? undefined : territoires.regions.get(departement.region);
  return { commune, departement, region };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { commune } = await communeDe((await params).cle);
  return {
    title: t.titreCommune(commune.nom),
    description: t.descriptionPage(commune.nom),
    alternates: { canonical: adresseCommune(commune.code, commune.nom) },
    // The pages of communes stay out of the engines' indexes (D.7: tens of thousands of pages of one model).
    robots: robotsDe(false),
    openGraph: partageDe("accueil", fr.meta.titre(t.titreCommune(commune.nom)), t.descriptionPage(commune.nom)),
  };
}

// A commune (D.2; address: spec EX-26): the sites of its town hall, each with the category of its retained seat. An
// address whose name is not the commune's answers with a permanent redirect to the right one.
export default async function CommunePage({ params }: Props) {
  const { cle } = await params;
  const { commune, departement, region } = await communeDe(cle);
  const adresse = adresseCommune(commune.code, commune.nom);
  if (`/communes/${cle}` !== adresse) permanentRedirect(adresse);
  return (
    <Coque large>
      <FilAriane
        miettes={[
          { nom: fr.coque.navigation.territoires, chemin: "/territoires" },
          ...(region === undefined ? [] : [{ nom: region.nom, chemin: adresseRegion(region.code, region.nom) }]),
          { nom: departement.nom, chemin: adresseDepartement(departement.code, departement.nom) },
          { nom: commune.nom, chemin: adresse },
        ]}
      />
      <p className="etiquette-capitales">{t.surtitres.commune}</p>
      <h1 className="titre-page">{t.titreCommune(commune.nom)}</h1>
      <section className="releve" aria-labelledby="commune-sites">
        <h2 id="commune-sites">{t.sites}</h2>
        <Domaines domaines={commune.domaines} />
      </section>
      <p className="releve-note">{t.source}</p>
    </Coque>
  );
}
