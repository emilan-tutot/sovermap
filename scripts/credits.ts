// Writes lib/credits.json, the free software of the Crédits page (scripts/lib/credits.ts). tests/credits.test.ts fails
// when that file no longer matches package.json, node_modules and the resolver's image: run this again, then commit.
//   npx tsx scripts/credits.ts
import { writeFileSync } from "node:fs";
import { logicielsDe } from "./lib/credits";

const logiciels = logicielsDe();
writeFileSync("lib/credits.json", `${JSON.stringify(logiciels, null, 2)}\n`);
console.log(`credits : ${logiciels.length} logiciels écrits dans lib/credits.json`);
