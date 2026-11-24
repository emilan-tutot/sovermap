// The reading of the territories' indexes for their pages (D.2): behind a closed door, or before the indexes were ever
// published, the page answers « not found »; a file that cannot be read, or does not pass its checks, is an error
// (lib/donnees/indisponible.ts), never an empty page kept by the CDN.
import { notFound } from "next/navigation";
import { indisponible } from "./indisponible";
import { lecteur } from "./lecture";
import {
  type FichierDepartement,
  type IndexTerritoires,
  lireFichierDepartement,
  lireIndexTerritoires,
} from "./territoires";
import { sitePublic } from "@/lib/site";

/** index/territoires.json of the day, checked. */
export async function indexTerritoiresDuJour(): Promise<IndexTerritoires> {
  if (!sitePublic()) notFound();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  const lu = etat.statut === "ok" ? await lecteur.fichier("index/territoires.json") : etat;
  if (lu.statut === "absent") notFound();
  const index = lu.statut === "ok" ? lireIndexTerritoires(lu.donnees) : null;
  if (index === null) indisponible();
  return index;
}

/**
 * index/territoires/<code>.json of the day, checked: the département's communes and groups. The file's name is in lower
 * case (« 2a.json » for Corse-du-Sud, as the collection writes it: the data paths are lower case, lecture.ts); the code
 * inside keeps its official case (the review of PR 18).
 */
export async function fichierDepartementDuJour(code: string): Promise<FichierDepartement> {
  const etat = await lecteur.etat();
  const lu = await lecteur.fichier(`index/territoires/${code.toLowerCase()}.json`);
  if (lu.statut === "absent" || lu.statut === "porte fermée") notFound();
  const fichier = lu.statut === "ok" ? lireFichierDepartement(lu.donnees, code) : null;
  if (fichier === null) indisponible();
  // A file of another day (the day before's, read when today's could not be) would show its lists under today's date,
  // and a commune or a group added today would answer « not found », kept by the CDN: the page is unavailable instead,
  // never cached (the review of PR 22; fiche() treats a record of another day the same way).
  if (lu.statut === "ok" && etat.statut === "ok" && lu.date !== etat.date) indisponible();
  return fichier;
}
