// Labels of the globe over time (owner's correction a, ARRÊT 2 bis), sampled every 100 ms for 12 s of slow rotation, on a
// phone and a computer, for each page given. Four rules, checked on what is drawn (glides included):
//   1. no label drawn over another one;
//   2. on each side, from top to bottom, the labels follow the order of their points (north to south);
//   3. a leader line never crosses another leader line nor another label;
//   4. a label never covers a thread.
// The rules are those of components/globe/etiquettes.ts, also tested in tests/design.test.ts.
//   npx tsx scripts/design/etiquettes.ts <chemin>...        (pages that carry the globe)
import { AIDE_TSX, APPAREILS, adresse, attendreGlobe, ecrireMesures, lancerEdge, type Appareil } from "./commun";

const PAGES = process.argv.slice(2);
if (PAGES.length === 0) throw new Error("donner au moins une page qui porte le globe, par exemple /");
const navigateur = await lancerEdge();
type Defauts = { chevauchement: number; ordre: number; croisement: number; surFil: number };
const resultats: { appareil: Appareil; chemin: string; echantillons: number; defauts: Defauts; exemples: string[] }[] = [];
let total = 0;
for (const appareil of ["telephone", "ordinateur"] as Appareil[]) {
  for (const chemin of PAGES) {
    const ctx = await navigateur.newContext(APPAREILS[appareil]);
    await ctx.addInitScript({ content: AIDE_TSX });
    const page = await ctx.newPage();
    await page.goto(adresse(chemin), { waitUntil: "load" });
    await attendreGlobe(page);
    // The labels arrive with the globe: measure once they are there.
    await page.waitForTimeout(1600);
    const r = await page.evaluate(async () => {
      type P = { x: number; y: number };
      type S = { x1: number; y1: number; x2: number; y2: number };
      const orient = (a: P, b: P, c: P) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      const croisent = (s: S, t: S) => {
        const a = { x: s.x1, y: s.y1 };
        const b = { x: s.x2, y: s.y2 };
        const c = { x: t.x1, y: t.y1 };
        const d = { x: t.x2, y: t.y2 };
        return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
      };
      const dans = (p: P, r: DOMRect) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
      const coupe = (s: S, r: DOMRect) =>
        dans({ x: s.x1, y: s.y1 }, r) ||
        dans({ x: s.x2, y: s.y2 }, r) ||
        [
          { x1: r.left, y1: r.top, x2: r.right, y2: r.top },
          { x1: r.right, y1: r.top, x2: r.right, y2: r.bottom },
          { x1: r.right, y1: r.bottom, x2: r.left, y2: r.bottom },
          { x1: r.left, y1: r.bottom, x2: r.left, y2: r.top },
        ].some((c) => croisent(s, c));
      const defauts = { chevauchement: 0, ordre: 0, croisement: 0, surFil: 0 };
      const exemples: string[] = [];
      let echantillons = 0;
      const fin = performance.now() + 12000;
      while (performance.now() < fin) {
        await new Promise((ok) => setTimeout(ok, 100));
        echantillons += 1;
        const mesure = (window as unknown as { __sovermap3d?: { places?: { code: string; cote: string }[]; fils?: P[][]; points?: { code: string; y: number }[] } }).__sovermap3d;
        const scene = document.querySelector(".scene")?.getBoundingClientRect();
        if (!mesure || !scene) continue;
        const cotes = new Map((mesure.places ?? []).map((p) => [p.code, p.cote]));
        const ys = new Map((mesure.points ?? []).map((p) => [p.code, p.y]));
        const vis = [...document.querySelectorAll<HTMLElement>(".scene > .etiquettes .etiquette-pays")]
          .filter((e) => Number(getComputedStyle(e).opacity) > 0.5)
          .map((e) => {
            const code = e.dataset["code"] ?? "";
            const l = document.querySelector<SVGLineElement>(`.scene > .filets line[data-code="${code}"]`);
            const ligne = l && Number(getComputedStyle(l).opacity) > 0.5 ? { x1: scene.left + Number(l.getAttribute("x1")), y1: scene.top + Number(l.getAttribute("y1")), x2: scene.left + Number(l.getAttribute("x2")), y2: scene.top + Number(l.getAttribute("y2")) } : null;
            return { code, r: e.getBoundingClientRect(), ligne, cote: cotes.get(code) };
          });
        const fils = (mesure.fils ?? []).map((f) => f.map((p) => ({ x: scene.left + p.x, y: scene.top + p.y })));
        const noter = (genre: keyof typeof defauts, texte: string) => {
          defauts[genre] += 1;
          if (exemples.length < 6) exemples.push(texte);
        };
        for (let i = 0; i < vis.length; i += 1) {
          const a = vis[i]!;
          for (let j = i + 1; j < vis.length; j += 1) {
            const b = vis[j]!;
            if (a.r.left < b.r.right - 1 && b.r.left < a.r.right - 1 && a.r.top < b.r.bottom - 1 && b.r.top < a.r.bottom - 1) noter("chevauchement", `${a.code}/${b.code}`);
            if (a.ligne && b.ligne && croisent(a.ligne, b.ligne)) noter("croisement", `filets ${a.code}/${b.code}`);
            if (a.ligne && coupe(a.ligne, b.r)) noter("croisement", `filet ${a.code} sur ${b.code}`);
            if (b.ligne && coupe(b.ligne, a.r)) noter("croisement", `filet ${b.code} sur ${a.code}`);
          }
          for (const fil of fils)
            for (let k = 1; k < fil.length; k += 1) {
              const p = fil[k - 1]!;
              const q = fil[k]!;
              if (coupe({ x1: p.x, y1: p.y, x2: q.x, y2: q.y }, a.r)) {
                noter("surFil", `${a.code} sur un fil`);
                k = fil.length;
              }
            }
        }
        // Order: on each side, the labels from top to bottom as their points from top to bottom.
        for (const cote of ["gauche", "droite"]) {
          const groupe = vis.filter((v) => v.cote === cote && v.ligne);
          const parLabel = [...groupe].sort((a, b) => a.r.top - b.r.top).map((v) => v.code).join(",");
          const parPoint = [...groupe].sort((a, b) => (ys.get(a.code) ?? 0) - (ys.get(b.code) ?? 0)).map((v) => v.code).join(",");
          if (parLabel !== parPoint) noter("ordre", `${cote} : étiquettes ${parLabel}, points ${parPoint}`);
        }
      }
      return { echantillons, defauts, exemples };
    });
    const n = Object.values(r.defauts).reduce((a, b) => a + b, 0);
    total += n;
    resultats.push({ appareil, chemin, ...r });
    console.log(`${appareil} ${chemin} : ${r.echantillons} relevés ; ${n === 0 ? "les quatre règles tenues" : `DÉFAUTS ${JSON.stringify(r.defauts)} ; ${r.exemples.join(" | ")}`}`);
    await ctx.close();
  }
}
await navigateur.close();
ecrireMesures("etiquettes.json", { resultats });
console.log(total === 0 ? "étiquettes : les quatre règles tenues partout" : `étiquettes : ${total} défaut(s)`);
process.exit(total === 0 ? 0 : 1);
