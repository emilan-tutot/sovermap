import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { lecteur } from "@/lib/donnees/lecture";
import { lireMinisteres } from "@/lib/donnees/ministeres";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { sitePublic } from "@/lib/site";

export const metadata: Metadata = {
  title: fr.ministeres.titre,
  description: fr.ministeres.description,
  alternates: { canonical: "/ministeres" },
};

const t = fr.ministeres;

// The ministries (D.2, R8): those to which the DILA's Référentiel links measured sites, in alphabetical order (a list,
// never a ranking), each with its number of domains. Behind a closed door, no data is read: « not found ».
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
  if (ministeres === null || etat.statut !== "ok") {
    return (
      <Coque>
        <h1 className="titre-page">{t.titre}</h1>
        <p className="note">{fr.radiographie.indisponible}</p>
      </Coque>
    );
  }
  return (
    <Coque>
      <FilAriane miettes={[{ nom: fr.coque.navigation.ministeres, chemin: "/ministeres" }]} />
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <p className="releve-note">{t.entete(nombre(ministeres.length))}</p>
      <ul className="liste-societes">
        {ministeres.map((m) => (
          <li key={m.id}>
            <Link href={`/ministeres/${m.slug}`} prefetch={false}>
              {m.nom}
            </Link>
            <p className="valeur">{t.domaines(m.domaines.length, nombre(m.domaines.length))}</p>
          </li>
        ))}
      </ul>
    </Coque>
  );
}
