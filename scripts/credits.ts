// Writes lib/credits.ts, the free software of the Crédits page (scripts/lib/credits.ts): a TypeScript module, which
// Next.js, Vitest and Playwright all import as it is. tests/credits.test.ts fails when it no longer matches
// package.json, node_modules and the resolver's image: run this again, then commit.
//   npx tsx scripts/credits.ts
import { writeFileSync } from "node:fs";
import { logicielsDe } from "./lib/credits";

const logiciels = logicielsDe();
const ligne = (l: (typeof logiciels)[number]) =>
  `  { nom: ${JSON.stringify(l.nom)}, version: ${JSON.stringify(l.version)}, licence: ${JSON.stringify(l.licence)} },`;
writeFileSync(
  "lib/credits.ts",
  [
    "// Written by scripts/credits.ts, never by hand: the free software of the Crédits page (the dependencies of",
    "// package.json, and the resolver the collection runs). tests/credits.test.ts fails when it no longer matches.",
    'import type { Logiciel } from "@/scripts/lib/credits";',
    "",
    "export const LOGICIELS: readonly Logiciel[] = [",
    ...logiciels.map(ligne),
    "];",
    "",
  ].join("\n"),
);
console.log(`credits : ${logiciels.length} logiciels écrits dans lib/credits.ts`);
