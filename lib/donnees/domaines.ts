// index/domaines.json, checked at the border (D.2, D.7): every registered domain of the day, with 1 for the « État »
// perimeter, and the day of its last confirmed change once the collection publishes it. Pure.

export type DomaineIndex = { domaine: string; etat: boolean; date: string | null };

const MOTIF_DOMAINE = /^[a-z0-9_.-]{1,253}$/;
const MOTIF_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The index's domains, a line that is not one left out; null when the file is not the index. */
export function lireIndexDomaines(valeur: unknown): DomaineIndex[] | null {
  if (typeof valeur !== "object" || valeur === null || !Array.isArray((valeur as { domaines?: unknown }).domaines))
    return null;
  return (valeur as { domaines: unknown[] }).domaines.flatMap((e): DomaineIndex[] =>
    Array.isArray(e) && typeof e[0] === "string" && MOTIF_DOMAINE.test(e[0]) && (e[1] === 0 || e[1] === 1)
      ? [{ domaine: e[0], etat: e[1] === 1, date: typeof e[2] === "string" && MOTIF_DATE.test(e[2]) ? e[2] : null }]
      : [],
  );
}
