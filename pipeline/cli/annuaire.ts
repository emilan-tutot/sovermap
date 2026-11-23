// The local administrations directory (brief C.6; docs/sources.md, card 50). At each new copy of the DINUM's
// publication, reads its useful columns by byte ranges (pipeline/annuaire-local.ts) and writes, for the « donnees »
// branch, territoires/annuaire/guichets.jsonl (one office per line, sorted) and territoires/annuaire/copie.json (the
// copy's files with their SHA-256, commits and dates, its number of offices, the date of its state, when it was read).
// Nothing is written when the copy is the one already published; a copy whose number of offices moves by more than
// 10 % is refused, unless a person who checked it accepts it (--accepter-ecart: a run started by hand), and a copy
// without any office always is. A trial (--essai) reads the copy and writes nothing.
//   npx tsx pipeline/cli/annuaire.ts --sortie <dossier> [--donnees <dossier>] [--essai] [--accepter-ecart]
// In GitHub Actions, it tells the next job whether a new copy is ready (output « nouvelle »).
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  type CopieAnnuaire,
  copieCourante,
  dateEtat,
  ecartVolume,
  type Guichet,
  lignesGuichets,
  lireCopieAnnuaire,
  lireFichier,
  memeCopie,
} from "../annuaire-local";
import type { Ecarts } from "../personnelles";
import { agentUtilisateur, Telechargeur } from "../sources";

// Run from the repository's root, as the collection is.
const RACINE = process.cwd();
const { values: o } = parseArgs({
  options: {
    sortie: { type: "string" },
    donnees: { type: "string" },
    essai: { type: "boolean", default: false },
    "accepter-ecart": { type: "boolean", default: false },
  },
});
if (o.sortie === undefined) throw new Error("option manquante : --sortie <dossier>");

const dire = (cle: string, valeur: string) => {
  const sortie = process.env["GITHUB_OUTPUT"];
  if (sortie) appendFileSync(sortie, `${cle}=${valeur}\n`);
};
const version = (JSON.parse(readFileSync(path.join(RACINE, "package.json"), "utf8")) as { version: string }).version;
// One range of a useful column is a few megabytes at most: 64 MiB bounds any answer.
const telechargeur = new Telechargeur({ agent: agentUtilisateur(version), tailleMax: 64 * 1024 * 1024 });
const obtenir = (adresse: string, entetes?: Record<string, string>) => telechargeur.obtenir(adresse, entetes);

const fichiers = await copieCourante(obtenir);
const cheminPubliee = o.donnees === undefined ? null : path.join(o.donnees, "territoires", "annuaire", "copie.json");
// Read back and checked: an unreadable description counts as no published copy (the new one is then read whole).
const publiee =
  cheminPubliee !== null && existsSync(cheminPubliee) ? lireCopieAnnuaire(readFileSync(cheminPubliee, "utf8")) : null;
if (cheminPubliee !== null && existsSync(cheminPubliee) && publiee === null) {
  console.log("annuaire : la description de la copie publiée est illisible ; elle est ignorée.");
}
if (!o.essai && memeCopie(fichiers, publiee)) {
  console.log("annuaire : la copie publiée est la copie courante ; rien à écrire.");
  dire("nouvelle", "false");
} else {
  const guichets: Guichet[] = [];
  // The free text left out (P13): counted by kind of personal datum, never copied, never printed (the log is public).
  const ecarts: Ecarts = {};
  for (const fichier of fichiers) {
    const { guichets: lus, autres } = await lireFichier(obtenir, fichier, ecarts);
    guichets.push(...lus);
    console.log(
      `annuaire : ${fichier.chemin} (copie du ${fichier.date.slice(0, 10)}) : ${lus.length} guichets gardés ; ` +
        `${autres} d'un autre type (ni mairie, ni EPCI, ni conseil départemental ou régional), jamais copiés`,
    );
  }
  const ecartes = Object.values(ecarts).flatMap((m) => Object.entries(m));
  console.log(
    ecartes.length === 0
      ? "annuaire : aucun texte libre écarté (P13)."
      : `annuaire : textes libres écartés (P13 : le guichet est nommé par sa nature et sa commune) : ${ecartes.map(([motif, n]) => `${n} pour ${motif}`).join(", ")}.`,
  );
  const ecart = ecartVolume(guichets.length, publiee);
  if (ecart !== null && (guichets.length === 0 || !o["accepter-ecart"])) {
    throw new Error(
      `annuaire : copie refusée : ${ecart}. Si l'écart est réel, relancer le workflow à la main avec « accepter_ecart ».`,
    );
  }
  if (ecart !== null) console.log(`annuaire : écart accepté à la main : ${ecart}`);
  if (o.essai) {
    console.log(`annuaire (essai) : ${guichets.length} guichets lus ; rien n'est écrit.`);
    dire("nouvelle", "false");
  } else {
    const dossier = path.join(o.sortie, "territoires", "annuaire");
    mkdirSync(dossier, { recursive: true });
    writeFileSync(path.join(dossier, "guichets.jsonl"), lignesGuichets(guichets));
    const copie: CopieAnnuaire & { ecarts: Ecarts } = {
      fichiers,
      guichets: guichets.length,
      etat: dateEtat(guichets),
      lue: new Date().toISOString(),
      ecarts,
    };
    writeFileSync(path.join(dossier, "copie.json"), `${JSON.stringify(copie, null, 2)}\n`);
    console.log(`annuaire : ${guichets.length} guichets écrits.`);
    dire("nouvelle", "true");
  }
}
