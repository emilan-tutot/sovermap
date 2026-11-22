import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Bulletin, Details } from "@/components/qualite/Bulletin";
import { EnTete, Sources } from "@/components/qualite/Commun";
import { Reglettes } from "@/components/qualite/Reglettes";
import { TableauControles } from "@/components/qualite/TableauControles";
import { fraicheurDe } from "@/lib/donnees/fraicheur";
import { lecteur } from "@/lib/donnees/lecture";
import { maintenant } from "@/lib/donnees/maintenant";
import { qualiteDe } from "@/lib/donnees/qualite";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.qualite.titre };

// The Quality page (D.2, EX-16): what the day's collection measured and how it was checked. Behind a closed door, no
// data is read: the page answers « not found ». Provisional, until the owner chooses its form (point 09, Q1): the
// recommended proposal B (the guards' scales) by default, « ?forme=a » proposal A (the bulletin), « ?forme=c »
// proposal C (the table of controls). The forms not chosen are then removed, with this parameter.
export default async function QualitePage({ searchParams }: { searchParams: Promise<{ forme?: string | string[] }> }) {
  const lu = await lecteur.etat();
  if (lu.statut === "porte fermée") notFound();
  const heure = await maintenant();
  const { forme } = await searchParams;
  const q = lu.statut === "ok" ? qualiteDe(lu.donnees) : null;
  const f = q === null ? null : fraicheurDe(q, heure);
  return (
    <Coque>
      <FilAriane miettes={[{ nom: fr.qualite.titre, chemin: "/qualite" }]} />
      <h1 className="titre-page">{fr.qualite.titre}</h1>
      <p className="chapo">{fr.qualite.chapo}</p>
      {q === null || f === null ? (
        <p className="note">{fr.qualite.nonPublie}</p>
      ) : forme === "a" ? (
        <Bulletin q={q} f={f} />
      ) : (
        <>
          <EnTete q={q} f={f} />
          {forme === "c" ? (
            <TableauControles q={q} f={f} />
          ) : (
            <>
              <Reglettes q={q} f={f} />
              <Details q={q} />
            </>
          )}
          <Sources q={q} />
        </>
      )}
    </Coque>
  );
}
