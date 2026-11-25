// B.6 and G.3, the growth of « donnees » between two of its commits: the compressed size they add (a thin pack, as git
// stores the new objects against the old ones), then which fields of the records change, on a sample of the fragments
// that changed, so that one-time changes (rules, provenance) are told from the daily churn. Read only, on local git
// objects (fetch the branch first).
//   npx tsx scripts/mesures/croissance-donnees.ts <commit avant> <commit après> [échantillon=300]
import { execFileSync } from "node:child_process";
import { chaine, type Fiche, FRAGMENT, liste, objet } from "./etat-publie";

const [avant = "", apres = "", nombre = "300"] = process.argv.slice(2);
if (avant === "" || apres === "") throw new Error("deux commits attendus : avant, puis après");
// A commit given by hand never becomes an option of git (« --output=… » would write a file).
if (avant.startsWith("-") || apres.startsWith("-")) throw new Error("un commit ne commence jamais par « - »");
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });

const paquet = execFileSync("git", ["pack-objects", "--revs", "--thin", "--stdout", "-q"], {
  input: `${apres}\n^${avant}\n`,
  maxBuffer: 1 << 30,
});
console.log(`taille ajoutée : ${(paquet.length / 1e6).toFixed(2).replace(".", ",")} Mo compressés`);

// The fragments of records only (noms/<bb>/<fragment>, domaines/<bb>/<fragment>), never their checksums (sommes.json).
const changes = git("diff", "--name-only", avant, apres)
  .split("\n")
  .filter((f) => {
    const [sorte, , fichier = ""] = f.split("/");
    return (sorte === "noms" || sorte === "domaines") && FRAGMENT.test(fichier);
  });
const pas = Math.max(1, Math.floor(changes.length / Math.max(1, Number(nombre))));
const echantillon = changes.filter((_, i) => i % pas === 0);
const champs = new Map<string, number>();
const parCause = new Map<string, number>();
const compter = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

for (const fichier of echantillon) {
  const sorte = fichier.startsWith("noms/") ? "noms" : "domaines";
  const cle = sorte === "noms" ? "nom" : "domaine";
  const lire = (commit: string): Fiche[] => {
    try {
      return liste(objet(JSON.parse(git("show", `${commit}:${fichier}`)))?.[sorte]).flatMap((e) => {
        const f = objet(e);
        return f === null ? [] : [f];
      });
    } catch {
      // The fragment did not exist on that side (created or removed).
      return [];
    }
  };
  const anciens = new Map(lire(avant).map((f) => [chaine(f[cle]) ?? "", f] as const));
  const causes = new Set<string>();
  for (const f of lire(apres)) {
    const ancien = anciens.get(chaine(f[cle]) ?? "");
    if (ancien === undefined) {
      causes.add("(nouvel enregistrement)");
      continue;
    }
    for (const k of new Set([...Object.keys(ancien), ...Object.keys(f)])) {
      if (JSON.stringify(ancien[k]) === JSON.stringify(f[k])) continue;
      compter(champs, `${sorte}.${k}`);
      causes.add(k);
    }
  }
  // A fragment that changed with no record changed or added lost one.
  compter(parCause, `${sorte}: ${[...causes].sort().join("+") || "(enregistrement retiré)"}`);
}

console.log(`fragments de fiches changés (sans les sommes) : ${changes.length} ; échantillon : ${echantillon.length}`);
console.log("champs changés (enregistrements) :");
for (const [k, n] of [...champs].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${n}\t${k}`);
console.log("fragments par cause :");
for (const [k, n] of [...parCause].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${n}\t${k}`);
