// The measurement point's pilot (brief B.4; plan § 9, point 6), run once on GitHub's runners by its own workflow
// (.github/workflows/pilote-ecs.yml), never on the owner's PC. It reads the published state (the « donnees » branch),
// the IPtoASN copy and the referentials, downloads the CDNs' official ranges as the collection does (card 27), then
// asks Google Public DNS's JSON API (card 15, control only) for the A records of each drawn web name, once per
// explicit client subnet (France, United States), through the project's polite downloader (robots.txt first, one
// question a second at most, 15 seconds at most each). It writes its report even when it stops early, and prints
// counts only (the job's log is public: no company, no address).
//   npx tsx scripts/pilote-ecs.ts --donnees <dir> --iptoasn <ip2asn-combined-*.tsv.gz> --sortie <report.json>
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import type { ReferentielCdn } from "@/pipeline/cdn";
import type { Contexte } from "@/pipeline/classement";
import { coucheReseauPubliable } from "@/pipeline/couches";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import { TableIpToAsn, TableRis } from "@/pipeline/reseau";
import type { ReferentielAs, ReferentielSocietes } from "@/pipeline/societes";
import { agentUtilisateur, Telechargeur } from "@/pipeline/sources";
import { SOURCES, telechargerSources } from "@/pipeline/telechargements";
import {
  bilanDuPilote,
  domainesDuPilote,
  mesureVide,
  mesurer,
  plagesOfficielles,
  SOUS_RESEAUX,
} from "./lib/pilote-ecs";

const { values: o } = parseArgs({
  options: { donnees: { type: "string" }, iptoasn: { type: "string" }, sortie: { type: "string" } },
});
if (process.env["GITHUB_ACTIONS"] !== "true") throw new Error("le pilote ne tourne que sur les runners de GitHub (B.4)");
if (o.donnees === undefined || o.iptoasn === undefined || o.sortie === undefined)
  throw new Error("--donnees, --iptoasn et --sortie sont demandés");
const sortie = o.sortie;

/** Every record of a kind in the published state's fragments (domaines/xx/yy.json, noms/xx/yy.json). */
function fragments<T>(dossier: string, sorte: "domaines" | "noms"): T[] {
  const racine = path.join(dossier, sorte);
  return readdirSync(racine).flatMap((haut) =>
    readdirSync(path.join(racine, haut))
      .filter((f) => /^[0-9a-f]{2}([.][0-9]+)?[.]json$/.test(f))
      .flatMap((f) => (JSON.parse(readFileSync(path.join(racine, haut, f), "utf8")) as Record<string, T[]>)[sorte] ?? []),
  );
}
const json = <T>(fichier: string) => JSON.parse(readFileSync(fichier, "utf8")) as T;

const telechargeur = new Telechargeur({
  agent: agentUtilisateur(json<{ version: string }>("package.json").version),
  delaiMs: 15_000,
  tailleMax: 4 * 1024 * 1024,
});

// The CDNs' official ranges (card 27), downloaded as the collection downloads them; a list in failure is left out.
const travail = mkdtempSync(path.join(tmpdir(), "pilote-ecs-"));
const ID_PLAGES = ["cloudflare-ipv4", "cloudflare-ipv6", "fastly"];
const etats = await telechargerSources(
  telechargeur,
  travail,
  null,
  new Date(),
  SOURCES.filter((s) => ID_PLAGES.includes(s.id)),
);
const lire = (id: string) => {
  const f = path.join(travail, "sources", id);
  return etats.some((e) => e.id === id && e.etat === "du jour") && existsSync(f) ? readFileSync(f, "utf8") : null;
};
const contexte: Contexte = {
  iptoasn: new TableIpToAsn(gunzipSync(readFileSync(o.iptoasn)).toString("utf8")),
  // No RIS on the pilot's side: the AS comes from IPtoASN, as the published network layer takes it.
  ris: new TableRis([]),
  cdn: json<ReferentielCdn>("referentiels/cdn.json"),
  plages: plagesOfficielles(
    [lire("cloudflare-ipv4"), lire("cloudflare-ipv6")].filter((t) => t !== null),
    lire("fastly"),
  ),
  coucheReseau: coucheReseauPubliable,
  tableAs: json<ReferentielAs>("referentiels/as-societes.json"),
  societes: json<ReferentielSocietes>("referentiels/societes.json"),
};

const domaines = fragments<EnregistrementDomaine>(o.donnees, "domaines");
const noms = new Map(fragments<EnregistrementNom>(o.donnees, "noms").map((n) => [n.nom, n]));
const date = new Date().toISOString().slice(0, 10);
const tires = domainesDuPilote(domaines, noms, Number(date.replaceAll("-", "")));
console.log(
  `pilote : ${tires.length} domaines derrière un CDN tirés au hasard (${tires.filter((d) => d.perimetre === "État").length} du périmètre « État »), ` +
    `${SOUS_RESEAUX.length} sous-réseaux, une question par seconde au plus ; listes officielles des CDN : ` +
    `${etats.filter((e) => e.etat === "du jour").length} sur ${ID_PLAGES.length}`,
);

const mesure = mesureVide();
try {
  await mesurer(tires, (adresse) => telechargeur.obtenir(adresse), contexte, mesure);
} finally {
  const bilan = bilanDuPilote(mesure.resultats);
  writeFileSync(
    sortie,
    `${JSON.stringify({ date, sousReseaux: SOUS_RESEAUX, listesOfficielles: etats, bilan, ...mesure }, null, 2)}\n`,
  );
  const part = bilan.partPourcent === null ? "aucune part" : `${String(bilan.partPourcent).replace(".", ",")} %`;
  console.log(
    `pilote : ${bilan.compares} domaines comparés sur ${bilan.domaines} ; ${bilan.changent} changent de société selon le sous-réseau ` +
      `(${part} ; seuil 1 % : ${bilan.decision}) ; ${mesure.questions} questions, ${mesure.sansReponse} sans réponse de l'API, ` +
      `${mesure.sansAdresse} sans adresse`,
  );
}
if (mesure.arret !== null) {
  console.error(`pilote arrêté : ${mesure.arret} (le rapport garde ce qui a été mesuré)`);
  process.exitCode = 1;
}
