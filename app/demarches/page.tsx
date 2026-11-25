import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Valeur } from "@/components/texte/Valeur";
import { type DemarcheServie, lireIndexDemarches, servieDe } from "@/lib/donnees/demarches";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { type IndexSocietes, lireIndexSocietes } from "@/lib/donnees/radiographie";
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

/**
 * The name of its address: a raw value, which breaks only after a dot (DESIGN.md § 6; a démarche's name may not be its
 * domain's web name, which a Radiographie shows).
 */
function Adresse({ d }: { d: DemarcheServie }) {
  if (d.hote === null) return <>{t.sansAdresse}</>;
  return (
    <>
      <span className="valeur">
        <Valeur texte={d.hote} />
      </span>
      {d.mesure === null ? <span className="releve-note"> {t.note(t.nonMesure)}</span> : null}
    </>
  );
}

/**
 * Who serves it (servieDe): the companies of the day's index, linked to their page; a company the index does not name
 * that day says so, as the Radiographie does; or why there is none.
 */
function Servie({ d, societes }: { d: DemarcheServie; societes: IndexSocietes }) {
  const s = servieDe(d.mesure, (cle) => societes.get(cle)?.nom);
  switch (s.sorte) {
    case "non mesuree":
      return null;
    case "sans reponse":
      return <>{t.etats[s.etat]}</>;
    case "servie":
      return (
        <>
          {s.societes.length === 0
            ? t.sansSociete
            : s.societes.map(({ cle, nom }, i) => (
                <span key={cle}>
                  {i > 0 ? t.separateur : null}
                  {nom === null ? (
                    fr.radiographie.mere.nomNonPublie
                  ) : (
                    <Link href={`/societes/${cle}`} prefetch={false}>
                      {nom}
                    </Link>
                  )}
                </span>
              ))}
          {s.partiel ? <span className="releve-note"> {t.note(t.partiel)}</span> : null}
        </>
      );
    default: {
      const jamais: never = s;
      return jamais;
    }
  }
}

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
      {/* The table follows a source's edition (its words, its host names): rather than be clipped by the page's frame,
          it scrolls sideways inside its own, reachable by the keyboard (the review of the démarches' page). */}
      <div className="tableau-defilant" tabIndex={0} role="region" aria-label={t.tableau}>
        <table className="releve-table liste-releve">
          <thead>
            <tr>
              <th scope="col">{t.colonnes.demarche}</th>
              <th scope="col">{t.colonnes.perimetre}</th>
              <th scope="col" className="nombre">
                {t.colonnes.volume}
              </th>
              <th scope="col">{t.colonnes.adresse}</th>
              <th scope="col">{t.colonnes.servie}</th>
              <th scope="col">{t.colonnes.siege}</th>
            </tr>
          </thead>
          <tbody>
            {index.demarches.map((d) => (
              <tr key={d.id}>
                <th scope="row">{d.nom}</th>
                <td>{d.perimetre}</td>
                <td className="nombre valeur">{d.volumeTotal === null ? t.sansVolume : nombre(d.volumeTotal)}</td>
                <td>
                  <Adresse d={d} />
                </td>
                <td>
                  <Servie d={d} societes={societes} />
                </td>
                <td className={d.mesure?.etat === "ok" && d.mesure.horsUE === true ? "hors-ue" : undefined}>
                  {d.mesure === null || d.mesure.etat !== "ok" ? null : fr.radiographie.categories[d.mesure.categorie]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="releve-note">{t.source(String(index.edition), index.periode)}</p>
    </Coque>
  );
}
