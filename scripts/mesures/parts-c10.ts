// The shares of C.10, at each point: the web names that answer of the « État » domains, by level (confirmé, probable,
// non déterminé), then the same for every domain, read in a published state (a local copy of « donnees », or the
// « sortie » folder of a run's artifact). Local files only.
//   npx tsx scripts/mesures/parts-c10.ts <dossier de l'état publié>
import { chaine, type Fiche, lireFiches } from "./etat-publie";

const [dossier = "."] = process.argv.slice(2);
const domaines = lireFiches(dossier, "domaines");
const noms = lireFiches(dossier, "noms");
const NIVEAUX = ["confirmé", "probable", "non déterminé"] as const;

function parts(retenu: (d: Fiche) => boolean): string {
  let total = 0;
  const parNiveau = new Map<string, number>();
  for (const d of domaines.values()) {
    if (!retenu(d)) continue;
    const web = noms.get(chaine(d["nomWeb"]) ?? "");
    if (web === undefined || web["etat"] !== "ok") continue;
    total += 1;
    const niveau = chaine(web["niveau"]) ?? "?";
    parNiveau.set(niveau, (parNiveau.get(niveau) ?? 0) + 1);
  }
  const part = (n: number) => ((100 * n) / Math.max(1, total)).toFixed(1).replace(".", ",");
  const detail = NIVEAUX.map((n) => `${n} ${parNiveau.get(n) ?? 0} (${part(parNiveau.get(n) ?? 0)} %)`);
  return `${total} noms web qui répondent : ${detail.join(", ")}`;
}

console.log(`État : ${parts((d) => d["perimetre"] === "État")}`);
console.log(`tous : ${parts(() => true)}`);
