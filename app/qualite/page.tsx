import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { Bulletin } from "@/components/qualite/Bulletin";
import { fraicheurDe } from "@/lib/donnees/fraicheur";
import { lecteur } from "@/lib/donnees/lecture";
import { maintenant } from "@/lib/donnees/maintenant";
import { qualiteDe } from "@/lib/donnees/qualite";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.qualite.titre };

// The Quality page (D.2, EX-16): what the day's collection measured and how it was checked. Behind a closed door, no
// data is read: the page answers « not found ». The form of the page is chosen at a point (three proposals).
export default async function QualitePage() {
  const lu = await lecteur.etat();
  if (lu.statut === "porte fermée") notFound();
  const heure = await maintenant();
  const q = lu.statut === "ok" ? qualiteDe(lu.donnees) : null;
  return (
    <Coque>
      <h1 className="titre-page">{fr.qualite.titre}</h1>
      <p className="chapo">{fr.qualite.chapo}</p>
      {q === null ? <p className="note">{fr.qualite.nonPublie}</p> : <Bulletin q={q} f={fraicheurDe(q, heure)} />}
    </Coque>
  );
}
