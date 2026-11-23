// npx tsx pipeline/cli/creneau-essai.ts <collections of the day running or waiting>
// The first step of a pull request's trial (collecte.yml): it stops the trial, in red with a sentence, when a day's
// collection runs or is about to (pipeline/creneau.ts). The trial is then run again later, by hand.
import { creneauEssaiLibre, MARGE_APRES_MINUTES, MARGE_AVANT_MINUTES } from "../creneau";

const enCours = Number(process.argv[2] ?? "");
if (!Number.isInteger(enCours) || enCours < 0) {
  console.error("créneau : le nombre de collectes du jour en cours est attendu (un entier)");
  process.exit(1);
}
if (!creneauEssaiLibre(new Date(), enCours)) {
  console.error(
    enCours > 0
      ? "créneau : une collecte du jour tourne ; l'essai est reporté (à relancer plus tard)."
      : `créneau : une collecte du jour part dans moins de ${MARGE_AVANT_MINUTES} minutes, ou est partie il y a moins de ${MARGE_APRES_MINUTES} minutes ; l'essai est reporté (à relancer plus tard).`,
  );
  process.exit(1);
}
console.log("créneau : libre, l'essai peut mesurer.");
