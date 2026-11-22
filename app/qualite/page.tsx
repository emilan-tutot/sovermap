import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { Bulletin } from "@/components/qualite/Bulletin";
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
// data is read: the page answers « not found ». Provisional, until the point chooses its form: « ?forme=b » shows
// proposal B (the guards' scales), « ?forme=c » proposal C (the table of controls), anything else proposal A (the
// bulletin). The forms not chosen are then removed, with this parameter.
export default async function QualitePage({ searchParams }: { searchParams: Promise<{ forme?: string | string[] }> }) {
  const lu = await lecteur.etat();
  if (lu.statut === "porte fermée") notFound();
  const heure = await maintenant();
  const { forme } = await searchParams;
  const q = lu.statut === "ok" ? qualiteDe(lu.donnees) : null;
  const f = q === null ? null : fraicheurDe(q, heure);
  return (
    <Coque>
      <h1 className="titre-page">{fr.qualite.titre}</h1>
      <p className="chapo">{fr.qualite.chapo}</p>
      {q === null || f === null ? (
        <p className="note">{fr.qualite.nonPublie}</p>
      ) : forme === "b" || forme === "c" ? (
        <>
          <EnTete q={q} f={f} />
          {forme === "b" ? <Reglettes q={q} f={f} /> : <TableauControles q={q} f={f} />}
          <Sources q={q} />
        </>
      ) : (
        <Bulletin q={q} f={f} />
      )}
    </Coque>
  );
}
