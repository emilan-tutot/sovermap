// Phase 1 of the collection v0: DNS observations of a list of names, by a main resolver and a control resolver.
//   npx tsx pipeline/cli/mesurer.ts <liste.json> <sortie.json> [principal=1.1.1.1] [controle=9.9.9.9]
// One query at a time, a pause between queries (polite rate, docs/methode.md § 7).
import { readFileSync, writeFileSync } from "node:fs";
import { NodeDnsClient, observer, type ObservationDns } from "../dns";

type Entree = { nom: string; perimetre: "État" | "hors État"; groupe: string; raison: string };

const [listeChemin, sortie, principal = "1.1.1.1", controle = "9.9.9.9"] = process.argv.slice(2);
if (listeChemin === undefined || sortie === undefined) {
  console.error("usage : mesurer.ts <liste.json> <sortie.json> [principal] [controle]");
  process.exit(1);
}
const liste = JSON.parse(readFileSync(listeChemin, "utf8")) as { domaines: Entree[] };
const clientPrincipal = new NodeDnsClient(principal);
const clientControle = new NodeDnsClient(controle);

const resultats: { entree: Entree; principale: ObservationDns; controle: ObservationDns }[] = [];
const debut = Date.now();
for (const entree of liste.domaines) {
  const principale = await observer(entree.nom, clientPrincipal);
  const verification = await observer(entree.nom, clientControle);
  resultats.push({ entree, principale, controle: verification });
  console.log(
    `${entree.nom.padEnd(40)} ${principale.statut.padEnd(9)} ${principale.a.length + principale.aaaa.length} adresse(s)`,
  );
}
writeFileSync(
  sortie,
  JSON.stringify(
    {
      principal,
      controle,
      debut: new Date(debut).toISOString(),
      duree_s: Math.round((Date.now() - debut) / 1000),
      resultats,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log(`\n${resultats.length} domaines mesurés en ${Math.round((Date.now() - debut) / 1000)} s.`);
