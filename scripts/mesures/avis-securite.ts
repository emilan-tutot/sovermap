// At each point (the owner's rule): the GitHub advisories (npm) that touch the installed versions of next, react and
// react-dom. The versions are read in node_modules, the ranges in the advisory database through gh, read only, page
// by page. A withdrawn advisory does not count.   npx tsx scripts/mesures/avis-securite.ts
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chaine, liste, objet } from "./etat-publie";
import { dansLaPlage } from "./versions";

const PAQUETS = ["next", "react", "react-dom"] as const;
const REQUETE = `query($p: String!, $a: String) {
  securityVulnerabilities(ecosystem: NPM, package: $p, first: 100, after: $a) {
    pageInfo { hasNextPage endCursor }
    nodes { vulnerableVersionRange advisory { ghsaId publishedAt severity withdrawnAt } }
  }
}`;

for (const paquet of PAQUETS) {
  const manifeste = objet(JSON.parse(readFileSync(path.join("node_modules", paquet, "package.json"), "utf8")));
  const version = chaine(manifeste?.["version"]);
  if (version === null) throw new Error(`version de ${paquet} illisible dans node_modules`);
  const touches: string[] = [];
  let total = 0;
  let apres: string | null = null;
  do {
    const args = ["api", "graphql", "-f", `query=${REQUETE}`, "-f", `p=${paquet}`];
    if (apres !== null) args.push("-f", `a=${apres}`);
    const reponse = objet(JSON.parse(execFileSync("gh", args, { encoding: "utf8" })));
    const page = objet(objet(reponse?.["data"])?.["securityVulnerabilities"]);
    for (const n of liste(page?.["nodes"])) {
      total += 1;
      const noeud = objet(n);
      const avis = objet(noeud?.["advisory"]);
      if (avis === null || (avis["withdrawnAt"] ?? null) !== null) continue;
      if (!dansLaPlage(version, chaine(noeud?.["vulnerableVersionRange"]) ?? "")) continue;
      const jour = (chaine(avis["publishedAt"]) ?? "").slice(0, 10);
      touches.push(`${chaine(avis["ghsaId"]) ?? "?"} (${chaine(avis["severity"]) ?? "?"}, ${jour})`);
    }
    const pages = objet(page?.["pageInfo"]);
    apres = pages?.["hasNextPage"] === true ? chaine(pages["endCursor"]) : null;
  } while (apres !== null);
  const detail = touches.length > 0 ? ` : ${touches.join(", ")}` : "";
  console.log(`${paquet} ${version} : ${touches.length} avis sur ${total} touchent cette version${detail}`);
}
