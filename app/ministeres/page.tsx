import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { lireMinisteres, type Ministere, sujetMinistere } from "@/lib/donnees/ministeres";
import { formeDeListe, parLettre } from "@/lib/donnees/societes";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { partageDe } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata: Metadata = {
  title: fr.ministeres.titre,
  description: fr.ministeres.description,
  alternates: { canonical: "/ministeres" },
  openGraph: partageDe("ministere", fr.meta.titre(fr.ministeres.titre), fr.ministeres.description),
};

const t = fr.ministeres;
type Props = { searchParams: Promise<{ forme?: string | string[] }> };

// The ministries (D.2, R8): those to which the DILA's Référentiel links measured sites, in alphabetical order (a list,
// never a ranking), each with its number of domains. Behind a closed door, no data is read: « not found ». Its form is
// provisional until the owner chooses (point 11): the current list by default; « ?forme=a » the table, « b » the
// groups, « c » the index by subject.
export default async function MinisteresPage({ searchParams }: Props) {
  // Behind a closed door, never rendered (« not found »); behind an open door, rendered on demand with the day's data,
  // never frozen at build time (its caching: D.4).
  if (!sitePublic()) notFound();
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  const lu = etat.statut === "ok" ? await lecteur.fichier("index/ministeres.json") : etat;
  if (lu.statut === "absent") notFound();
  const ministeres = lu.statut === "ok" ? lireMinisteres(lu.donnees) : null;
  if (ministeres === null || etat.statut !== "ok") indisponible();
  const forme = formeDeListe((await searchParams).forme);
  const lien = (m: Ministere) => (
    <Link href={`/ministeres/${m.slug}`} prefetch={false}>
      {m.nom}
    </Link>
  );
  const element = (m: Ministere) => (
    <li key={m.id}>
      {lien(m)}
      <p className="valeur">{t.domaines(m.domaines.length, nombre(m.domaines.length))}</p>
    </li>
  );
  const ordre = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  const parSujet = [...ministeres].sort((a, b) => ordre.compare(sujetMinistere(a.nom), sujetMinistere(b.nom)));
  const groupes: [string, Ministere[]][] = [
    [t.natures.ministeres, ministeres.filter((m) => m.nom.startsWith("Ministère"))],
    [t.natures.autres, ministeres.filter((m) => !m.nom.startsWith("Ministère"))],
  ];
  return (
    <Coque large={forme === "a" || forme === "c"}>
      <FilAriane miettes={[{ nom: fr.coque.navigation.ministeres, chemin: "/ministeres" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <p className="releve-note">{t.entete(nombre(ministeres.length))}</p>
      {forme === "a" ? (
        <table className="releve-table liste-releve">
          <thead>
            <tr>
              <th scope="col">{t.colonnes.ministere}</th>
              <th scope="col" className="nombre">
                {t.colonnes.domaines}
              </th>
            </tr>
          </thead>
          <tbody>
            {ministeres.map((m) => (
              <tr key={m.id}>
                <th scope="row">{lien(m)}</th>
                <td className="nombre valeur">{nombre(m.domaines.length)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : forme === "b" ? (
        groupes.map(([titre, liste], i) =>
          liste.length === 0 ? null : (
            <section key={titre} className="liste-groupe" aria-labelledby={`groupe-${i}`}>
              <h2 id={`groupe-${i}`}>
                {titre} <span className="valeur">{nombre(liste.length)}</span>
              </h2>
              <ul className="liste-societes">{liste.map(element)}</ul>
            </section>
          ),
        )
      ) : forme === "c" ? (
        <div className="index-alpha">
          {parLettre(parSujet, (m) => sujetMinistere(m.nom)).map(([lettre, liste]) => (
            <section key={lettre} aria-label={t.lettre(lettre)}>
              <p className="index-lettre" aria-hidden="true">
                {lettre}
              </p>
              <ul>
                {liste.map((m) => (
                  <li key={m.id}>
                    {lien(m)} <span className="valeur">{nombre(m.domaines.length)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="liste-societes">{ministeres.map(element)}</ul>
      )}
    </Coque>
  );
}
