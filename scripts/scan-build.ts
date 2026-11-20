// npm run scan:build : after `npm run build`, the output must carry no source map and no secret (cahier §6), and
// nothing sent to browsers may carry Sovermap data: the server alone reads it (plan § 4), and _next/static/ is
// served even behind the closed door (lib/porte.ts). The CI runs it after a build with the door closed.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { SIGNES_DE_DONNEES } from "./lib/porte-controle";

const SECRET_PATTERNS: readonly [string, RegExp][] = [
  ["clé privée", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["jeton GitHub", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["clé d'API (sk-)", /\bsk-[A-Za-z0-9_-]{24,}\b/],
  ["clé AWS", /\bAKIA[0-9A-Z]{16}\b/],
  ["jeton Slack", /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/],
  ["jeton JWT", /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

if (!existsSync(".next/static")) {
  console.error("scan:build : aucun build trouvé (.next/static). Lancez d'abord `npm run build`.");
  process.exit(1);
}

const problems: string[] = [];
let scanned = 0;
for (const root of [".next/static", ".next/server"]) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    const relative = file.split(path.sep).join("/");
    if (root === ".next/static" && relative.endsWith(".map")) {
      problems.push(`${relative} : carte de sources servie au navigateur`);
      continue;
    }
    if (!/\.(?:js|mjs|cjs|css|html|json|txt|rsc)$/.test(relative) || statSync(file).size > 20 * 1024 * 1024) continue;
    const text = readFileSync(file, "utf8");
    scanned += 1;
    if (root === ".next/static" && /\/\/# sourceMappingURL=/.test(text)) {
      problems.push(`${relative} : lien vers une carte de sources`);
    }
    if (root === ".next/static") {
      for (const signe of SIGNES_DE_DONNEES) {
        if (signe.test(text)) problems.push(`${relative} : signe de données (${signe.source}) servi au navigateur`);
      }
    }
    for (const [label, pattern] of SECRET_PATTERNS) if (pattern.test(text)) problems.push(`${relative} : ${label}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`scan:build : ${problem}`);
  console.error(`\nscan:build : ÉCHEC, ${problems.length} problème(s).`);
  process.exit(1);
}
console.log(
  `scan:build : OK (${scanned} fichier(s) relus : aucune carte de sources servie, aucun secret, aucune donnée servie au navigateur).`,
);
