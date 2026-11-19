// Fixed images of a page that carries the globe, at exact moments of the virtual clock of the films (horloge.ts), to
// compare two builds pixel by pixel (ecart-rendu.ts). For each page and device: the images 1.0, 1.5 and 2.0 s after the
// scene is ready (the threads tracing themselves, with the light at their tip) and 6.0 s after (steady), with the
// geometry of the globe (canvas, centre, radius, in device pixels) and the threads and points on screen.
//   npx tsx scripts/design/images-fixes.ts <dossier> <nom>=<chemin>...      e.g. accueil=/
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { APPAREILS, ECHELLE, adresse, attendreGlobe, lancerEdge, type Appareil } from "./commun";
import { HORLOGE } from "./horloge";

const IMAGE = 1000 / 30;
const MOMENTS = [30, 45, 60, 180];
const [dossier = "images-fixes", ...pages] = process.argv.slice(2);
mkdirSync(dossier, { recursive: true });

type Point = { x: number; y: number };
const navigateur = await lancerEdge();
for (const entree of pages) {
  const [nom = "", chemin = "/"] = entree.split("=");
  for (const appareil of ["ordinateur", "telephone"] as Appareil[]) {
    const ctx = await navigateur.newContext(APPAREILS[appareil]);
    await ctx.addInitScript({ content: HORLOGE });
    const page = await ctx.newPage();
    await page.goto(adresse(chemin), { waitUntil: "load" });
    await attendreGlobe(page);
    const k = ECHELLE[appareil];
    const geometrie: Record<number, unknown> = {};
    for (let image = 1; image <= Math.max(...MOMENTS); image += 1) {
      await page.evaluate((ms) => (window as unknown as { __avancer: (ms: number) => Promise<void> }).__avancer(ms), IMAGE);
      if (!MOMENTS.includes(image)) continue;
      const g = await page.evaluate(() => {
        const r = document.querySelector(".scene canvas")?.getBoundingClientRect();
        const m = (window as unknown as { __sovermap3d: { fils?: Point[][]; points?: (Point & { code: string; visible: boolean })[] } }).__sovermap3d;
        return { toile: r ? { x: r.x, y: r.y, l: r.width, h: r.height } : null, fils: m.fils ?? [], points: (m.points ?? []).filter((p) => p.visible).map((p) => ({ code: p.code, x: p.x, y: p.y })) };
      });
      if (!g.toile) throw new Error(`pas de scène : ${nom} ${appareil}`);
      // In device pixels: the canvas, the centre of the globe and its radius (0.89 of the smaller side, centred).
      const t = g.toile;
      geometrie[image] = {
        toile: { x: t.x * k, y: t.y * k, l: t.l * k, h: t.h * k },
        centre: { x: (t.x + t.l / 2) * k, y: (t.y + t.h / 2) * k },
        rayon: 0.445 * Math.min(t.l, t.h) * k,
        fils: g.fils.map((f) => f.map((p) => ({ x: (t.x + p.x) * k, y: (t.y + p.y) * k }))),
        points: g.points.map((p) => ({ code: p.code, x: (t.x + p.x) * k, y: (t.y + p.y) * k })),
      };
      await page.screenshot({ path: path.join(dossier, `${nom}-${appareil}-${image}.png`), scale: "device", caret: "hide", animations: "allow" });
    }
    writeFileSync(path.join(dossier, `${nom}-${appareil}.json`), JSON.stringify({ nom, chemin, appareil, echelle: k, moments: MOMENTS, geometrie }, null, 2));
    console.log(`${nom} ${appareil} : ${MOMENTS.length} images fixes (après ${MOMENTS.map((m) => (m / 30).toFixed(1).replace(".", ",")).join(", ")} s)`);
    await ctx.close();
  }
}
await navigateur.close();
