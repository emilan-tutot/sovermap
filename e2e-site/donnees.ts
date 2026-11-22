import { tmpdir } from "node:os";
import path from "node:path";

/** The folder of the made-up published state (scripts/donnees-essai.ts), in the machine's temporary folder. */
export const DONNEES_ESSAI = path.join(tmpdir(), "sovermap-donnees-essai");
