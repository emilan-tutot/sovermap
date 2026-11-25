// The base map of the territories (brief C.6; docs/sources.md, card 53).
//   npx tsx pipeline/cli/fond-de-carte.ts epingler
// downloads the departments layer of ADMIN EXPRESS COG CARTO PE, edition 2026 (never « .LATEST », which changes without
// warning), from the Géoplateforme's WFS with the polite downloader (robots.txt first, one second between two
// requests, the project's agent), reads it at the border (pipeline/carte.ts), and writes the dated copy
// referentiels/fond-de-carte/departements-2026.geojson; it prints the SHA-256 and the size of the answer, for the
// copy's LISEZMOI.md. A new edition comes by a pull request, as the Public Suffix List does. The regions are not
// downloaded: each department carries its region's code, and the regions' borders are drawn from the departments'.
//   npx tsx pipeline/cli/fond-de-carte.ts deriver
// reads the dated copy at the border again and writes the drawing the site shows, lib/carte/fond-de-carte.json
// (pipeline/carte.ts: projected, every border simplified once).
// Run from the repository's root.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { copieDepartements, deriverFondDeCarte, lireCoucheDepartements } from "../carte";
import { agentUtilisateur, Telechargeur } from "../sources";

const RACINE = process.cwd();
const MILLESIME = "2026";
const COUCHE = `ADMINEXPRESS-COG-CARTO-PE.${MILLESIME}:departement`;
const ADRESSE =
  "https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature" +
  `&TYPENAMES=${encodeURIComponent(COUCHE)}&OUTPUTFORMAT=${encodeURIComponent("application/json")}&SRSNAME=EPSG:4326`;
export const COPIE = path.join("referentiels", "fond-de-carte", `departements-${MILLESIME}.geojson`);

async function epingler(): Promise<void> {
  const version = (JSON.parse(readFileSync(path.join(RACINE, "package.json"), "utf8")) as { version: string }).version;
  // The layer is about 2 MB: 16 MiB bounds any answer.
  const telechargeur = new Telechargeur({ agent: agentUtilisateur(version), tailleMax: 16 * 1024 * 1024 });
  const reponse = await telechargeur.obtenir(ADRESSE);
  if (reponse.statut !== 200) throw new Error(`réponse ${reponse.statut} de la Géoplateforme`);
  const departements = lireCoucheDepartements(JSON.parse(reponse.corps.toString("utf8")) as unknown);
  const sortie = path.join(RACINE, COPIE);
  mkdirSync(path.dirname(sortie), { recursive: true });
  writeFileSync(sortie, copieDepartements(departements));
  const empreinte = createHash("sha256").update(reponse.corps).digest("hex");
  console.log(`couche : ${COUCHE}`);
  console.log(`réponse : ${reponse.corps.length} octets, SHA-256 ${empreinte}`);
  console.log(`copie : ${COPIE}, ${departements.length} départements, ${readFileSync(sortie).length} octets`);
}

export const DESSIN = path.join("lib", "carte", "fond-de-carte.json");

function deriver(): void {
  const departements = lireCoucheDepartements(JSON.parse(readFileSync(path.join(RACINE, COPIE), "utf8")) as unknown);
  const fond = deriverFondDeCarte(departements);
  const sortie = path.join(RACINE, DESSIN);
  mkdirSync(path.dirname(sortie), { recursive: true });
  const texte = `${JSON.stringify(fond, null, 1)}\n`;
  writeFileSync(sortie, texte);
  const points = fond.departements.reduce((n, d) => n + d.d.split(" ").length - 1, 0);
  console.log(`dessin : ${DESSIN}, ${Buffer.byteLength(texte)} octets, environ ${points} points`);
}

const commande = process.argv[2];
if (commande === "epingler") await epingler();
else if (commande === "deriver") deriver();
else throw new Error("commande attendue : epingler ou deriver");
