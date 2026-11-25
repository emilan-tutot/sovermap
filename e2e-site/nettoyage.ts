import { rmSync } from "node:fs";
import { DONNEES_ESSAI } from "./donnees";

/** After the full site's tests: the made-up published state leaves the machine's temporary folder. */
export default function nettoyage() {
  rmSync(DONNEES_ESSAI, { recursive: true, force: true });
}
