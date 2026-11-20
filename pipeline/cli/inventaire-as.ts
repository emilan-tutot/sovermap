// Lists the AS seen in a set of observations (main and control resolvers, served addresses and name servers), with
// the IPtoASN description and how many domains use each. Used to know which rows the hand-kept tables need.
//   npx tsx pipeline/cli/inventaire-as.ts <observations.json> <ip2asn-combined.tsv.gz> <riswhoisdump.IPv4.gz> <riswhoisdump.IPv6.gz>
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { ObservationDns } from "../dns";
import { coucheReseau, TableIpToAsn, TableRis } from "../reseau";

const [obs, iptoasnChemin, ris4, ris6] = process.argv.slice(2);
if (!obs || !iptoasnChemin || !ris4 || !ris6) throw new Error("arguments manquants");
const lire = (chemin: string) => gunzipSync(readFileSync(chemin)).toString("utf8");
const iptoasn = new TableIpToAsn(lire(iptoasnChemin));
const ris = new TableRis([lire(ris4), lire(ris6)]);
const donnees = JSON.parse(readFileSync(obs, "utf8")) as {
  resultats: { principale: ObservationDns; controle: ObservationDns }[];
};

const compte = new Map<number, { description: string; domaines: Set<string>; role: Set<string> }>();
const noter = (asn: number, description: string | null, domaine: string, role: string) => {
  const e = compte.get(asn) ?? {
    description: description ?? "?",
    domaines: new Set<string>(),
    role: new Set<string>(),
  };
  e.domaines.add(domaine);
  e.role.add(role);
  if (e.description === "?" && description) e.description = description;
  compte.set(asn, e);
};
let desaccords = 0;
for (const { principale, controle } of donnees.resultats) {
  for (const [obsx, role] of [
    [principale, "adresse"],
    [controle, "adresse (contrôle)"],
  ] as const) {
    for (const ip of [...obsx.a, ...obsx.aaaa]) {
      const c = coucheReseau(ip, iptoasn, ris);
      if (c.niveau === "non déterminé") desaccords += 1;
      for (const asn of c.asns) noter(asn, c.descriptionAs, principale.nom, role);
    }
  }
  for (const ip of Object.values(principale.adressesNs)) {
    if (!ip) continue;
    const c = coucheReseau(ip, iptoasn, ris);
    for (const asn of c.asns) noter(asn, c.descriptionAs, principale.nom, "serveur de noms");
  }
}
console.log(`IPtoASN : ${iptoasn.taille} plages ; désaccords IPtoASN/RIS sur les adresses servies : ${desaccords}`);
for (const [asn, e] of [...compte.entries()].sort((a, b) => b[1].domaines.size - a[1].domaines.size)) {
  console.log(
    `AS${String(asn).padEnd(7)} ${String(e.domaines.size).padStart(3)} domaine(s)  ${[...e.role].join(", ").padEnd(42)} ${e.description}`,
  );
}
