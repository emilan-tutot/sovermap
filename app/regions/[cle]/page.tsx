import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CarteFrance } from "@/components/carte/CarteFrance";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Valeur } from "@/components/texte/Valeur";
import { adresseDepartement, adresseRegion, codeDeAdresse } from "@/lib/donnees/territoires";
import { indexTerritoiresDuJour } from "@/lib/donnees/territoires-lecture";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe, robotsDe } from "@/lib/referencement";

type Props = { params: Promise<{ cle: string }> };
const t = fr.territoires;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = codeDeAdresse((await params).cle, "region");
  const region = code === null ? undefined : (await indexTerritoiresDuJour()).regions.get(code);
  if (code === null || region === undefined) return {};
  return {
    title: t.titrePage(region.nom),
    description: t.descriptionPage(region.nom),
    alternates: { canonical: adresseRegion(code, region.nom) },
    robots: robotsDe(true),
    openGraph: partageDe("accueil", fr.meta.titre(t.titrePage(region.nom)), t.descriptionPage(region.nom)),
  };
}

// A région (D.2; address: spec EX-26): its map with its départements, its council's sites, and its départements in the
// order of their names, each with its number of domains. An address whose name is not the région's answers with a
// permanent redirect to the right one.
export default async function RegionPage({ params }: Props) {
  const { cle } = await params;
  const code = codeDeAdresse(cle, "region");
  if (code === null) notFound();
  const territoires = await indexTerritoiresDuJour();
  const region = territoires.regions.get(code);
  if (region === undefined) notFound();
  const adresse = adresseRegion(code, region.nom);
  if (`/regions/${cle}` !== adresse) permanentRedirect(adresse);
  const departements = [...territoires.departements.values()]
    .filter((d) => d.region === code)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return (
    <Coque large>
      <FilAriane
        miettes={[
          { nom: fr.coque.navigation.territoires, chemin: "/territoires" },
          { nom: region.nom, chemin: adresse },
        ]}
      />
      <p className="etiquette-capitales">{t.surtitres.region}</p>
      <h1 className="titre-page">{t.titrePage(region.nom)}</h1>
      <figure className="releve">
        <CarteFrance titre={t.carteRegion(region.nom)} cadrer={new Set(departements.map((d) => d.code))} />
        <figcaption className="releve-note">{t.fond}</figcaption>
      </figure>
      <section className="releve" aria-labelledby="region-conseil">
        <h2 id="region-conseil">{t.conseilRegional}</h2>
        {region.conseil.length === 0 ? (
          <p>{t.aucun}</p>
        ) : (
          <ul>
            {region.conseil.map((d) => (
              <li key={d}>
                <Link href={`/radiographie/${d}`} prefetch={false}>
                  <Valeur texte={d} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="releve" aria-labelledby="region-departements">
        <h2 id="region-departements">{t.departements}</h2>
        <table className="releve-table liste-releve">
          <thead>
            <tr>
              <th scope="col">{t.colonnes.departement}</th>
              <th scope="col" className="nombre">
                {t.colonnes.domaines}
              </th>
            </tr>
          </thead>
          <tbody>
            {departements.map((d) => (
              <tr key={d.code}>
                <th scope="row">
                  <Link href={adresseDepartement(d.code, d.nom)} prefetch={false}>
                    {d.nom}
                  </Link>
                </th>
                <td className="nombre valeur">{nombre(d.domaines)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="releve-note">{t.source}</p>
    </Coque>
  );
}
