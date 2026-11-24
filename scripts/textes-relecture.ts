// npx tsx scripts/textes-relecture.ts > textes.md
// The text pages of the site, word for word, in one readable file for the publisher's review (brief E.5): each page's
// title, address, description, chapô, sections, sources and revision day, from lib/i18n/fr-textes.ts. The publisher
// corrects the file; each correction comes back to the dictionary by hand, to the character.
import { dateFr } from "../lib/i18n/format";
import { PAGES_DE_TEXTE } from "../lib/i18n/fr-textes";
import type { Bloc, Segment } from "../lib/textes";

const segment = (s: Segment): string => (typeof s === "string" ? s : "lien" in s ? `[${s.lien}](${s.vers})` : s.valeur);
const texte = (segments: readonly Segment[]) => segments.map(segment).join("");
const bloc = (b: Bloc): string =>
  "paragraphe" in b ? texte(b.paragraphe) : b.liste.map((item) => `- ${texte(item)}`).join("\n");

const aujourdhui = new Date().toISOString().slice(0, 10);
const parties = [
  "# Les textes de Sovermap",
  `Tirés du dictionnaire du site (lib/i18n/fr-textes.ts) le ${dateFr(aujourdhui)}, page par page, mot pour mot. Corrige directement dans ce fichier : chaque correction reviendra au dictionnaire, au caractère près.`,
];
for (const page of PAGES_DE_TEXTE) {
  parties.push(
    `## ${page.titre} (\`${page.chemin}\`)`,
    `*Description pour les moteurs de recherche* : ${page.description}`,
    `*Chapô* : ${page.chapo}`,
  );
  for (const section of page.sections) {
    if (section.titre !== undefined) parties.push(`### ${section.titre}`);
    parties.push(...section.blocs.map(bloc));
  }
  parties.push("**Sources**", page.sources.map((s) => `- ${texte(s)}`).join("\n"));
  parties.push(
    `*Révisé le ${dateFr(page.revision)}* ; ${page.relu ? "relu par l'éditeur" : "pas encore relu par l'éditeur"}.`,
  );
}
process.stdout.write(`${parties.join("\n\n")}\n`);
