// Fonts preloaded by pages of the site, and their weight: the <link rel="preload" as="font"> of each page, each file
// fetched from the site.
//   npx tsx scripts/design/polices.ts <chemin>...
import { ORIGINE, adresse, ecrireMesures, positionnels } from "./commun";

const PAGES = positionnels().length > 0 ? positionnels() : ["/"];
const resultats: Record<string, { fichiers: { nom: string; octets: number }[]; octets: number }> = {};
for (const chemin of PAGES) {
  const html = await (await fetch(adresse(chemin))).text();
  const liens = [...html.matchAll(/<link\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((l) => /rel="preload"/.test(l) && /as="font"/.test(l))
    .map((l) => /href="([^"]+)"/.exec(l)?.[1] ?? "")
    .filter(Boolean);
  const fichiers: { nom: string; octets: number }[] = [];
  for (const lien of liens) fichiers.push({ nom: lien.split("/").pop()?.split(".")[0] ?? lien, octets: (await (await fetch(new URL(lien, ORIGINE))).arrayBuffer()).byteLength });
  const octets = fichiers.reduce((s, f) => s + f.octets, 0);
  resultats[chemin] = { fichiers, octets };
  console.log(`${chemin} : ${fichiers.length} police(s) préchargée(s), ${Math.round(octets / 1024)} Ko${fichiers.length ? ` (${fichiers.map((f) => `${f.nom} ${Math.round(f.octets / 1024)} Ko`).join(", ")})` : ""}`);
}
ecrireMesures("polices.json", { resultats });
