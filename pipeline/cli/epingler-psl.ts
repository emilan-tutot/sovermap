// npx tsx pipeline/cli/epingler-psl.ts < public_suffix_list.dat > referentiels/psl/public_suffix_list-AAAA-MM-JJ.dat
// The pinned copy of the Public Suffix List (docs/sources.md, card 42): its licence notice (MPL 2.0), its version and
// commit lines, its section markers, and its rules — nothing else. The other comments name contributors, with their
// e-mail addresses: they are never copied (no personal data in the repository). The rules are unchanged.
import { reduireListeSuffixes } from "../psl";

const morceaux: Buffer[] = [];
process.stdin.on("data", (morceau: Buffer) => morceaux.push(morceau));
process.stdin.on("end", () => {
  process.stdout.write(reduireListeSuffixes(Buffer.concat(morceaux).toString("utf8")));
});
