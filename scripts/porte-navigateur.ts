// npm run porte:navigateur
// Prints the script that asks the production door's list in a browser tab of the site (scripts/lib/porte-navigateur.ts).
// Use: open the site (production or a preview) in Edge, run this script in the tab with Claude in Chrome's JavaScript
// tool, and read its result: `ecarts` is empty when every address gets the closed door's answer.
import { scriptNavigateur } from "./lib/porte-navigateur";

process.stdout.write(`${scriptNavigateur()}\n`);
