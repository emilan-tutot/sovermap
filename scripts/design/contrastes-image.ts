// WCAG 2.2 contrasts of texts, measured on the image (ARRÊT 2 ter): a page on a computer (1707 × 799 at scale 1.5);
// with the globe, once its threads have traced themselves. For each element named on the command line: its background
// is the most frequent colour of its box, its text the pixel of the box that stands out most against that background
// (the core of the letters). Threshold: 4.5:1.
//   npx tsx scripts/design/contrastes-image.ts <chemin> <nom>=<sélecteur>...
//   e.g. npx tsx scripts/design/contrastes-image.ts / texte=.titre-page secondaire=.note
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AIDE_TSX, APPAREILS, ECHELLE, adresse, aLeGlobe, attendreGlobe, clarte, ecrireMesures, fr, frequente, lancerEdge, lireImage, pixels, ratio, versHex, type Rgb } from "./commun";

const [chemin = "/", ...elements] = process.argv.slice(2);
const k = ECHELLE.ordinateur;
const dossier = path.join(tmpdir(), "sovermap-contrastes-image");
mkdirSync(dossier, { recursive: true });
const navigateur = await lancerEdge();
const page = await navigateur.newPage(APPAREILS.ordinateur);
await page.addInitScript({ content: AIDE_TSX });
await page.goto(adresse(chemin), { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready.then(() => undefined));
if (await aLeGlobe(page)) {
  await attendreGlobe(page);
  await page.waitForTimeout(5000);
} else await page.waitForTimeout(800);
const boites = await page.evaluate(
  (liste) =>
    liste.map((e) => {
      const [nom = "", selecteur = ""] = e.split(/=(.*)/s);
      const r = document.querySelector(selecteur)?.getBoundingClientRect();
      return { nom, selecteur, boite: r ? { x: r.x, y: r.y, l: r.width, h: r.height } : null };
    }),
  elements,
);
const fichier = path.join(dossier, "page.png");
await page.screenshot({ path: fichier, scale: "device" });
await navigateur.close();

const resultats: Record<string, { fond: string; texte: string; contraste: number; clarteFond: number }> = {};
let faibles = 0;
for (const { nom, selecteur, boite } of boites) {
  if (!boite) throw new Error(`élément introuvable : ${nom} (${selecteur})`);
  const px = pixels(lireImage(fichier, { x: boite.x * k, y: boite.y * k, l: boite.l * k, h: boite.h * k }));
  const fond = frequente(px);
  const texte = px.reduce<Rgb>((m, p) => (ratio(p, fond) > ratio(m, fond) ? p : m), fond);
  const contraste = ratio(texte, fond);
  if (contraste < 4.5) faibles += 1;
  resultats[nom] = { fond: versHex(fond), texte: versHex(texte), contraste: Number(contraste.toFixed(2)), clarteFond: Number(clarte(fond).toFixed(3)) };
  console.log(`${nom.padEnd(14)} texte ${versHex(texte)} sur ${versHex(fond)} (clarté ${fr(clarte(fond), 3)}) : ${fr(contraste)}:1${contraste < 4.5 ? " INSUFFISANT" : ""}`);
}
rmSync(dossier, { recursive: true, force: true });
ecrireMesures("contrastes-image.json", { chemin, resultats });
console.log(faibles === 0 ? "contrastes sur l'image : tous au moins 4,5:1" : `contrastes sur l'image : ${faibles} sous 4,5:1`);
