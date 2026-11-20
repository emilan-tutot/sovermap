// Frames per second of the 3D, in real time (the films run on a virtual clock and say nothing of speed): Edge without
// any window, GPU through Direct3D 11; computer 1707 × 799 at scale 1.5; phone: Pixel 9 profile, processor × 4.
// 12 s of slow rotation after the scene is ready; the adaptive pixel density stays on, as for a visitor.
//   npx tsx scripts/design/fps.ts <chemin>...        (pages that carry the globe)
import { APPAREILS, adresse, attendreGlobe, ecrireMesures, lancerEdge, type Appareil } from "./commun";

const PAGES = process.argv.slice(2);
if (PAGES.length === 0) throw new Error("donner au moins une page qui porte le globe, par exemple /");
const navigateur = await lancerEdge();
const mediane = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 0;
const sortie: Record<string, Record<Appareil, { mediane: number; min: number; densite: number }>> = {};
let gpu = "";
for (const chemin of PAGES) {
  const r = {} as Record<Appareil, { mediane: number; min: number; densite: number }>;
  for (const appareil of ["ordinateur", "telephone"] as Appareil[]) {
    const ctx = await navigateur.newContext(APPAREILS[appareil]);
    const page = await ctx.newPage();
    if (appareil === "telephone") await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(adresse(chemin), { waitUntil: "load" });
    if (!gpu)
      gpu = await page.evaluate(() => {
        const gl = document.createElement("canvas").getContext("webgl2");
        const ext = gl?.getExtension("WEBGL_debug_renderer_info");
        return ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "inconnu";
      });
    await attendreGlobe(page);
    await page.waitForTimeout(12000);
    const m = await page.evaluate(() => (window as unknown as { __sovermap3d: { fps: number[]; dpr: number } }).__sovermap3d);
    // The first second includes the start of the scene: left out.
    const valeurs = m.fps.slice(1);
    r[appareil] = { mediane: mediane(valeurs), min: Math.min(...valeurs), densite: m.dpr };
    await ctx.close();
  }
  sortie[chemin] = r;
  console.log(`${chemin} : ordinateur ${r.ordinateur.mediane} images/s (au plus bas ${r.ordinateur.min}, densité ${r.ordinateur.densite}) ; téléphone ${r.telephone.mediane} (au plus bas ${r.telephone.min}, densité ${r.telephone.densite})`);
}
await navigateur.close();
ecrireMesures("fps.json", { gpu, resultats: sortie });
console.log(`rendu WebGL : ${gpu}`);
