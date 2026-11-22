import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { adresseFichierOuvert, donneesOuvertesDe, FICHIERS_OUVERTS } from "@/lib/donnees/ouvertes";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { dateFr } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { jsonLdDataset, partageDe } from "@/lib/referencement";
import { origineDuSite, sitePublic } from "@/lib/site";

const t = fr.donneesOuvertes;

export const metadata: Metadata = {
  title: t.titre,
  description: t.description,
  alternates: { canonical: "/donnees" },
  openGraph: partageDe("accueil", fr.meta.titre(t.titre), t.description),
};

// The open data (F.1): the day's files in the « donnees-courant » release, their licences, the day's dated sources,
// the method's version, how to check a file; and the Dataset structured data (D.7). Behind a closed door: « not found ».
export default async function DonneesPage() {
  if (!sitePublic()) notFound();
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  if (etat.statut !== "ok") indisponible();
  const d = donneesOuvertesDe(etat.donnees);
  const compte = process.env["SOVERMAP_GITHUB_OWNER"];
  const fichiers = FICHIERS_OUVERTS.map((f) => ({ fichier: f, adresse: adresseFichierOuvert(f, compte) }));
  return (
    <Coque>
      <FilAriane miettes={[{ nom: t.titre, chemin: "/donnees" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <section className="texte-section" aria-labelledby="donnees-fichiers">
        <h2 id="donnees-fichiers">{t.fichiers}</h2>
        <p>{t.fichiersDate(dateFr(d.date))}</p>
        <ul>
          {fichiers.map(({ fichier, adresse }) => (
            <li key={fichier}>
              {adresse === null ? (
                <span className="valeur">{fichier}</span>
              ) : (
                <a href={adresse} className="valeur">
                  {fichier}
                </a>
              )}{" "}
              {t.noms[fichier]}
            </li>
          ))}
        </ul>
      </section>
      <section className="texte-section" aria-labelledby="donnees-licences">
        <h2 id="donnees-licences">{t.licences}</h2>
        <ul>
          {t.licencesTexte.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
      <section className="texte-section" aria-labelledby="donnees-sources">
        <h2 id="donnees-sources">{t.sources}</h2>
        {d.methode === null ? null : <p>{t.methode(d.methode)}</p>}
        <ul>
          {d.sources.map((s) => (
            <li key={`${s.id}-${s.fiche}`}>
              {t.source(s.id, s.fiche, s.date === null ? t.sansDate : dateFr(s.date), s.etat)}
            </li>
          ))}
        </ul>
      </section>
      <section className="texte-section" aria-labelledby="donnees-verifier">
        <h2 id="donnees-verifier">{t.verifier}</h2>
        <p>{t.verifierTexte}</p>
        <pre className="commande valeur" tabIndex={0} aria-label={t.commandeWindows}>
          {t.commandes.windows}
        </pre>
        <pre className="commande valeur" tabIndex={0} aria-label={t.commandeUnix}>
          {t.commandes.unix}
        </pre>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdDataset(
            origineDuSite(),
            d.date,
            fichiers.flatMap(({ fichier, adresse }) =>
              adresse !== null && fichier.endsWith(".csv") ? [{ fichier, adresse }] : [],
            ),
          ),
        }}
      />
    </Coque>
  );
}
