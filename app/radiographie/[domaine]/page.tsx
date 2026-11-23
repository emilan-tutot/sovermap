import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { type Mode, VueRadiographie } from "@/components/radiographie/Radiographie";
import { Valeur } from "@/components/texte/Valeur";
import { fiche } from "@/lib/donnees/fiches";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { lireMinisteres, type Ministere } from "@/lib/donnees/ministeres";
import {
  lireIndexAs,
  lireIndexMinisteres,
  lireIndexSocietes,
  radiographieDe,
  sourcesDe,
} from "@/lib/donnees/radiographie";
import { fr } from "@/lib/i18n/fr";
import { partageDe, robotsDe } from "@/lib/referencement";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import { estNomDns } from "@/pipeline/schemas";

type Props = {
  params: Promise<{ domaine: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
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
    openGraph: partageDe(
      "radiographie",
      fr.meta.titre(fr.radiographie.titre(domaine)),
      fr.radiographie.description(domaine),
    ),
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
  const { mode } = await searchParams;
  const vue: Mode = mode === "expert" ? "expert" : "simple";
  const lire = (chemin: string) => lecteur.fichier(chemin);
  const lu = etat.statut === "ok" ? await fiche(lire, "domaines", domaine, etat.donnees.date) : etat;
  if (lu.statut === "absent" || lu.statut === "porte fermée") notFound();
  if (lu.statut !== "ok" || etat.statut !== "ok") indisponible();
  // The records were checked against their schemas (lib/donnees/fiches.ts); the indexes are checked here.
  const enregistrement = lu.donnees as unknown as EnregistrementDomaine;
  const [web, societes, as, ministeres] = await Promise.all([
    fiche(lire, "noms", enregistrement.nomWeb, etat.donnees.date),
    lire("index/exploitants.json"),
    lire("index/as.json"),
    lire("index/ministeres.json"),
  ]);
  // A read that failed, or an index that does not pass its checks, is an error, never kept by the CDN: it would show
  // « non déterminé » or « aucun réseau » as facts. Only a file that does not exist yet stands for « not published »
  // (the review of PR 22).
  if ([web, societes, as, ministeres].some((l) => l.statut === "indisponible" || l.statut === "porte fermée")) {
    indisponible();
  }
  const indexSocietes = societes.statut === "ok" ? lireIndexSocietes(societes.donnees) : new Map();
  const indexAs = as.statut === "ok" ? lireIndexAs(as.donnees) : new Map();
  const indexMinisteres = ministeres.statut === "ok" ? lireIndexMinisteres(ministeres.donnees) : new Map();
  // Each ministry's address as its own page has it (two names that give one address keep the end of their id).
  const slugs = new Map<string, string>(
    (ministeres.statut === "ok" ? (lireMinisteres(ministeres.donnees) ?? []) : []).map((m: Ministere) => [
      m.nom,
      m.slug,
    ]),
  );
  if (indexSocietes === null || indexAs === null || indexMinisteres === null) indisponible();
  const r = radiographieDe(enregistrement, web.statut === "ok" ? (web.donnees as unknown as EnregistrementNom) : null, {
    societes: indexSocietes,
    as: indexAs,
    ministeres: indexMinisteres,
  });
  const s = sourcesDe(etat.donnees);
  // Each layer is dated by the record it was read from: the day before's, when today's could not be read.
  const dates = { domaine: lu.date, nom: web.statut === "ok" ? web.date : lu.date };
  return (
    <Coque large>
      <FilAriane miettes={[{ nom: r.domaine, chemin: `/radiographie/${r.domaine}` }]} />
      <p className="etiquette-capitales">{fr.radiographie.surtitre}</p>
      <h1 className="titre-page radiographie-titre titre-vole">
        {/* The name that flew from the search (DESIGN.md § 7). */}
        <ViewTransition name={`domaine-${r.domaine}`} share="vole" default="none">
          <span>
            <Valeur texte={r.domaine} />
          </span>
        </ViewTransition>
      </h1>
      <p className="chapo">{fr.radiographie.chapo}</p>
      <p className="releve-note">
        {fr.radiographie.limites}
        <Link href="/methode#ce-que-sovermap-montre" prefetch={false}>
          {fr.radiographie.limitesLien}
        </Link>
        {fr.radiographie.limitesFin}
      </p>
      <VueRadiographie r={r} s={s} dates={dates} slugs={slugs} mode={vue} />
    </Coque>
  );
}
