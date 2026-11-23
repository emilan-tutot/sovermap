// When may a pull request's trial measure? Never while a day's collection runs, nor around the time one starts (03:17
// and 09:47 UTC): two measurements at once would double the questions to the shared servers (brief B.3), and a trial
// never takes the place of a day's measurement (the code review of PR 6, finding 5).

/** The day's collections are scheduled at these minutes of the UTC day (collecte.yml): 03:17 and 09:47. */
export const DEPARTS_MINUTES = [3 * 60 + 17, 9 * 60 + 47];
/**
 * A trial lasts about 25 minutes, 60 at worst (its limit, collecte.yml): none starts within 60 minutes before a
 * scheduled collection, so that it ends before it.
 */
export const MARGE_AVANT_MINUTES = 60;
/**
 * GitHub may start a scheduled run late (1 h 38 on 22/11/2026), and the run created late is not seen yet: no trial
 * starts within 120 minutes after a scheduled time (the review of 22/11/2026).
 */
export const MARGE_APRES_MINUTES = 120;

/**
 * May a trial start now? `collectesEnCours`: the day's collections running or waiting (trials left out). `departs`:
 * the scheduled minutes of the UTC day (a test passes others, to check the turn of midnight).
 */
export function creneauEssaiLibre(
  maintenant: Date,
  collectesEnCours: number,
  departs: readonly number[] = DEPARTS_MINUTES,
): boolean {
  if (collectesEnCours > 0) return false;
  const minutes = maintenant.getUTCHours() * 60 + maintenant.getUTCMinutes();
  return departs.every((depart) => {
    // The signed distance to the scheduled time, across midnight: from -720 (before) to 719 (after).
    const ecart = ((((minutes - depart) % 1440) + 1440 + 720) % 1440) - 720;
    return ecart < -MARGE_AVANT_MINUTES || ecart > MARGE_APRES_MINUTES;
  });
}
