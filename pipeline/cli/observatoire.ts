// Writes referentiels/demarches.json from one edition of the Observatoire de la qualité des démarches en ligne
// (docs/sources.md, card 55), an ODS file the owner deposits (static.data.gouv.fr is closed to robots): the démarches as
// Sovermap reads them (pipeline/observatoire.ts), with the edition and its dates. Run from the repository's root.
//   npx tsx pipeline/cli/observatoire.ts <fichier.ods> --edition <n> --periode "<mois année>" --publiee AAAA-MM-JJ
//     --deposee AAAA-MM-JJ
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { demarchesDe, lignesOds } from "../observatoire";
import { lireListeSuffixes } from "../psl";
import { lireZip } from "../zip";

const RACINE = process.cwd();
const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    edition: { type: "string" },
    periode: { type: "string" },
    publiee: { type: "string" },
    deposee: { type: "string" },
  },
});
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const [fichier] = positionals;
const { edition = "", periode = "", publiee = "", deposee = "" } = o;
if (
  fichier === undefined ||
  !/^\d{1,3}$/.test(edition) ||
  periode === "" ||
  !JOUR.test(publiee) ||
  !JOUR.test(deposee)
) {
  throw new Error(
    'usage : npx tsx pipeline/cli/observatoire.ts <fichier.ods> --edition <n> --periode "<mois année>" --publiee AAAA-MM-JJ --deposee AAAA-MM-JJ',
  );
}

const contenu = lireZip(readFileSync(fichier), (n) => n === "content.xml").get("content.xml");
if (contenu === undefined) throw new Error("ODS : pas de content.xml");
// An edition's sheet is about 627 KB: a content.xml beyond 8 MiB is refused before it becomes text (the review of C.8).
if (contenu.length > 8 * 1024 * 1024)
  throw new Error("ODS : content.xml trop grand pour une édition de l'Observatoire");
// The Public Suffix List the collection uses: the pinned one (referentiels/psl/), so that a démarche's domain is the
// one the collection measures.
const fichierPsl = readdirSync(path.join(RACINE, "referentiels/psl"))
  .filter((f) => /^public_suffix_list-\d{4}-\d{2}-\d{2}\.dat$/.test(f))
  .sort()
  .at(-1);
if (fichierPsl === undefined) throw new Error("referentiels/psl : aucune Public Suffix List épinglée");
const suffixes = lireListeSuffixes(readFileSync(path.join(RACINE, "referentiels/psl", fichierPsl), "utf8"));

const { feuille, lignes } = lignesOds(contenu.toString("utf8"));
if (feuille !== "T_VDE") throw new Error(`Observatoire : feuille inattendue (« ${feuille} »)`);
const demarches = demarchesDe(lignes, suffixes);
const sortie = {
  version: publiee,
  source: {
    fiche: 55,
    document: `DINUM, Observatoire de la qualité des démarches en ligne, édition ${edition} (${periode})`,
    edition: Number(edition),
    periode,
    publiee,
    releve: `relevé manuel : fichier déposé par le propriétaire le ${deposee}, lu le ${new Date().toISOString().slice(0, 10)}`,
  },
  note: "Pour chaque démarche : son nom, son identifiant, son périmètre ministériel, son administration, ses volumes (null quand l'édition n'en donne pas) et le nom de son adresse avec son domaine enregistré. Les notes de la démarche (satisfaction, accessibilité, clarté…) ne sont jamais reprises : Sovermap décrit des dépendances, pas la qualité d'une démarche.",
  demarches,
};
writeFileSync(path.join(RACINE, "referentiels", "demarches.json"), `${JSON.stringify(sortie, null, 2)}\n`);
const avecDomaine = demarches.filter((d) => d.domaine !== null);
console.log(
  `Observatoire, édition ${edition} : ${demarches.length} démarches, ${avecDomaine.length} avec une adresse, ${new Set(avecDomaine.map((d) => d.domaine)).size} domaines.`,
);
