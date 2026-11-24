// Tests of the base map (brief C.6; docs/sources.md, card 53): made-up squares, then the dated copy of the repository.
// No network.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copieDepartements,
  deriverFondDeCarte,
  equirectangulaire,
  lambert,
  lireCoucheDepartements,
  simplifierLigne,
  topologie,
} from "./carte";

/** A made-up departments layer: squares in mainland France (« 01 ») and in Guadeloupe (« 971 »), longitude first. */
const carre = (lon: number, lat: number, cote: number): number[][] => [
  [lon, lat],
  [lon + cote, lat],
  [lon + cote, lat + cote],
  [lon, lat + cote],
  [lon, lat],
];
const couche = (premier: number[][] = carre(5, 46, 0.5)) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { code_insee: "971", code_insee_de_la_region: "01", nom_officiel: "Guadeloupe", cleabs: "X" },
      geometry: { type: "Polygon", coordinates: [carre(-61.5, 16, 0.4)] },
    },
    {
      type: "Feature",
      properties: { code_insee: "01", code_insee_de_la_region: "84", nom_officiel: "Ain", cleabs: "Y" },
      geometry: { type: "MultiPolygon", coordinates: [[premier]] },
    },
  ],
});

describe("the departments layer, read at the border", () => {
  it("keeps a department's code, its region's, its name and its polygons, sorted by code", () => {
    const lus = lireCoucheDepartements(couche(), 2);
    expect(lus.map((d) => [d.code, d.region, d.nom, d.polygones.length])).toEqual([
      ["01", "84", "Ain", 1],
      ["971", "01", "Guadeloupe", 1],
    ]);
  });

  it("refuses latitude first, an open ring, an unknown code, or a wrong number of departments", () => {
    const inverse = carre(5, 46, 0.5).map(([x, y]) => [y as number, x as number]);
    expect(() => lireCoucheDepartements(couche(inverse), 2)).toThrow(/hors de la métropole/);
    expect(() => lireCoucheDepartements(couche(carre(5, 46, 0.5).slice(0, -1)), 2)).toThrow(/pas fermé/);
    const autre = couche();
    (autre.features[1] as { properties: Record<string, string> }).properties["code_insee"] = "96";
    expect(() => lireCoucheDepartements(autre, 2)).toThrow(/code INSEE invalide/);
    expect(() => lireCoucheDepartements(couche())).toThrow(/101 départements attendus, 2 reçus/);
    expect(() => lireCoucheDepartements({ type: "Feature" }, 2)).toThrow(/collection GeoJSON/);
  });

  it("writes a dated copy that reads back the same, with three properties only", () => {
    const lus = lireCoucheDepartements(couche(), 2);
    const copie = copieDepartements(lus);
    expect(copie).not.toContain("cleabs");
    expect(lireCoucheDepartements(JSON.parse(copie) as unknown, 2)).toEqual(lus);
  });
});

describe("the projections", () => {
  it("puts Lambert-93's origin at (0, 0), the east on the right and the north up, at the scale of the sphere", () => {
    const p = lambert();
    const [x0, y0] = p([3, 46.5]);
    expect(Math.abs(x0) + Math.abs(y0)).toBeLessThan(1e-9);
    const [xEst] = p([4, 46.5]);
    const [, yNord] = p([3, 47.5]);
    expect(xEst).toBeGreaterThan(0);
    expect(yNord).toBeGreaterThan(0);
    // On a standard parallel the scale is exact: one degree of longitude at 44° N is about 80 km.
    const ecart = (p([4, 44])[0] - p([3, 44])[0]) / Math.cos((44 * Math.PI) / 180);
    expect(ecart).toBeCloseTo(111.19, 0);
  });

  it("centres a small territory's projection on it", () => {
    expect(equirectangulaire(-61, 16)([-61, 16])).toEqual([0, 0]);
  });
});

describe("the simplification", () => {
  it("drops the points closer to the line than the tolerance, and keeps a corner", () => {
    const presqueDroite: [number, number][] = [
      [0, 0],
      [1, 0.2],
      [2, -0.2],
      [3, 0],
    ];
    expect(simplifierLigne(presqueDroite, 0.5)).toEqual([
      [0, 0],
      [3, 0],
    ]);
    const coin: [number, number][] = [
      [0, 0],
      [5, 5],
      [10, 0],
    ];
    expect(simplifierLigne(coin, 0.5)).toEqual(coin);
  });

  it("refuses a department left without any outline, never a silent gap in the map", () => {
    // « 02 », a square of a few metres beside a large « 01 »: too small for the drawing.
    const departements = lireCoucheDepartements(
      {
        type: "FeatureCollection",
        features: [
          ["01", carre(4, 45, 2)],
          ["02", carre(7, 48, 0.00001)],
        ].map(([code, anneau]) => ({
          type: "Feature",
          properties: { code_insee: code, code_insee_de_la_region: "84", nom_officiel: `Exemple ${String(code)}` },
          geometry: { type: "Polygon", coordinates: [anneau] },
        })),
      },
      2,
    );
    expect(() => deriverFondDeCarte(departements)).toThrow(/02 : aucun contour assez grand pour le dessin/);
  });

  it("cuts two neighbours' rings at their junctions, and keeps their shared border once", () => {
    // Two unit squares side by side: points 0 to 5; the border is the edge 1–4.
    const { arcs, anneaux } = topologie([
      { departement: 0, points: [0, 1, 4, 5] },
      { departement: 1, points: [1, 2, 3, 4] },
    ]);
    expect(arcs).toHaveLength(3);
    const partage = arcs.findIndex((a) => a.departements.size === 2);
    expect(arcs[partage]?.points).toEqual([1, 4]);
    expect(anneaux.map((a) => a.arcs.filter((x) => x.arc === partage).map((x) => x.inverse))).toEqual([
      [false],
      [true],
    ]);
  });

  it("builds an enclave's ring once, whichever of its two owners comes first", () => {
    // A department with a hole (points 4 to 7), which is another department's whole outline.
    const { arcs, anneaux } = topologie([
      { departement: 0, points: [0, 1, 2, 3] },
      { departement: 0, points: [7, 6, 5, 4] },
      { departement: 1, points: [5, 6, 7, 4] },
    ]);
    expect(arcs).toHaveLength(2);
    const enclave = arcs.findIndex((a) => a.boucle && a.departements.size === 2);
    expect(arcs[enclave]?.points[0]).toBe(4);
    expect(anneaux[1]?.arcs[0]?.arc).toBe(enclave);
    expect(anneaux[2]?.arcs[0]?.arc).toBe(enclave);
    expect(anneaux[1]?.arcs[0]?.inverse).not.toBe(anneaux[2]?.arcs[0]?.inverse);
  });
});

describe("the base map of the repository (referentiels/fond-de-carte, lib/carte)", () => {
  const racine = path.join(import.meta.dirname, "..");
  const departements = lireCoucheDepartements(
    JSON.parse(readFileSync(path.join(racine, "referentiels", "fond-de-carte", "departements-2026.geojson"), "utf8")),
  );
  const fond = deriverFondDeCarte(departements);
  const points = (d: string) => new Set(d.match(/[0-9]+ [0-9]+/g) ?? []);

  it("is the drawing the tool writes, to the byte: never edited by hand, never stale", () => {
    const enregistre = readFileSync(path.join(racine, "lib", "carte", "fond-de-carte.json"), "utf8");
    expect(enregistre).toBe(`${JSON.stringify(fond, null, 1)}\n`);
  });

  it("draws the 101 departments inside the drawing, the five overseas ones in their frames, in less than 150 kB", () => {
    expect(fond.departements).toHaveLength(101);
    for (const d of fond.departements) {
      expect(d.d, d.code).toMatch(/^M[0-9 ]+Z(M[0-9 ]+Z)*$/);
      for (const p of points(d.d)) {
        const [x, y] = p.split(" ").map(Number) as [number, number];
        expect(x >= 0 && x <= fond.largeur && y >= 0 && y <= fond.hauteur, `${d.code} : ${p}`).toBe(true);
      }
    }
    expect(fond.encarts.map((e) => e.code)).toEqual(["971", "972", "973", "974", "976"]);
    expect(fond.frontieresRegions).toMatch(/^M/);
    expect(Buffer.byteLength(JSON.stringify(fond, null, 1))).toBeLessThan(150_000);
  });

  it("keeps the same border on both sides: Paris and the Hauts-de-Seine share their points, no gap opens", () => {
    const paris = fond.departements.find((d) => d.code === "75")?.d ?? "";
    const hautsDeSeine = fond.departements.find((d) => d.code === "92")?.d ?? "";
    const communs = [...points(paris)].filter((p) => points(hautsDeSeine).has(p));
    expect(communs.length).toBeGreaterThanOrEqual(3);
  });

  it("draws as region borders only the borders between two regions", () => {
    const frontieres = points(fond.frontieresRegions);
    const de = (code: string) => points(fond.departements.find((d) => d.code === code)?.d ?? "");
    // Paris lies inside Île-de-France: none of its points is on a border between regions.
    expect([...de("75")].filter((p) => frontieres.has(p))).toEqual([]);
    // Seine-et-Marne (Île-de-France) and the Aisne (Hauts-de-France): their shared border is one.
    const aisne = de("02");
    expect([...de("77")].filter((p) => aisne.has(p) && frontieres.has(p)).length).toBeGreaterThanOrEqual(3);
  });
});
