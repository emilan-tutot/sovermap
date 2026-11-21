// The records of the published data, for the pages (part D): the record of a measured name or of a registered domain,
// found in its bucket (the first four hexadecimal digits of the SHA-256 of its key, as the collection writes them:
// pipeline/publication.ts) and, if need be, in the bucket's numbered parts. Every fragment is checked against its
// schema (pipeline/schemas.ts) at the border, besides its checksum (lib/donnees/lecture.ts). Server only.
import "server-only";
import { createHash } from "node:crypto";
import { schemaDe, valider } from "@/pipeline/schemas";
import type { Lecture } from "./lecture";

export type LireFichier = (chemin: string) => Promise<Lecture<unknown>>;
export type Dossier = "noms" | "domaines";

/** A bucket is never cut into more parts than this (a record weighs 3 KB at most, a part 8 KB at most). */
export const PARTIES_MAX = 64;

/** The path of a bucket's part, for a key (a name, or a registered domain). */
export function cheminSeau(dossier: Dossier, cle: string, partie = 0): string {
  const h = createHash("sha256").update(cle, "utf8").digest("hex");
  return `${dossier}/${h.slice(0, 2)}/${h.slice(2, 4)}${partie === 0 ? "" : `.${partie}`}.json`;
}

/**
 * The record of a key: « absent » when the day's state does not publish it (a page answers « not found »), « indisponible »
 * when a part cannot be read or does not match its schema (logged; a page is never cached with it).
 */
export async function fiche(
  lire: LireFichier,
  dossier: Dossier,
  cle: string,
  journal: (ligne: string) => void = (ligne) => console.warn(ligne),
): Promise<Lecture<Record<string, unknown>>> {
  const champ = dossier === "noms" ? "nom" : "domaine";
  let parties = 1;
  for (let partie = 0; partie < parties; partie += 1) {
    const chemin = cheminSeau(dossier, cle, partie);
    const lu = await lire(chemin);
    if (lu.statut !== "ok") return lu;
    const schema = schemaDe(chemin);
    const erreurs = schema === null ? [{ chemin: "$", attendu: "un schéma" }] : valider(lu.donnees, schema);
    if (erreurs.length > 0) {
      journal(`donnees : fragment hors schéma (${chemin} : ${erreurs[0]?.chemin ?? "$"})`);
      return { statut: "indisponible" };
    }
    const fragment = lu.donnees as Record<string, unknown>;
    if (partie === 0 && typeof fragment["parties"] === "number") parties = Math.min(fragment["parties"], PARTIES_MAX);
    const liste = fragment[dossier] as Record<string, unknown>[];
    const trouvee = liste.find((e) => e[champ] === cle);
    if (trouvee !== undefined) return { statut: "ok", donnees: trouvee, date: lu.date };
  }
  return { statut: "absent" };
}
