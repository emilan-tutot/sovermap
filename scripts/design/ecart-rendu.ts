// Gap between two renderings of a page with the globe, measured on the image: the fixed images of two builds
// (images-fixes.ts), compared pixel by pixel in OKLab. Named points of the owner (ARRÊT 2 ter, b): the globe at its
// centre and at its edge (lit side, shadow side), the coasts, the threads (their light included, while they trace
// themselves) and the glow around the globe; and, to be sure, every pixel of the scene. Threshold: 0.02.
//   npx tsx scripts/design/ecart-rendu.ts <dossier avant> <dossier après> <nom>...
import { readFileSync } from "node:fs";
import path from "node:path";
import { ecrireMesures, fr, lireImage, oklab, pixel, type Appareil } from "./commun";

const [avant = "", apres = "", ...noms] = process.argv.slice(2);
type P = { x: number; y: number };
type Geo = { toile: { x: number; y: number; l: number; h: number }; centre: P; rayon: number; fils: P[][]; points: (P & { code: string })[] };

const centile = (v: number[], q: number) => {
  if (v.length === 0) return 0;
  const t = [...v].sort((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor(q * t.length))] ?? 0;
};
const distSegment = (p: P, a: P, b: P) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

const sortie: Record<string, unknown> = {};
let pire = 0;
for (const nom of noms) {
  for (const appareil of ["ordinateur", "telephone"] as Appareil[]) {
    const meta = JSON.parse(readFileSync(path.join(avant, `${nom}-${appareil}.json`), "utf8")) as { moments: number[]; geometrie: Record<string, Geo> };
    const resultat: Record<string, unknown> = {};
    for (const moment of meta.moments) {
      const geo = meta.geometrie[String(moment)];
      if (!geo) continue;
      const A = lireImage(path.join(avant, `${nom}-${appareil}-${moment}.png`));
      const B = lireImage(path.join(apres, `${nom}-${appareil}-${moment}.png`));
      if (A.l !== B.l || A.h !== B.h) throw new Error(`tailles différentes : ${nom} ${appareil} ${moment}`);
      const ecart = (x: number, y: number) => {
        const a = oklab(pixel(A, x, y));
        const b = oklab(pixel(B, x, y));
        return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      };
      const clarteA = (x: number, y: number) => oklab(pixel(A, x, y))[0];
      /** The largest gap in a small square around a point (the point itself may fall between two pixels). */
      const autour = (p: P, d = 2) => {
        let m = 0;
        for (let y = -d; y <= d; y += 1) for (let x = -d; x <= d; x += 1) m = Math.max(m, ecart(p.x + x, p.y + y));
        return m;
      };
      const { centre: c, rayon: R } = geo;
      const surCercle = (k: number, angle: number) => ({ x: c.x + k * R * Math.cos((angle * Math.PI) / 180), y: c.y - k * R * Math.sin((angle * Math.PI) / 180) });
      // Pixels of the scene, sorted by kind on the image « before ».
      const fils: number[] = [];
      const cotes: number[] = [];
      const tout: number[] = [];
      const t = geo.toile;
      const filsSegments = geo.fils.flatMap((f) => f.slice(1).map((p, k) => [f[k] ?? p, p] as [P, P]));
      const lumiereGlobe = clarteA(c.x, c.y);
      for (let y = Math.ceil(t.y); y < t.y + t.h && y < A.h; y += 1) {
        for (let x = Math.ceil(t.x); x < t.x + t.l && x < A.l; x += 1) {
          const e = ecart(x, y);
          tout.push(e);
          const p = { x, y };
          if (filsSegments.some(([a, b]) => distSegment(p, a, b) < 4)) fils.push(e);
          else if (Math.hypot(x - c.x, y - c.y) < R * 0.97 && clarteA(x, y) > lumiereGlobe + 0.2 && !geo.points.some((q) => Math.hypot(x - q.x, y - q.y) < 16)) cotes.push(e);
        }
      }
      if (cotes.length < 200) throw new Error(`trop peu de pixels de côtes : ${nom} ${appareil} ${moment}`);
      const points = {
        "globe, centre": autour(c),
        "globe, bord éclairé": autour(surCercle(0.93, 135)),
        "globe, bord dans l'ombre": autour(surCercle(0.93, -45)),
        "lueur autour du globe, côté éclairé": autour(surCercle(1.04, 135)),
        "lueur autour du globe, côté droit": autour(surCercle(1.04, 0)),
      };
      const mesures = {
        ...points,
        "côtes (max)": centile(cotes, 1),
        "côtes (99 %)": centile(cotes, 0.99),
        "fils et leur lueur (max)": centile(fils, 1),
        "fils et leur lueur (99 %)": centile(fils, 0.99),
        "toute la scène (99,9 %)": centile(tout, 0.999),
        "toute la scène (max)": centile(tout, 1),
      };
      resultat[String(moment)] = Object.fromEntries(Object.entries(mesures).map(([k, v]) => [k, Number(v.toFixed(4))]));
      const nommes = Math.max(...Object.values(points), centile(cotes, 1), centile(fils, 1));
      pire = Math.max(pire, nommes);
      console.log(
        `${nom} ${appareil} après ${fr(moment / 30, 1)} s : points nommés ${fr(nommes, 4)} au plus ; côtes ${fr(centile(cotes, 1), 4)} (${cotes.length} px) ; fils ${fr(centile(fils, 1), 4)} (${fils.length} px) ; toute la scène 99,9 % ${fr(centile(tout, 0.999), 4)}, max ${fr(centile(tout, 1), 4)}`,
      );
    }
    sortie[`${nom}-${appareil}`] = resultat;
  }
}
ecrireMesures("ecart-rendu.json", { avant, apres, seuil: 0.02, pire, resultats: sortie });
console.log(`écart OKLab aux points nommés : ${fr(pire, 4)} au plus (seuil 0,02) : ${pire <= 0.02 ? "tenu" : "DÉPASSÉ"}`);
