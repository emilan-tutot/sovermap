import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { type Categorie, lireIndexSocietes, nomPays, type SocieteIndex } from "@/lib/donnees/radiographie";
import { formeDeListe, parLettre, societesTriees } from "@/lib/donnees/societes";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata: Metadata = {
  title: fr.societes.titre,
  description: fr.societes.description,
  alternates: { canonical: "/societes" },
  openGraph: partageDe("societe", fr.meta.titre(fr.societes.titre), fr.societes.description),
};

const t = fr.societes;
type Props = { searchParams: Promise<{ forme?: string | string[] }> };

/** The country of a company's ultimate parent's seat, as the list says it (« court »: under the table's header). */
const siegeDe = (s: SocieteIndex, court = false) =>
  s.mere === null
    ? t.siegeInconnu
    : (court ? t.siegeCourt : t.siege)(
        nomPays(s.paysMere) ?? s.paysMere ?? fr.radiographie.nonDetermine,
        fr.radiographie.categories[s.categorie],
      );

const GROUPES: Categorie[] = ["France", "UE hors France", "Europe hors UE", "hors d'Europe", "non déterminé"];

// The companies (D.2, R9): those that host or deliver the measured sites that day, in alphabetical order (a list,
// never a ranking), each with the country of its ultimate parent's seat and the number of domains it serves. Behind a
// closed door, no data is read: the page answers « not found ». Its form is provisional until the owner chooses
// (point 11, Q2): the table (A, recommended) by default; « ?forme=b » the groups, « c » the index, « liste » the former
// list.
export default async function SocietesPage({ searchParams }: Props) {
  // Behind a closed door, never rendered (« not found »); behind an open door, rendered on demand with the day's data,
  // never frozen at build time (its caching: D.4).
  if (!sitePublic()) notFound();
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  const lu = etat.statut === "ok" ? await lecteur.fichier("index/exploitants.json") : etat;
  const index = lu.statut === "ok" ? lireIndexSocietes(lu.donnees) : null;
  if (lu.statut === "absent") notFound();
  if (index === null || etat.statut !== "ok") indisponible();
  const societes = societesTriees(index);
  const forme = formeDeListe((await searchParams).forme);
  const lien = (cle: string, s: SocieteIndex) => (
    <Link href={`/societes/${cle}`} prefetch={false}>
      {s.nom}
    </Link>
  );
  return (
    <Coque large={forme === "a" || forme === "c"}>
      <FilAriane miettes={[{ nom: fr.coque.navigation.societes, chemin: "/societes" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <p className="releve-note">{t.entete(nombre(societes.length))}</p>
      {forme === "a" ? (
        <table className="releve-table liste-releve">
          <thead>
            <tr>
              <th scope="col">{t.colonnes.societe}</th>
              <th scope="col">{t.colonnes.siege}</th>
              <th scope="col" className="nombre">
                {t.colonnes.domaines}
              </th>
            </tr>
          </thead>
          <tbody>
            {societes.map(([cle, s]) => (
              <tr key={cle}>
                <th scope="row">
                  {lien(cle, s)}
                  {s.controle === null ? null : <span className="liste-controle">{t.controle(s.controle)}</span>}
                </th>
                <td>{siegeDe(s, true)}</td>
                <td className="nombre valeur">{nombre(s.domaines)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : forme === "b" ? (
        GROUPES.map((g, i) => {
          const du = societes.filter(([, s]) => (s.mere === null ? "non déterminé" : s.categorie) === g);
          return du.length === 0 ? null : (
            <section key={g} className="liste-groupe" aria-labelledby={`groupe-${i}`}>
              <h2 id={`groupe-${i}`}>
                {t.groupes[g]} <span className="valeur">{nombre(du.length)}</span>
              </h2>
              <ul className="liste-societes">
                {du.map(([cle, s]) => (
                  <li key={cle}>
                    {lien(cle, s)}
                    {s.mere === null ? null : (
                      <p>{t.pays(nomPays(s.paysMere) ?? s.paysMere ?? fr.radiographie.nonDetermine)}</p>
                    )}
                    {s.controle === null ? null : <p>{t.controle(s.controle)}</p>}
                    <p className="valeur">{t.domaines(s.domaines, nombre(s.domaines))}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      ) : forme === "c" ? (
        <div className="index-alpha">
          {parLettre(societes, ([, s]) => s.nom).map(([lettre, liste]) => (
            <section key={lettre} aria-label={t.lettre(lettre)}>
              <p className="index-lettre" aria-hidden="true">
                {lettre}
              </p>
              <ul>
                {liste.map(([cle, s]) => (
                  <li key={cle}>
                    {lien(cle, s)} <span className="valeur">{nombre(s.domaines)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="liste-societes">
          {societes.map(([cle, s]) => (
            <li key={cle}>
              {lien(cle, s)}
              <p>{siegeDe(s)}</p>
              {s.controle === null ? null : <p>{t.controle(s.controle)}</p>}
              <p className="valeur">{t.domaines(s.domaines, nombre(s.domaines))}</p>
            </li>
          ))}
        </ul>
      )}
    </Coque>
  );
}
