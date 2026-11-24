import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { lireIndexDemarches } from "@/lib/donnees/demarches";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { lireIndexSocietes } from "@/lib/donnees/radiographie";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata: Metadata = {
  title: fr.demarches.titre,
  description: fr.demarches.description,
  alternates: { canonical: "/demarches" },
  // The site's general share image (« Qui héberge l'État ? »), as for the other pages that are not a record.
  openGraph: partageDe("accueil", fr.meta.titre(fr.demarches.titre), fr.demarches.description),
};

const t = fr.demarches;

// The démarches (C.8, D.2): those the DINUM's Observatoire follows, the most used first (the volume of its edition:
// what D.2 asks here, never a ranking of hosts), each with the name of its address and the companies that serve it that
// day. Never a mark of the Observatoire. Behind a closed door, no data is read: « not found ».
export default async function DemarchesPage() {
  // Behind a closed door, never rendered (« not found »); behind an open door, rendered on demand with the day's data,
  // never frozen at build time (its caching: D.4).
  if (!sitePublic()) notFound();
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  const lu = etat.statut === "ok" ? await lecteur.fichier("index/demarches.json") : etat;
  if (lu.statut === "absent") notFound();
  const index = lu.statut === "ok" ? lireIndexDemarches(lu.donnees) : null;
  const luSocietes = etat.statut === "ok" ? await lecteur.fichier("index/exploitants.json") : etat;
  const societes = luSocietes.statut === "ok" ? lireIndexSocietes(luSocietes.donnees) : null;
  if (index === null || societes === null || etat.statut !== "ok") indisponible();
  return (
    <Coque large>
      <FilAriane miettes={[{ nom: fr.coque.navigation.demarches, chemin: "/demarches" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <p className="releve-note">{t.entete(nombre(index.demarches.length), String(index.edition), index.periode)}</p>
      <table className="releve-table liste-releve">
        <thead>
          <tr>
            <th scope="col">{t.colonnes.demarche}</th>
            <th scope="col">{t.colonnes.ministere}</th>
            <th scope="col" className="nombre">
              {t.colonnes.volume}
            </th>
            <th scope="col">{t.colonnes.adresse}</th>
            <th scope="col">{t.colonnes.servie}</th>
            <th scope="col">{t.colonnes.siege}</th>
          </tr>
        </thead>
        <tbody>
          {index.demarches.map((d) => {
            const servants = (d.mesure?.societes ?? []).flatMap((cle) => {
              const s = societes.get(cle);
              return s === undefined ? [] : [{ cle, nom: s.nom }];
            });
            return (
              <tr key={d.id}>
                <th scope="row">{d.nom}</th>
                <td>{d.perimetre}</td>
                <td className="nombre valeur">{d.volumeTotal === null ? t.sansVolume : nombre(d.volumeTotal)}</td>
                <td>
                  {d.hote === null || d.domaine === null ? (
                    t.sansAdresse
                  ) : d.mesure === null ? (
                    <>
                      {d.hote} <span className="releve-note">({t.nonMesuree})</span>
                    </>
                  ) : (
                    <Link href={`/radiographie/${d.domaine}`} prefetch={false}>
                      {d.hote}
                    </Link>
                  )}
                </td>
                <td>
                  {d.mesure === null
                    ? null
                    : servants.length === 0
                      ? t.sansSociete
                      : servants.map((s, i) => (
                          <span key={s.cle}>
                            {i > 0 ? ", " : null}
                            <Link href={`/societes/${s.cle}`} prefetch={false}>
                              {s.nom}
                            </Link>
                          </span>
                        ))}
                </td>
                <td className={d.mesure?.horsUE === true ? "hors-ue" : undefined}>
                  {d.mesure === null ? null : fr.radiographie.categories[d.mesure.categorie]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="releve-note">{t.source(String(index.edition), index.periode)}</p>
    </Coque>
  );
}
