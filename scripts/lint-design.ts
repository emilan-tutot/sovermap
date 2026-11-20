// npm run lint:design : the design bans of the cahier (§8.3, DESIGN.md §12), checked line by line in the interface
// sources; and no text written in a component (every text comes from the dictionary, lib/i18n/: DESIGN.md §9).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { findDesignViolations } from "./lib/design-rules";
import { findHardcodedTexts } from "./lib/texte-en-dur";

const ROOTS = ["app", "components", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".mdx"]);

const files = ROOTS.filter((root) => existsSync(root)).flatMap((root) =>
  readdirSync(root, { recursive: true, encoding: "utf8" })
    .map((relative) => path.posix.join(root, relative.split(path.sep).join("/")))
    .filter((file) => EXTENSIONS.has(path.extname(file)))
    .filter((file) => statSync(file).isFile()),
);

let total = 0;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const violation of findDesignViolations(file, source)) {
    total += 1;
    console.error(`${file}:${violation.line}  ${violation.rule} (${violation.ban})`);
    console.error(`    ${violation.excerpt}`);
  }
  if (!file.startsWith("lib/i18n/")) {
    for (const texte of findHardcodedTexts(file, source)) {
      total += 1;
      console.error(`${file}:${texte.line}  no-hardcoded-text (DESIGN.md §9 : tout texte vient du dictionnaire, lib/i18n/)`);
      console.error(`    ${texte.excerpt}`);
    }
  }
}

if (total > 0) {
  console.error(`\nlint:design : ${total} violation(s). Voir DESIGN.md §12.`);
  process.exit(1);
}
console.log(`lint:design : ${files.length} fichier(s) conforme(s).`);
