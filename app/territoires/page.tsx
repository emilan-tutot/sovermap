import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CarteFrance } from "@/components/carte/CarteFrance";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { adresseDepartement, adresseRegion, lireIndexTerritoires } from "@/lib/donnees/territoires";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata: Metadata = {
  title: fr.territoires.titre,
  description: fr.territoires.description,
  alternates: { canonical: "/territoires" },
  openGraph: partageDe("accueil", fr.meta.titre(fr.territoires.titre), fr.territoires.description),
};

const t = fr.territoires;
const parNom = <T extends { nom: string }>(a: T, b: T) => a.nom.localeCompare(b.nom, "fr");

// The territories (D.2, decision C2-2): the map of France, then the régions and the overseas collectivities without a
// région, in the order of their names (a list, never a ranking), each with its number of domains. Behind a closed
// door, no data is read: « not found ».
export default async function TerritoiresPage() {
  if (!sitePublic()) notFound();
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  const lu = etat.statut === "ok" ? await lecteur.fichier("index/territoires.json") : etat;
  if (lu.statut === "absent") notFound();
  const index = lu.statut === "ok" ? lireIndexTerritoires(lu.donnees) : null;
  if (index === null || etat.statut !== "ok") indisponible();
  const regions = [...index.regions.values()].sort(parNom);
  const sansRegion = [...index.departements.values()].filter((d) => d.region === null).sort(parNom);
  return (
    <Coque large>
      <FilAriane miettes={[{ nom: fr.coque.navigation.territoires, chemin: "/territoires" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <figure className="releve">
        <CarteFrance titre={t.carte} />
        <figcaption className="releve-note">{t.fond}</figcaption>
      </figure>
      <section className="releve" aria-labelledby="territoires-regions">
        <h2 id="territoires-regions">{t.regions}</h2>
        <table className="releve-table liste-releve">
          <thead>
            <tr>
              <th scope="col">{t.colonnes.region}</th>
              <th scope="col" className="nombre">
                {t.colonnes.domaines}
              </th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.code}>
                <th scope="row">
                  <Link href={adresseRegion(r.code, r.nom)} prefetch={false}>
                    {r.nom}
                  </Link>
                </th>
                <td className="nombre valeur">{nombre(r.domaines)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {sansRegion.length === 0 ? null : (
        <section className="releve" aria-labelledby="territoires-outre-mer">
          <h2 id="territoires-outre-mer">{t.outreMer}</h2>
          <ul>
            {sansRegion.map((d) => (
              <li key={d.code}>
                <Link href={adresseDepartement(d.code, d.nom)} prefetch={false}>
                  {d.nom}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="releve-note">{t.source}</p>
    </Coque>
  );
}
