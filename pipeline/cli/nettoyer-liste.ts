// npx tsx pipeline/cli/nettoyer-liste.ts <sortie.csv> < domains.csv
// Turns an official list of public-sector domain names (DINUM) into the clean copy kept in referentiels/listes/:
// `name,type`, sorted, one line per name (brief C.5, owner's answer to point 01). The columns are read first; only the
// name and the type are kept (the file's date goes into the copy's name); the « sources » column, which names
// contributors, is never written anywhere — not on disk, not in a log, not in any metadata. The list arrives on the
// standard input and is read once, in memory: no raw copy ever touches the disk.
import { writeFileSync } from "node:fs";
import { nettoyerListe } from "../liste";

const sortie = process.argv[2];
if (sortie === undefined || !sortie.endsWith(".csv")) {
  console.error("usage : npx tsx pipeline/cli/nettoyer-liste.ts <sortie.csv> < domains.csv");
  process.exit(1);
}
const morceaux: Buffer[] = [];
process.stdin.on("data", (m: Buffer) => morceaux.push(m));
process.stdin.on("end", () => {
  const { csv, lignes, noms, types } = nettoyerListe(Buffer.concat(morceaux).toString("utf8"));
  writeFileSync(sortie, csv, "utf8");
  console.log(
    `nettoyer-liste : ${lignes} lignes lues, ${noms} noms gardés (name, type), ${Object.keys(types).length} types.`,
  );
});
