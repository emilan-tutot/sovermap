import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import type { FormeChaine } from "@/components/radiographie/Chaine";
import { type Mode, VueRadiographie } from "@/components/radiographie/Radiographie";
import { Valeur } from "@/components/texte/Valeur";
import { fiche } from "@/lib/donnees/fiches";
import { lecteur } from "@/lib/donnees/lecture";
import {
  lireIndexAs,
  lireIndexMinisteres,
  lireIndexSocietes,
  radiographieDe,
  sourcesDe,
} from "@/lib/donnees/radiographie";
import { fr } from "@/lib/i18n/fr";
import { robotsDe } from "@/lib/referencement";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import { estNomDns } from "@/pipeline/schemas";

type Props = {
  params: Promise<{ domaine: string }>;
  searchParams: Promise<{ mode?: string | string[]; chaine?: string | string[] }>;
};

/** The domain of the address, lower case, if it is a DNS name; null otherwise (the page answers « not found »). */
function domaineDe(brut: string): string | null {
  let d: string;
  try {
    d = decodeURIComponent(brut).toLowerCase();
  } catch {
    return null;
  }
  return estNomDns(d) ? d : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const domaine = domaineDe((await params).domaine);
  if (domaine === null) return {};
  // The indexing policy (docs/referencement.md): the Radiographies of the « État » perimeter only, and never a page
  // whose data could not be read. Behind a closed door, the reader reads nothing.
  const etat = await lecteur.etat();
  const lu = etat.statut === "ok" ? await fiche((chemin) => lecteur.fichier(chemin), "domaines", domaine) : etat;
  const deLEtat = lu.statut === "ok" && (lu.donnees as unknown as EnregistrementDomaine).perimetre === "État";
  return {
    title: fr.radiographie.titre(domaine),
    description: fr.radiographie.description(domaine),
    alternates: { canonical: `/radiographie/${domaine}` },
    robots: robotsDe(deLEtat),
  };
}

// The Radiographie of a domain (D.2; spec R2, R3, R5): its layers from the site to the country of a seat, each with
// its source, its date and its level. Behind a closed door, no data is read: the page answers « not found » (the door's
// rewrite already sends the address there in production). A domain the day's state does not publish: « not found ».
export default async function RadiographiePage({ params, searchParams }: Props) {
  const domaine = domaineDe((await params).domaine);
  if (domaine === null) notFound();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  const { mode, chaine } = await searchParams;
  const vue: Mode = mode === "expert" ? "expert" : "simple";
  // The chain's form, provisional until the owner chooses (point 10, Q2): B, recommended, by default; « ?chaine=a » or
  // « ?chaine=c » for the others.
  const forme: FormeChaine = chaine === "a" ? "a" : chaine === "c" ? "c" : "b";
  const lire = (chemin: string) => lecteur.fichier(chemin);
  const lu = etat.statut === "ok" ? await fiche(lire, "domaines", domaine) : etat;
  if (lu.statut === "absent" || lu.statut === "porte fermée") notFound();
  if (lu.statut !== "ok" || etat.statut !== "ok") {
    return (
      <Coque large>
        <h1 className="titre-page radiographie-titre">
          <Valeur texte={domaine} />
        </h1>
        <p className="note">{fr.radiographie.indisponible}</p>
      </Coque>
    );
  }
  // The records were checked against their schemas (lib/donnees/fiches.ts); the indexes are checked here.
  const enregistrement = lu.donnees as unknown as EnregistrementDomaine;
  const [web, societes, as, ministeres] = await Promise.all([
    fiche(lire, "noms", enregistrement.nomWeb),
    lire("index/exploitants.json"),
    lire("index/as.json"),
    lire("index/ministeres.json"),
  ]);
  const r = radiographieDe(enregistrement, web.statut === "ok" ? (web.donnees as unknown as EnregistrementNom) : null, {
    societes: (societes.statut === "ok" ? lireIndexSocietes(societes.donnees) : null) ?? new Map(),
    as: (as.statut === "ok" ? lireIndexAs(as.donnees) : null) ?? new Map(),
    ministeres: (ministeres.statut === "ok" ? lireIndexMinisteres(ministeres.donnees) : null) ?? new Map(),
  });
  const s = sourcesDe(etat.donnees);
  return (
    <Coque large>
      <FilAriane miettes={[{ nom: r.domaine, chemin: `/radiographie/${r.domaine}` }]} />
      <p className="etiquette-capitales">{fr.radiographie.surtitre}</p>
      <h1 className="titre-page radiographie-titre">
        <Valeur texte={r.domaine} />
      </h1>
      <p className="chapo">{fr.radiographie.chapo}</p>
      <VueRadiographie r={r} s={s} mode={vue} forme={forme} />
    </Coque>
  );
}
