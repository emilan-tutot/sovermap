// The freshness of the data (plan § 6, point 2; spec, CS-01): every page of the full site shows the date of the last
// collection, and past 36 hours, the mention « données en retard ». It is computed from what etat.json says, never
// from GitHub Actions: it stays visible even if every scheduled task is switched off.
import type { Qualite } from "./qualite";

/** Past this age, the data are late (plan § 6). */
export const RETARD_HEURES = 36;

export type Fraicheur = {
  /** When the last collection ended (ISO, UTC), or the start of its day when etat.json does not say. */
  derniereCollecte: string;
  ageHeures: number;
  enRetard: boolean;
};

/**
 * The freshness of the published state at `maintenant` (milliseconds since 1970). Without the collection's end, the
 * start of its day stands for it: the age is then never underestimated.
 */
export function fraicheurDe(qualite: Pick<Qualite, "date" | "collecte">, maintenant: number): Fraicheur {
  const derniereCollecte = qualite.collecte.fin ?? `${qualite.date}T00:00:00.000Z`;
  const ageHeures = Math.max(0, (maintenant - Date.parse(derniereCollecte)) / 3_600_000);
  return { derniereCollecte, ageHeures, enRetard: ageHeures > RETARD_HEURES };
}
