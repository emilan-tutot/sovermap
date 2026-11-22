// When may a pull request's trial measure? Never while a day's collection runs, nor around the time one starts (03:17
// and 09:47 UTC): two measurements at once would double the questions to the shared servers (brief B.3), and a trial
// never takes the place of a day's measurement (the code review of PR 6, finding 5).

/** The day's collections are scheduled at these minutes of the UTC day (collecte.yml): 03:17 and 09:47. */
const DEPARTS_MINUTES = [3 * 60 + 17, 9 * 60 + 47];
/**
 * A trial lasts about 25 minutes, 60 at worst (its limit), and GitHub may start a scheduled run late: no trial starts
 * within 60 minutes of a scheduled collection, before or after.
 */
export const MARGE_MINUTES = 60;

/** May a trial start now? `collectesEnCours`: the day's collections running or waiting (trials left out). */
export function creneauEssaiLibre(maintenant: Date, collectesEnCours: number): boolean {
  if (collectesEnCours > 0) return false;
  const minutes = maintenant.getUTCHours() * 60 + maintenant.getUTCMinutes();
  return DEPARTS_MINUTES.every((depart) => {
    const ecart = Math.abs(minutes - depart);
    return Math.min(ecart, 24 * 60 - ecart) > MARGE_MINUTES;
  });
}
