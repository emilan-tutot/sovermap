import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { lireMinisteres } from "@/lib/donnees/ministeres";
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

// The ministries (D.2, R8): those to which the DILA's Référentiel links measured sites, in alphabetical order (a list,
// never a ranking), each with its number of domains, in a table (point 11, Q2 A, chosen by the owner on 22/11/2026).
// Behind a closed door, no data is read: « not found ».
export default async function MinisteresPage() {
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
  return (
    <Coque large>
      <FilAriane miettes={[{ nom: fr.coque.navigation.ministeres, chemin: "/ministeres" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <p className="releve-note">{t.entete(nombre(ministeres.length))}</p>
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
              <th scope="row">
                <Link href={`/ministeres/${m.slug}`} prefetch={false}>
                  {m.nom}
                </Link>
              </th>
              <td className="nombre valeur">{nombre(m.domaines.length)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Coque>
  );
}
