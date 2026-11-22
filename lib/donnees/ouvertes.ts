// The open data's page (brief F.1): what the day's published state says of its open files, checked at the border, and
// the addresses of those files in the « donnees-courant » release. Pure: the page and the tests share it.
import type { EtatPublie } from "@/lib/donnees/lecture";

/** The open files of the day, in the order of the page (pipeline/ouvertes.ts writes them; the backup file last). */
export const FICHIERS_OUVERTS = [
  "sovermap-domains.csv",
  "sovermap-domains.json",
  "sovermap-operators.csv",
  "sovermap-operators.json",
  "sovermap-ministries.csv",
  "sovermap-ministries.json",
  "sovermap-countries.csv",
  "sovermap-countries.json",
  "datapackage.json",
  "SHA256SUMS",
  "donnees-courant.tar.gz",
] as const;

const MOTIF_COMPTE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;

/**
 * The address of an open file in the release, or null when the account (configuration) is not one. The account comes
 * from the server's configuration, never from the code.
 */
export function adresseFichierOuvert(
  fichier: (typeof FICHIERS_OUVERTS)[number],
  compte: string | undefined,
): string | null {
  const c = compte?.trim() ?? "";
  return MOTIF_COMPTE.test(c) ? `https://github.com/${c}/sovermap/releases/download/donnees-courant/${fichier}` : null;
}

export type SourceDatee = { id: string; fiche: number; etat: string; date: string | null };
export type DonneesOuvertes = { date: string; methode: string | null; sources: SourceDatee[] };

const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** The day's date, the method's version and the dated sources, from the published etat.json, checked field by field. */
export function donneesOuvertesDe(etat: EtatPublie): DonneesOuvertes {
  const regles = objet(objet(etat.brut["versions"])?.["regles"]);
  const methode = regles?.["methode"];
  const sources = Array.isArray(etat.brut["sources"]) ? (etat.brut["sources"] as unknown[]).slice(0, 50) : [];
  return {
    date: etat.date,
    methode: typeof methode === "string" && /^\d{1,3}(\.\d{1,3}){1,2}$/.test(methode) ? methode : null,
    sources: sources.flatMap((s): SourceDatee[] => {
      const o = objet(s);
      const id = o?.["id"];
      const fiche = o?.["fiche"];
      const e = o?.["etat"];
      const d = o?.["date"];
      if (typeof id !== "string" || !/^[a-z0-9-]{1,40}$/.test(id)) return [];
      if (typeof fiche !== "number" || !Number.isSafeInteger(fiche) || fiche < 1 || fiche > 999) return [];
      return [
        {
          id,
          fiche,
          etat: typeof e === "string" ? e.slice(0, 30) : "",
          date: typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null,
        },
      ];
    }),
  };
}
