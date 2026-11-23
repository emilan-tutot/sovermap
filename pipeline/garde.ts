// Never a full collection from the owner's PC (brief B.10, CLAUDE.md): outside GitHub Actions, 200 names at most.
export const LIMITE_HORS_ACTIONS = 200;

export function verifierLimite(nombre: number, env: Readonly<Record<string, string | undefined>> = process.env): void {
  if (nombre > LIMITE_HORS_ACTIONS && env.GITHUB_ACTIONS !== "true") {
    throw new Error(
      `${nombre} noms : hors de GitHub Actions, un essai porte sur ${LIMITE_HORS_ACTIONS} noms au plus (--limite ${LIMITE_HORS_ACTIONS}).`,
    );
  }
}

/** Point 02, Q2: confirmed breakdowns above 8 % of the domains, or up by more than 2 points in a day, stop it all. */
export const SEUIL_PANNES = 0.08;
export const HAUSSE_PANNES = 0.02;

/**
 * The confirmed breakdowns' two guards: under 8 % of the domains, always (a ceiling: above it, a person looks); and at
 * most 2 points over the day before (`veille`: yesterday's measurement when it was kept, else the last published day).
 */
export function gardesPannes(taux: number, veille: number | null): { plafond: boolean; hausse: boolean } {
  return { plafond: taux <= SEUIL_PANNES, hausse: veille === null || taux - veille <= HAUSSE_PANNES };
}

export type Garde = { nom: string; ok: boolean; detail: string; relatifALaVeille?: boolean };

/**
 * The emergency stop's guard (collecte.ts): a collection stopped before its end is never published, and never becomes
 * tomorrow's yesterday (it never compares with yesterday). The 2 % guard does not always double it: a late stop, after
 * tens of thousands of sound domains, can leave a day under 2 %, and its domains not measured would be lost.
 */
export function gardeTerme(arret: string | null): Garde {
  return { nom: "collecte menée à son terme", ok: arret === null, detail: arret ?? "" };
}

/**
 * Does today's measurement become tomorrow's yesterday? When every guard is green but, maybe, those that compare with
 * yesterday (the circuit breaker, the day-to-day rise of the breakdowns): a real, lasting change is then confirmed the
 * next day, against this measurement, instead of keeping the guard red for ever.
 */
export function veilleUtilisable(gardes: readonly Garde[]): boolean {
  return gardes.filter((g) => g.relatifALaVeille !== true).every((g) => g.ok);
}
