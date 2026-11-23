import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CarteFrance } from "@/components/carte/CarteFrance";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Domaines } from "@/components/territoires/Domaines";
import {
  adresseCommune,
  adresseDepartement,
  adresseGroupement,
  adresseRegion,
  codeDeAdresse,
} from "@/lib/donnees/territoires";
import { fichierDepartementDuJour, indexTerritoiresDuJour } from "@/lib/donnees/territoires-lecture";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe, robotsDe } from "@/lib/referencement";

type Props = { params: Promise<{ cle: string }> };
const t = fr.territoires;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = codeDeAdresse((await params).cle, "departement");
  const departement = code === null ? undefined : (await indexTerritoiresDuJour()).departements.get(code);
  if (code === null || departement === undefined) return {};
  return {
    title: t.titrePage(departement.nom),
    description: t.descriptionPage(departement.nom),
    alternates: { canonical: adresseDepartement(code, departement.nom) },
    robots: robotsDe(true),
    openGraph: partageDe("accueil", fr.meta.titre(t.titrePage(departement.nom)), t.descriptionPage(departement.nom)),
  };
}

// A département (D.2; address: spec EX-26): where it lies in its région, its council's sites, then its communes and
// its groups of communes in the order of their names, each with its sites. An address whose name is not the
// département's answers with a permanent redirect to the right one.
export default async function DepartementPage({ params }: Props) {
  const { cle } = await params;
  const code = codeDeAdresse(cle, "departement");
  if (code === null) notFound();
  const territoires = await indexTerritoiresDuJour();
  const departement = territoires.departements.get(code);
  if (departement === undefined) notFound();
  const adresse = adresseDepartement(code, departement.nom);
  if (`/departements/${cle}` !== adresse) permanentRedirect(adresse);
  const fichier = await fichierDepartementDuJour(code);
  const region = departement.region === null ? undefined : territoires.regions.get(departement.region);
  const voisins = [...territoires.departements.values()]
    .filter((d) => departement.region !== null && d.region === departement.region)
    .map((d) => d.code);
  const parNom = <T extends { nom: string }>(a: T, b: T) => a.nom.localeCompare(b.nom, "fr");
  return (
    <Coque large>
      <FilAriane
        miettes={[
          { nom: fr.coque.navigation.territoires, chemin: "/territoires" },
          ...(region === undefined ? [] : [{ nom: region.nom, chemin: adresseRegion(region.code, region.nom) }]),
          { nom: departement.nom, chemin: adresse },
        ]}
      />
      <p className="etiquette-capitales">{t.surtitres.departement}</p>
      <h1 className="titre-page">{t.titrePage(departement.nom)}</h1>
      <figure className="releve">
        <CarteFrance
          titre={t.carteDepartement(departement.nom)}
          surligner={new Set([code])}
          cadrer={new Set(voisins.length > 0 ? voisins : [code])}
        />
        <figcaption className="releve-note">{t.fond}</figcaption>
      </figure>
      <section className="releve" aria-labelledby="departement-conseil">
        <h2 id="departement-conseil">{t.conseilDepartemental}</h2>
        <Domaines domaines={fichier.conseil} />
      </section>
      <section className="releve" aria-labelledby="departement-communes">
        <h2 id="departement-communes">{t.communes}</h2>
        {fichier.communes.length === 0 ? (
          <p>{t.aucun}</p>
        ) : (
          <table className="releve-table liste-releve">
            <thead>
              <tr>
                <th scope="col">{t.colonnes.commune}</th>
                <th scope="col" className="nombre">
                  {t.colonnes.domaines}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...fichier.communes].sort(parNom).map((c) => (
                <tr key={c.code}>
                  <th scope="row">
                    <Link href={adresseCommune(c.code, c.nom)} prefetch={false}>
                      {c.nom}
                    </Link>
                  </th>
                  <td className="nombre valeur">{nombre(c.domaines.length)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="releve" aria-labelledby="departement-groupements">
        <h2 id="departement-groupements">{t.groupements}</h2>
        {fichier.groupements.length === 0 ? (
          <p>{t.aucun}</p>
        ) : (
          <table className="releve-table liste-releve">
            <thead>
              <tr>
                <th scope="col">{t.colonnes.groupement}</th>
                <th scope="col" className="nombre">
                  {t.colonnes.domaines}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...fichier.groupements].sort(parNom).map((g) => (
                <tr key={g.siren ?? g.nom}>
                  <th scope="row">
                    {g.siren === null ? (
                      g.nom
                    ) : (
                      <Link href={adresseGroupement(g.siren, g.nom)} prefetch={false}>
                        {g.nom}
                      </Link>
                    )}
                  </th>
                  <td className="nombre valeur">{nombre(g.domaines.length)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="releve-note">{t.source}</p>
    </Coque>
  );
}
