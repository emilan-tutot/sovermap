// The static fallback of the globe (DESIGN.md §8): public/globe/repli.svg, the same view and size as the 3D at rest,
// shown with « réduire les animations », save-data, a weak device or without WebGL 2; and the places of its labels,
// components/globe/repli-etiquettes.json. The labels are not in the image: they are HTML over it, at the places computed
// here with the rule of the live scene (components/globe/etiquettes.ts), for the smallest size (a phone, 360 px).
// The threads come from a JSON file built from published data; without it (chantier T1), the globe alone: no data.
//   npx tsx scripts/design/replis.ts [--fils fils.json]
//   fils.json: { "origine": { "nom": "France", "sites": 20 }, "fils": [{ "code": "US", "nom": "États-Unis",
//                "lat": 39, "lon": -98, "sites": 11, "horsUE": true }] }
import { readFileSync, writeFileSync } from "node:fs";
import { nouvelleMemoire, placerEtiquettes, type Ancre } from "../../components/globe/etiquettes";
import { arcGrandCercle, FRANCE, graticule, surSphere, type Monde } from "../../components/globe/geo";
import { JETONS } from "../../lib/design/tokens";

type Fil = { code: string; nom: string; lat: number; lon: number; sites: number; horsUE: boolean };
const monde = JSON.parse(readFileSync("public/globe/monde.json", "utf8")) as Monde;
const iFils = process.argv.indexOf("--fils");
const fichierFils = iFils >= 0 ? process.argv[iFils + 1] : undefined;
const donnees = fichierFils ? (JSON.parse(readFileSync(fichierFils, "utf8")) as { origine: { nom: string; sites: number }; fils: Fil[] }) : null;
const fils = [...(donnees?.fils ?? [])].sort((a, b) => b.sites - a.sites);
const f1 = (v: number) => v.toFixed(1);

// The view at rest of the live globe, and its size: 0.89 of the side of the scene.
const VUE = { lat: 28, lon: -38 };
const R = 445;
const CX = 500;
const CY = 500;
const RAD = Math.PI / 180;
type V = { x: number; y: number; z: number };
const tourner = ([x, y, z]: [number, number, number]): V => {
  const t = -VUE.lon * RAD;
  const x1 = x * Math.cos(t) + z * Math.sin(t);
  const z1 = -x * Math.sin(t) + z * Math.cos(t);
  const p = VUE.lat * RAD;
  return { x: x1, y: y * Math.cos(p) - z1 * Math.sin(p), z: y * Math.sin(p) + z1 * Math.cos(p) };
};
const X = (v: { x: number }) => CX + R * v.x;
const Y = (v: { y: number }) => CY - R * v.y;
const visibleFil = (f: { lat: number; lon: number }) => tourner(surSphere(f.lat, f.lon)).z >= 0.1;
const epaisseur = (f: Fil) => 0.0024 + 0.0021 * Math.sqrt(f.sites);
const pointsFil = (f: Fil) =>
  arcGrandCercle(FRANCE, f, 80, 1 + epaisseur(f) + 0.0015)
    .map(tourner)
    .filter((v) => v.z > 0 || v.x * v.x + v.y * v.y > 1);

/** A colour of the tokens, darker: the side of the globe away from the light (as the shader does). */
function assombrir(hex: string, k: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (decalage: number) => Math.round(((n >> decalage) & 255) * (1 - k));
  return `#${[c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const c = JETONS.scene;
const tracer = (lignes: number[][]) => {
  let d = "";
  for (const l of lignes) {
    let ouvert = false;
    for (let i = 0; i < l.length; i += 2) {
      const v = tourner(surSphere(l[i + 1] ?? 0, l[i] ?? 0));
      if (v.z <= 0.02) {
        ouvert = false;
        continue;
      }
      d += `${ouvert ? "L" : "M"}${f1(X(v))} ${f1(Y(v))}`;
      ouvert = true;
    }
  }
  return d;
};
const arc = (f: Fil) => (visibleFil(f) ? pointsFil(f).reduce((d, v, i) => `${d}${i === 0 ? "M" : "L"}${f1(X(v))} ${f1(Y(v))}`, "") : "");
const france = tourner(surSphere(FRANCE.lat, FRANCE.lon));
const anneaux = fils
  .filter(visibleFil)
  .map((f) => {
    const v = tourner(surSphere(f.lat, f.lon));
    return `<circle cx="${f1(X(v))}" cy="${f1(Y(v))}" r="${f1(R * (0.012 + 0.004 * Math.sqrt(f.sites)))}" fill="none" stroke="${f.horsUE ? c.arc : c.filUE}" stroke-width="2.4"/>`;
  })
  .join("\n");
const origine = donnees
  ? `<circle cx="${f1(X(france))}" cy="${f1(Y(france))}" r="${f1(R * 0.011)}" fill="${c.filUE}"/>
<circle cx="${f1(X(france))}" cy="${f1(Y(france))}" r="${f1(R * 0.026)}" fill="none" stroke="${c.filUE}" stroke-width="2.3"/>`
  : "";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
<defs>
<radialGradient id="matiere" cx="0.32" cy="0.3" r="0.85"><stop offset="0.35" stop-color="${c.globe}"/><stop offset="1" stop-color="${assombrir(c.globe, JETONS.matiere.ombre)}"/></radialGradient>
<radialGradient id="halo"><stop offset="0.9" stop-color="${c.halo}" stop-opacity="0"/><stop offset="0.935" stop-color="${c.halo}" stop-opacity="${JETONS.clair ? 0.22 : 0.32}"/><stop offset="1" stop-color="${c.halo}" stop-opacity="0"/></radialGradient>
</defs>
<circle cx="${CX}" cy="${CY}" r="${f1(R * 1.07)}" fill="url(#halo)"/>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#matiere)"/>
<path d="${tracer(graticule(15, 3))}" fill="none" stroke="${c.graticule}" stroke-width="1.6" stroke-dasharray="1 6" stroke-linecap="round"/>
<path d="${tracer(monde.frontieres)}" fill="none" stroke="${c.frontiere}" stroke-width="0.8" stroke-opacity="0.6"/>
<path d="${tracer(monde.cotes)}" fill="none" stroke="${c.cote}" stroke-width="1" stroke-opacity="0.8"/>
${fils.map((f) => `<path d="${arc(f)}" fill="none" stroke="${f.horsUE ? c.fils.horsUE : c.fils.ue}" stroke-width="${f1(R * 2 * epaisseur(f))}" stroke-linecap="round"/>`).join("\n")}
${anneaux}
${origine}
</svg>
`;

// Labels, placed for a phone (the image is 360 px wide) by the placement of the live scene: a column on each side, in
// the order of the points, no crossed line, no label over a thread.
const U = 1000 / 360;
const largeurEtiquette = (texte: string) => texte.length * 6.7 + 16;
const points = donnees ? [{ code: FRANCE.code, nom: donnees.origine.nom, sites: donnees.origine.sites, lat: FRANCE.lat, lon: FRANCE.lon }, ...fils] : [];
const ancres: (Ancre & { px: number; py: number })[] = points
  .map((p) => ({ ...p, v: tourner(surSphere(p.lat, p.lon, 1.01)) }))
  .filter((p) => p.v.z > 0.12)
  .map((p) => ({ code: p.code, x: X(p.v) / U, y: Y(p.v) / U, l: largeurEtiquette(`${p.nom} · ${p.sites}`), h: 22, px: X(p.v), py: Y(p.v) }));
const filsTelephone = fils.filter(visibleFil).map((f) => pointsFil(f).map((v) => ({ x: X(v) / U, y: Y(v) / U })));
const etiquettes: Record<string, { px: number; py: number; ax: number; ay: number; cote: "gauche" | "droite" }> = {};
for (const p of placerEtiquettes(ancres, filsTelephone, 360, 360, 4, nouvelleMemoire())) {
  const a = ancres.find((x) => x.code === p.code);
  if (!a) continue;
  // The anchor is the edge of the label nearest to the point, at mid-height: the label grows away from it.
  etiquettes[p.code] = {
    px: Math.round(a.px * 10) / 10,
    py: Math.round(a.py * 10) / 10,
    ax: Math.round((p.cote === "gauche" ? p.x + p.l : p.x) * U * 10) / 10,
    ay: Math.round((p.y + p.h / 2) * U * 10) / 10,
    cote: p.cote,
  };
}

writeFileSync("public/globe/repli.svg", svg, "utf8");
writeFileSync("components/globe/repli-etiquettes.json", `${JSON.stringify(etiquettes, null, 2)}\n`, "utf8");
console.log(`repli.svg : ${svg.length} octets ; ${fils.length} fil(s) ; étiquettes : ${Object.keys(etiquettes).join(", ") || "aucune"}`);
