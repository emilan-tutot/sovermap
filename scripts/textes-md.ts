// npx tsx scripts/textes-md.ts <fichier>
// Writes the words of the text pages (lib/i18n/fr-textes.ts) into one readable Markdown file, for the publisher's
// review (brief E.5): page by page, word for word, with their sources, the day of their revision and whether they were
// read again. The corrections then go back into the dictionary, character for character: the dictionary stays the one
// source of the texts, this file only shows them.
import { writeFileSync } from "node:fs";
import { PAGES_DE_TEXTE } from "../lib/i18n/fr-textes";
import type { Segment } from "../lib/textes";

const [fichier] = process.argv.slice(2);
if (fichier === undefined) throw new Error("usage : npx tsx scripts/textes-md.ts <fichier>");

/** A sentence as Markdown: a raw value in code, a link of the site with its address. */
const phrase = (segments: readonly Segment[]) =>
  segments
    .map((s) => (typeof s === "string" ? s : "valeur" in s ? `\`${s.valeur}\`` : `[${s.lien}](${s.vers})`))
    .join("");

const lignes: string[] = [
  "# Les textes de Sovermap",
  "",
  `Tirés du dictionnaire du site (lib/i18n/fr-textes.ts) le ${new Date().toISOString().slice(0, 10)}, page par page, mot pour mot. Corrige directement dans ce fichier : chaque correction reviendra au dictionnaire, au caractère près.`,
  "",
];
for (const p of PAGES_DE_TEXTE) {
  lignes.push(`## ${p.titre} (\`${p.chemin}\`)`, "");
  lignes.push(`*Description pour les moteurs de recherche* : ${p.description}`, "", `*Chapô* : ${p.chapo}`, "");
  for (const s of p.sections) {
    if (s.titre !== undefined) lignes.push(`### ${s.titre}`, "");
    for (const b of s.blocs) {
      if ("paragraphe" in b) lignes.push(phrase(b.paragraphe), "");
      else lignes.push(...b.liste.map((e) => `- ${phrase(e)}`), "");
    }
  }
  lignes.push("**Sources**", "", ...p.sources.map((s) => `- ${phrase(s)}`), "");
  lignes.push(
    `Révisé le ${p.revision} · ${p.relu ? "relu par l’éditeur" : "pas encore relu par l’éditeur"}`,
    "",
    "---",
    "",
  );
}
writeFileSync(fichier, lignes.join("\n"), "utf8");
console.log(`textes : ${PAGES_DE_TEXTE.length} pages écrites dans ${fichier}`);
