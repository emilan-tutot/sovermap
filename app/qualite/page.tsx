import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { EnTete, Sources } from "@/components/qualite/Commun";
import { Details } from "@/components/qualite/Details";
import { Reglettes } from "@/components/qualite/Reglettes";
import { fraicheurDe } from "@/lib/donnees/fraicheur";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { maintenant } from "@/lib/donnees/maintenant";
import { qualiteDe } from "@/lib/donnees/qualite";
import { fr } from "@/lib/i18n/fr";
import { partageDe } from "@/lib/referencement";

export const metadata: Metadata = {
  title: fr.qualite.titre,
  description: fr.qualite.description,
  alternates: { canonical: "/qualite" },
  openGraph: partageDe("accueil", fr.meta.titre(fr.qualite.titre), fr.qualite.description),
};

// The Quality page (D.2, EX-16): what the day's collection measured and how it was checked. Behind a closed door, no
// data is read: the page answers « not found ». Its form is the guards' scales (point 09, Q1 B, chosen by the owner on
// 22/11/2026), then the figures of the day as term-value rows.
export default async function QualitePage() {
  // Rendered at each request, never at build time: connection() before any read (the review of PR 22).
  await connection();
  const lu = await lecteur.etat();
  if (lu.statut === "porte fermée") notFound();
  // Unreadable today (and no copy of the day before): an error, never kept by the CDN; « not published » is only for
  // a state that does not exist yet.
  if (lu.statut === "indisponible") indisponible();
  const heure = await maintenant();
  const q = lu.statut === "ok" ? qualiteDe(lu.donnees) : null;
  const f = q === null ? null : fraicheurDe(q, heure);
  return (
    <Coque>
      <FilAriane miettes={[{ nom: fr.qualite.titre, chemin: "/qualite" }]} />
      <h1 className="titre-page">{fr.qualite.titre}</h1>
      <p className="chapo">{fr.qualite.chapo}</p>
      {q === null || f === null ? (
        <p className="note">{fr.qualite.nonPublie}</p>
      ) : (
        <>
          <EnTete q={q} f={f} />
          <Reglettes q={q} f={f} />
          <Details q={q} />
          <Sources q={q} />
        </>
      )}
    </Coque>
  );
}
