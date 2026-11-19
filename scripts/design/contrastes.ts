// WCAG 2.2 contrasts of the design tokens: text 4.5:1, controls and graphical objects 3:1. The text and controls on the
// tokens of app/globals.css (checked on the image by contrastes-image.ts); the 3D on its rendered colours: the globe as
// measured on the image by rendu-globe.ts (--globe <couleur>, or its last measure; else the token, said so), the
// threads in their own colours (every shader converts to the screen), the coasts blended at their opacity over it.
//   npx tsx scripts/design/contrastes.ts [--globe #05080B]
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { JETONS } from "../../lib/design/tokens";
import { clarte, depuisHex, ecrireMesures, fr, option, ratio, versHex } from "./commun";

const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(readFileSync("app/globals.css", "utf8"))?.[1] ?? "";
const jeton = (nom: string) => {
  const valeur = new RegExp(`--color-${nom}:\\s*(#[0-9A-Fa-f]{6});`).exec(theme)?.[1];
  if (!valeur) throw new Error(`jeton absent de @theme : --color-${nom}`);
  return valeur.toUpperCase();
};
const derniere = path.join(process.env["MESURES"] ?? path.join(tmpdir(), "sovermap-mesures"), "rendu-globe.json");
const mesure = existsSync(derniere) ? (JSON.parse(readFileSync(derniere, "utf8")) as { globe: string }).globe : undefined;
const globe = option("globe") ?? mesure ?? JETONS.scene.globe;
const origineGlobe = option("globe") ? "donné" : mesure ? "mesuré sur l'image" : "jeton, non mesuré";
/** A colour drawn at an opacity over another one (the framebuffer blends the sRGB values). */
const melange = (dessus: string, dessous: string, alpha: number) => {
  const [a, b] = [depuisHex(dessus), depuisHex(dessous)];
  return versHex([0, 1, 2].map((i) => alpha * (a[i] ?? 0) + (1 - alpha) * (b[i] ?? 0)) as [number, number, number]);
};
const s = JETONS.scene;
const paires: [string, string, string, string, number][] = [
  ["encre / fond", jeton("encre"), jeton("fond"), "texte", 4.5],
  ["discret / fond", jeton("discret"), jeton("fond"), "texte", 4.5],
  ["accent / fond", jeton("accent"), jeton("fond"), "texte", 4.5],
  ["encre / surface", jeton("encre"), jeton("surface"), "texte", 4.5],
  ["discret / surface", jeton("discret"), jeton("surface"), "texte", 4.5],
  ["encre / surface-2", jeton("encre"), jeton("surface-2"), "texte", 4.5],
  ["discret / surface-2", jeton("discret"), jeton("surface-2"), "texte", 4.5],
  ["accent / surface", jeton("accent"), jeton("surface"), "texte", 4.5],
  ["sur-accent / accent", jeton("sur-accent"), jeton("accent"), "texte", 4.5],
  ["controle / fond", jeton("controle"), jeton("fond"), "contrôle", 3],
  ["controle / surface", jeton("controle"), jeton("surface"), "contrôle", 3],
  [`fil hors UE ${s.fils.horsUE} / globe`, s.fils.horsUE, globe, "objet graphique, rendu", 3],
  [`fil UE ${s.fils.ue} / globe`, s.fils.ue, globe, "objet graphique, rendu", 3],
  [`côtes ${melange(s.cote, globe, 0.8)} / globe`, melange(s.cote, globe, 0.8), globe, "objet graphique, rendu", 3],
  [`filets ${jeton("filet")} / globe`, jeton("filet"), globe, "objet graphique, rendu", 3],
];
const lignes = [`fond ${jeton("fond")}, clarté OKLCH ${fr(clarte(depuisHex(jeton("fond"))), 3)} · globe ${globe}, clarté ${fr(clarte(depuisHex(globe)), 3)} (${origineGlobe})`];
const resultats: Record<string, number> = {};
let echecs = 0;
for (const [nom, a, b, genre, seuil] of paires) {
  const r = ratio(depuisHex(a), depuisHex(b));
  if (r < seuil) echecs += 1;
  resultats[nom] = Number(r.toFixed(2));
  lignes.push(`   ${nom.padEnd(32)} ${fr(r)}:1 ${r >= seuil ? "OK" : "INSUFFISANT"} (${genre}, seuil ${fr(seuil, 1)})`);
}
// The silhouette of the globe on the page is not needed to read anything (the coasts, the threads, the labels and the
// halo carry it): given for information, without a threshold.
const silhouette = ratio(depuisHex(globe), depuisHex(jeton("fond")));
lignes.push(`   ${"globe / fond de page".padEnd(32)} ${fr(silhouette)}:1 (information, sans seuil : le halo, les côtes et les fils dessinent le globe)`);
ecrireMesures("contrastes.json", { globe, origineGlobe, resultats, silhouette: Number(silhouette.toFixed(2)), echecs });
console.log(lignes.join("\n"));
console.log(echecs === 0 ? "contrastes : tous suffisants" : `contrastes : ${echecs} insuffisant(s)`);
