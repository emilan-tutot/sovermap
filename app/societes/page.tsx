import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { lecteur } from "@/lib/donnees/lecture";
import { lireIndexSocietes, nomPays } from "@/lib/donnees/radiographie";
import { societesTriees } from "@/lib/donnees/societes";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { sitePublic } from "@/lib/site";

export const metadata: Metadata = { title: fr.societes.titre, description: fr.societes.description };

const t = fr.societes;

// The companies (D.2, R9): those that host or deliver the measured sites that day, in alphabetical order (a list,
// never a ranking), each with the country of its ultimate parent's seat and the number of domains it serves. Behind a
// closed door, no data is read: the page answers « not found ».
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
  if (index === null || etat.statut !== "ok") {
    return (
      <Coque>
        <h1 className="titre-page">{t.titre}</h1>
        <p className="note">{fr.radiographie.indisponible}</p>
      </Coque>
    );
  }
  const societes = societesTriees(index);
  return (
    <Coque>
      <h1 className="titre-page">{t.titre}</h1>
      <p className="chapo">{t.chapo}</p>
      <p className="releve-note">{t.entete(nombre(societes.length))}</p>
      <ul className="liste-societes">
        {societes.map(([cle, s]) => (
          <li key={cle}>
            <Link href={`/societes/${cle}`} prefetch={false}>
              {s.nom}
            </Link>
            <p>
              {s.mere === null
                ? t.siegeInconnu
                : t.siege(
                    nomPays(s.paysMere) ?? s.paysMere ?? fr.radiographie.nonDetermine,
                    fr.radiographie.categories[s.categorie],
                  )}
            </p>
            {s.controle === null ? null : <p>{t.controle(s.controle)}</p>}
            <p className="valeur">{t.domaines(s.domaines, nombre(s.domaines))}</p>
          </li>
        ))}
      </ul>
    </Coque>
  );
}
