import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { lireIndexSocietes, nomPays, type SocieteIndex } from "@/lib/donnees/radiographie";
import { societesTriees } from "@/lib/donnees/societes";
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

/** The retained seat (the farther of the company's and its ultimate parent's), as the table says it. */
const siegeDe = (s: SocieteIndex) =>
  s.categorie === "non déterminé"
    ? t.siegeInconnu
    : t.siegeCourt(
        (s.paysRetenu === null ? null : nomPays(s.paysRetenu)) ?? fr.radiographie.categories[s.categorie],
        fr.radiographie.categories[s.categorie],
      );

// The companies (D.2, R9): those that host or deliver the measured sites that day, in alphabetical order (a list,
// never a ranking), each with its retained seat (ARRÊT 2: the farther of its own and its ultimate parent's) and the number of domains it serves, in a
// table (point 11, Q2 A, chosen by the owner on 22/11/2026). Behind a closed door, no data is read: « not found ».
export default async function SocietesPage() {
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
  return (
    <Coque large>
      <FilAriane miettes={[{ nom: fr.societes.miette, chemin: "/societes" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <p className="releve-note">{t.entete(nombre(societes.length))}</p>
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
                <Link href={`/societes/${cle}`} prefetch={false}>
                  {s.nom}
                </Link>
                {s.controle === null ? null : <span className="liste-controle">{t.controle(s.controle)}</span>}
              </th>
              <td>{siegeDe(s)}</td>
              <td className="nombre valeur">{nombre(s.domaines)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Coque>
  );
}
