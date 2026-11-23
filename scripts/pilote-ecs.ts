// The measurement point's pilot (brief B.4; plan § 9, point 6), run once on GitHub's runners by its own workflow
// (.github/workflows/pilote-ecs.yml), never on the owner's PC. It reads the published state (the « donnees » branch),
// the IPtoASN copy and the referential; then, robots.txt first, it asks Google Public DNS's JSON API (card 15, control
// only) for the A records of each drawn web name, once per explicit client subnet (France, United States), one
// question a second at most, with the project's user agent; it writes its report and prints counts only (the job's
// log is public: no company, no address).
//   npx tsx scripts/pilote-ecs.ts --donnees <dir> --iptoasn <ip2asn-combined-*.tsv.gz> --sortie <report.json>
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import { TableIpToAsn } from "@/pipeline/reseau";
import type { ReferentielAs } from "@/pipeline/societes";
import { agentUtilisateur } from "@/pipeline/sources";
import {
  bilanDuPilote,
  domainesDuPilote,
  type ResultatDomaine,
  societesDesAdresses,
  SOUS_RESEAUX,
} from "./lib/pilote-ecs";

const API = "https://dns.google";
const ECART_MS = 1_000;

const { values: o } = parseArgs({
  options: { donnees: { type: "string" }, iptoasn: { type: "string" }, sortie: { type: "string" } },
});
if (process.env["GITHUB_ACTIONS"] !== "true") throw new Error("le pilote ne tourne que sur les runners de GitHub (B.4)");
if (o.donnees === undefined || o.iptoasn === undefined || o.sortie === undefined)
  throw new Error("--donnees, --iptoasn et --sortie sont demandés");

/** Every record of a kind in the published state's fragments (domaines/xx/yy.json, noms/xx/yy.json). */
function fragments<T>(dossier: string, sorte: "domaines" | "noms"): T[] {
  const racine = path.join(dossier, sorte);
  return readdirSync(racine).flatMap((haut) =>
    readdirSync(path.join(racine, haut))
      .filter((f) => /^[0-9a-f]{2}([.][0-9]+)?[.]json$/.test(f))
      .flatMap((f) => (JSON.parse(readFileSync(path.join(racine, haut, f), "utf8")) as Record<string, T[]>)[sorte] ?? []),
  );
}

const AGENT = agentUtilisateur(JSON.parse(readFileSync("package.json", "utf8")).version as string);
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
let derniere = 0;
async function demander(url: string): Promise<Response> {
  const reste = derniere + ECART_MS - Date.now();
  if (reste > 0) await attendre(reste);
  derniere = Date.now();
  return fetch(url, { headers: { "User-Agent": AGENT, Accept: "application/json" }, redirect: "error" });
}

// robots.txt first: the pilot stops if it closes /resolve to every agent.
const robots = await demander(`${API}/robots.txt`);
if (robots.ok) {
  let pourTous = false;
  for (const ligne of (await robots.text()).split("\n").map((l) => l.trim())) {
    if (/^user-agent:/i.test(ligne)) pourTous = ligne.slice(11).trim() === "*";
    else if (pourTous && /^disallow:/i.test(ligne)) {
      const chemin = ligne.slice(9).trim();
      if (chemin === "/" || (chemin !== "" && "/resolve".startsWith(chemin)))
        throw new Error(`robots.txt de dns.google ferme ${chemin} : pilote arrêté`);
    }
  }
}

const domaines = fragments<EnregistrementDomaine>(o.donnees, "domaines");
const noms = new Map(fragments<EnregistrementNom>(o.donnees, "noms").map((n) => [n.nom, n]));
const iptoasn = new TableIpToAsn(gunzipSync(readFileSync(o.iptoasn)).toString("utf8"));
const tableAs = JSON.parse(readFileSync("referentiels/as-societes.json", "utf8")) as ReferentielAs;
const date = new Date().toISOString().slice(0, 10);
const tires = domainesDuPilote(domaines, noms, Number(date.replaceAll("-", "")));
console.log(`pilote : ${tires.length} domaines derrière un CDN, ${SOUS_RESEAUX.length} sous-réseaux, une question par seconde`);

const resultats: ResultatDomaine[] = [];
let echecs = 0;
for (const d of tires) {
  const parSousReseau: Record<string, string[] | null> = {};
  for (const s of SOUS_RESEAUX) {
    const url = `${API}/resolve?name=${encodeURIComponent(d.nomWeb)}&type=A&edns_client_subnet=${encodeURIComponent(s.prefixe)}`;
    try {
      const reponse = await demander(url);
      const corps = (await reponse.json()) as { Status?: number; Answer?: { type?: number; data?: string }[] };
      const adresses = (corps.Answer ?? []).filter((a) => a.type === 1 && typeof a.data === "string").map((a) => a.data as string);
      parSousReseau[s.pays] = reponse.ok && corps.Status === 0 && adresses.length > 0 ? societesDesAdresses(adresses, iptoasn, tableAs) : null;
    } catch {
      parSousReseau[s.pays] = null;
      echecs += 1;
    }
  }
  resultats.push({ ...d, parSousReseau });
}
const bilan = bilanDuPilote(resultats);
writeFileSync(o.sortie, `${JSON.stringify({ date, sousReseaux: SOUS_RESEAUX, bilan, resultats }, null, 2)}\n`);
console.log(
  `pilote : ${bilan.compares} domaines comparés sur ${bilan.domaines} ; ${bilan.changent} changent de société selon le sous-réseau ` +
    `(${String(bilan.partPourcent).replace(".", ",")} %, seuil 1 % : ${bilan.auDelaDuSeuil ? "dépassé" : "tenu"}) ; ${echecs} questions sans réponse`,
);
