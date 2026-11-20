// Rendered colour of the globe, measured on the image: a page that carries the globe, on a computer (1707 × 799 at
// scale 1.5), once the threads have traced themselves. The globe: the median of an ocean patch just south of its
// centre (the view at rest looks at the North Atlantic); the page: its most frequent colour. Every shader converts its
// colours to the screen (ARRÊT 2 ter), but the lit globe shows its own shading: the contrasts of the 3D are computed on
// this rendered colour (contrastes.ts reads it).
//   npx tsx scripts/design/rendu-globe.ts <chemin>
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { APPAREILS, ECHELLE, adresse, attendreGlobe, clarte, ecrireMesures, fr, frequente, lancerEdge, lireImage, mediane, pixels, ratio, versHex } from "./commun";

const [chemin = "/"] = process.argv.slice(2);
const k = ECHELLE.ordinateur;
const navigateur = await lancerEdge();
const page = await navigateur.newPage(APPAREILS.ordinateur);
await page.goto(adresse(chemin), { waitUntil: "load" });
await attendreGlobe(page);
await page.waitForTimeout(5000);
const r = await page.locator(".scene canvas").boundingBox();
if (!r) throw new Error(`pas de globe : ${chemin}`);
const fichier = path.join(tmpdir(), "sovermap-rendu-globe.png");
await page.screenshot({ path: fichier, scale: "device" });
await navigateur.close();

const centre = { x: (r.x + r.width / 2) * k, y: (r.y + r.height / 2) * k };
const globe = mediane(pixels(lireImage(fichier, { x: centre.x - 20, y: centre.y + 120, l: 40, h: 40 })));
const fond = frequente(pixels(lireImage(fichier)));
rmSync(fichier, { force: true });
const resultat = { globe: versHex(globe), clarteGlobe: Number(clarte(globe).toFixed(3)), page: versHex(fond), clartePage: Number(clarte(fond).toFixed(3)), contraste: Number(ratio(globe, fond).toFixed(2)) };
ecrireMesures("rendu-globe.json", { chemin, ...resultat });
console.log(`globe rendu ${resultat.globe} (clarté ${fr(resultat.clarteGlobe, 3)}) ; page ${resultat.page} (clarté ${fr(resultat.clartePage, 3)}) ; globe contre la page ${fr(resultat.contraste)}:1`);
