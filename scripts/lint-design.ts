// npm run lint:design : the design bans of the cahier (§8.3), checked line by line in the interface sources.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { findDesignViolations } from "./lib/design-rules";

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
  for (const violation of findDesignViolations(file, readFileSync(file, "utf8"))) {
    total += 1;
    console.error(`${file}:${violation.line}  ${violation.rule} (${violation.ban})`);
    console.error(`    ${violation.excerpt}`);
  }
}

if (total > 0) {
  console.error(`\nlint:design : ${total} violation(s). Voir le cahier §8.3 (puis DESIGN.md §12).`);
  process.exit(1);
}
console.log(`lint:design : ${files.length} fichier(s) conforme(s).`);
