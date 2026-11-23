// The base map of the territories (brief C.6; docs/sources.md, card 53): the IGN's ADMIN EXPRESS COG CARTO PE
// departments, read at the border, kept as a dated copy (referentiels/fond-de-carte/), then derived into the drawing
// the site shows. Pure functions: no network, no files.

/** A ring: closed, its last point equal to its first, [x, y] pairs (longitude and latitude in the copy). */
export type Anneau = [number, number][];
/** A polygon: its outer ring, then its holes. */
export type Polygone = Anneau[];

export type Departement = {
  /** The INSEE code: « 01 » to « 95 », « 2A », « 2B », « 971 » to « 976 ». */
  code: string;
  /** The INSEE code of its region. */
  region: string;
  nom: string;
  polygones: Polygone[];
};

const CODE_DEPARTEMENT = /^(?:0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-46])$/;
const CODE_REGION = /^(?:0[1-6]|[1-9][0-9])$/;
/** The five overseas departments of the product (« le territoire métropolitain et les départements d'outre-mer »). */
export const DROM = ["971", "972", "973", "974", "976"] as const;

/** Mainland France, Corsica included, with a margin: a point outside it is a wrong axis order or a wrong layer. */
const METROPOLE = { lonMin: -6, lonMax: 10, latMin: 41, latMax: 52 };

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function lirePoint(v: unknown, ou: string): [number, number] {
  if (!Array.isArray(v) || v.length < 2) throw new Error(`${ou} : un point n'est pas une paire de nombres`);
  const [x, y] = v as unknown[];
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`${ou} : coordonnée invalide`);
  }
  if (x < -180 || x > 180 || y < -90 || y > 90) throw new Error(`${ou} : coordonnée hors de WGS 84 (${x}, ${y})`);
  return [x, y];
}

function lireAnneau(v: unknown, ou: string): Anneau {
  if (!Array.isArray(v) || v.length < 4) throw new Error(`${ou} : un anneau a moins de quatre points`);
  const anneau = v.map((p) => lirePoint(p, ou));
  const premier = anneau[0];
  const dernier = anneau[anneau.length - 1];
  if (premier === undefined || dernier === undefined || premier[0] !== dernier[0] || premier[1] !== dernier[1]) {
    throw new Error(`${ou} : un anneau n'est pas fermé`);
  }
  return anneau;
}

function lirePolygones(geometrie: unknown, ou: string): Polygone[] {
  if (!estObjet(geometrie)) throw new Error(`${ou} : géométrie absente`);
  const { type, coordinates } = geometrie;
  if (!Array.isArray(coordinates)) throw new Error(`${ou} : coordonnées absentes`);
  const polygone = (p: unknown): Polygone => {
    if (!Array.isArray(p) || p.length === 0) throw new Error(`${ou} : polygone vide`);
    return p.map((a) => lireAnneau(a, ou));
  };
  if (type === "Polygon") return [polygone(coordinates)];
  if (type === "MultiPolygon") return coordinates.map(polygone);
  throw new Error(`${ou} : type de géométrie inattendu (${String(type)})`);
}

/**
 * The WFS answer (GeoJSON) of the departments layer, read at the border: 101 departments, each with its INSEE code,
 * its region's, its official name and its polygons, longitude first; mainland departments inside mainland France.
 * Anything else is refused, never guessed. `nombre`: the departments expected (101; fewer in the tests only).
 */
export function lireCoucheDepartements(valeur: unknown, nombre = 101): Departement[] {
  if (!estObjet(valeur) || valeur["type"] !== "FeatureCollection" || !Array.isArray(valeur["features"])) {
    throw new Error("la réponse n'est pas une collection GeoJSON");
  }
  const departements = valeur["features"].map((f: unknown, i): Departement => {
    const ou = `département n° ${i + 1}`;
    if (!estObjet(f) || !estObjet(f["properties"])) throw new Error(`${ou} : propriétés absentes`);
    const p = f["properties"];
    const code = p["code_insee"];
    const region = p["code_insee_de_la_region"];
    const nom = p["nom_officiel"];
    if (typeof code !== "string" || !CODE_DEPARTEMENT.test(code)) throw new Error(`${ou} : code INSEE invalide`);
    if (typeof region !== "string" || !CODE_REGION.test(region)) throw new Error(`${code} : code de région invalide`);
    if (typeof nom !== "string" || nom.trim() === "" || nom.length > 80) throw new Error(`${code} : nom invalide`);
    const polygones = lirePolygones(f["geometry"], code);
    if (!(DROM as readonly string[]).includes(code)) {
      for (const [x, y] of polygones.flat(2)) {
        if (x < METROPOLE.lonMin || x > METROPOLE.lonMax || y < METROPOLE.latMin || y > METROPOLE.latMax) {
          throw new Error(`${code} : un point hors de la métropole (${x}, ${y}) : ordre des axes ou couche inattendus`);
        }
      }
    }
    return { code, region, nom, polygones };
  });
  const codes = new Set(departements.map((d) => d.code));
  if (departements.length !== nombre || codes.size !== nombre) {
    throw new Error(`${nombre} départements attendus, ${departements.length} reçus (${codes.size} codes distincts)`);
  }
  return departements.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * The dated copy: a GeoJSON collection with the three properties a territory needs, the coordinates as received, one
 * department per line (readable diffs from one edition to the next).
 */
export function copieDepartements(departements: readonly Departement[]): string {
  const lignes = departements.map((d) =>
    JSON.stringify({
      type: "Feature",
      properties: { code_insee: d.code, code_insee_de_la_region: d.region, nom_officiel: d.nom },
      geometry: { type: "MultiPolygon", coordinates: d.polygones },
    }),
  );
  return `{"type":"FeatureCollection","features":[\n${lignes.join(",\n")}\n]}\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// The drawing: projected, placed, simplified without opening a gap between neighbours.

export type Point = [number, number];
type Transformation = (p: Point) => Point;

/** The Earth as a sphere (km): enough for a drawing, never for a measure. */
const RAYON_KM = 6371;
const radians = (degres: number) => (degres * Math.PI) / 180;

/**
 * Lambert's conformal conic projection on the sphere, with the parameters of Lambert-93 (standard parallels 44° and
 * 49°, origin 46.5° N, 3° E): kilometres, x towards the east, y towards the north.
 */
export function lambert(parallele1 = 44, parallele2 = 49, latitude0 = 46.5, longitude0 = 3): Transformation {
  const [f1, f2, f0, l0] = [radians(parallele1), radians(parallele2), radians(latitude0), radians(longitude0)];
  const t = (f: number) => Math.tan(Math.PI / 4 + f / 2);
  const n = Math.log(Math.cos(f1) / Math.cos(f2)) / Math.log(t(f2) / t(f1));
  const facteur = (RAYON_KM * Math.cos(f1) * t(f1) ** n) / n;
  const rho0 = facteur / t(f0) ** n;
  return ([longitude, latitude]) => {
    const rho = facteur / t(radians(latitude)) ** n;
    const theta = n * (radians(longitude) - l0);
    return [rho * Math.sin(theta), rho0 - rho * Math.cos(theta)];
  };
}

/** An equirectangular projection centred on a small territory (an overseas department): kilometres, north up. */
export function equirectangulaire(longitude0: number, latitude0: number): Transformation {
  const k = Math.cos(radians(latitude0));
  return ([longitude, latitude]) => [
    RAYON_KM * radians(longitude - longitude0) * k,
    RAYON_KM * radians(latitude - latitude0),
  ];
}

type Cadre = { x: number; y: number; largeur: number; hauteur: number };

/** The bounds of many points (a loop: tens of thousands of arguments would overflow a spread). */
function bornes(points: readonly Point[]): { xMin: number; xMax: number; yMin: number; yMax: number } {
  let [xMin, xMax, yMin, yMax] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [x, y] of points) {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  return { xMin, xMax, yMin, yMax };
}

/** Places projected points (y towards the north) in a frame of the drawing (y downwards), fitted and centred. */
function placer(points: readonly Point[], cadre: Cadre): Transformation {
  const { xMin, xMax, yMin, yMax } = bornes(points);
  const echelle = Math.min(cadre.largeur / (xMax - xMin), cadre.hauteur / (yMax - yMin));
  const dx = cadre.x + (cadre.largeur - (xMax - xMin) * echelle) / 2;
  const dy = cadre.y + (cadre.hauteur - (yMax - yMin) * echelle) / 2;
  return ([x, y]) => [dx + (x - xMin) * echelle, dy + (yMax - y) * echelle];
}

/** Distance from p to the segment [a, b]. */
function distanceAuSegment(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const longueur2 = dx * dx + dy * dy;
  const t = longueur2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / longueur2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas–Peucker on an open line: its two ends are always kept. */
export function simplifierLigne(points: readonly Point[], tolerance: number): Point[] {
  if (points.length <= 2) return [...points];
  const garder = new Array<boolean>(points.length).fill(false);
  garder[0] = true;
  garder[points.length - 1] = true;
  const pile: [number, number][] = [[0, points.length - 1]];
  for (let morceau = pile.pop(); morceau !== undefined; morceau = pile.pop()) {
    const [debut, fin] = morceau;
    let loin = -1;
    let distanceMax = tolerance;
    for (let i = debut + 1; i < fin; i += 1) {
      const d = distanceAuSegment(points[i] as Point, points[debut] as Point, points[fin] as Point);
      if (d > distanceMax) [loin, distanceMax] = [i, d];
    }
    if (loin !== -1) {
      garder[loin] = true;
      pile.push([debut, loin], [loin, fin]);
    }
  }
  return points.filter((_, i) => garder[i]);
}

/** A closed line (no closing point): kept by halves, from its first point and the point farthest from it. */
function simplifierBoucle(points: readonly Point[], tolerance: number): Point[] {
  const premier = points[0] as Point;
  let loin = 0;
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i] as Point;
    const q = points[loin] as Point;
    if (Math.hypot(p[0] - premier[0], p[1] - premier[1]) > Math.hypot(q[0] - premier[0], q[1] - premier[1])) loin = i;
  }
  const aller = simplifierLigne(points.slice(0, loin + 1), tolerance);
  const retour = simplifierLigne([...points.slice(loin), premier], tolerance);
  return [...aller, ...retour.slice(1, -1)];
}

/** A ring of a department, as point numbers without the closing point, with its department's index. */
type AnneauNumerote = { departement: number; points: number[] };
/** An arc of the topology: a run of a border between two junctions, or a whole ring that has none. */
type Arc = { points: number[]; boucle: boolean; departements: Set<number> };

/**
 * The topology of the rings (as TopoJSON builds it): a point is a junction when its occurrences do not all have the
 * same two neighbours (a border meets another border, or the coast); the rings are cut at their junctions into arcs,
 * and an arc shared by two neighbours is kept once. Each ring is then the list of its arcs, each one possibly reversed.
 */
export function topologie(anneaux: readonly AnneauNumerote[]): {
  arcs: Arc[];
  anneaux: { departement: number; arcs: { arc: number; inverse: boolean }[] }[];
} {
  const voisins = new Map<number, string>();
  const jonctions = new Set<number>();
  for (const { points } of anneaux) {
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i] as number;
      const a = points[(i - 1 + points.length) % points.length] as number;
      const b = points[(i + 1) % points.length] as number;
      const paire = a < b ? `${a},${b}` : `${b},${a}`;
      const connue = voisins.get(p);
      if (connue === undefined) voisins.set(p, paire);
      else if (connue !== paire) jonctions.add(p);
    }
  }
  const arcs: Arc[] = [];
  const parCle = new Map<string, number>();
  const ajouter = (points: number[], boucle: boolean, departement: number) => {
    const cle = points.join(",");
    const cleInverse = [...points].reverse().join(",");
    const connu = parCle.get(cle) ?? parCle.get(cleInverse);
    if (connu !== undefined) {
      (arcs[connu] as Arc).departements.add(departement);
      return { arc: connu, inverse: parCle.get(cle) === undefined };
    }
    parCle.set(cle, arcs.length);
    arcs.push({ points, boucle, departements: new Set([departement]) });
    return { arc: arcs.length - 1, inverse: false };
  };
  const resultat = anneaux.map(({ departement, points }) => {
    const coupures = points.flatMap((p, i) => (jonctions.has(p) ? [i] : []));
    if (coupures.length === 0) {
      // A ring without a junction (an island, or an enclave shared by two departments): one closed arc, from its
      // smallest point, in the direction whose second point is the smaller, so that both owners build the same one.
      const depart = points.indexOf(Math.min(...points));
      const tourne = [...points.slice(depart), ...points.slice(0, depart)];
      const autreSens = [tourne[0] as number, ...tourne.slice(1).reverse()];
      const sens = (tourne[1] as number) <= (autreSens[1] as number) ? tourne : autreSens;
      const { arc } = ajouter(sens, true, departement);
      return { departement, arcs: [{ arc, inverse: sens !== tourne }] };
    }
    const premier = coupures[0] as number;
    const tourne = [...points.slice(premier), ...points.slice(0, premier), points[premier] as number];
    const indices = [...coupures.map((c) => (c - premier + points.length) % points.length), points.length];
    const morceaux: { arc: number; inverse: boolean }[] = [];
    for (let k = 0; k + 1 < indices.length; k += 1) {
      morceaux.push(ajouter(tourne.slice(indices[k], (indices[k + 1] as number) + 1), false, departement));
    }
    return { departement, arcs: morceaux };
  });
  return { arcs, anneaux: resultat };
}

export type FondDeCarte = {
  source: string;
  largeur: number;
  hauteur: number;
  /** Each department: its code, its region's, its name, its outline as an SVG path (to fill with « evenodd »). */
  departements: { code: string; region: string; nom: string; d: string }[];
  /** The borders between two regions, as one SVG path (lines only). */
  frontieresRegions: string;
  /** The frames of the overseas departments, each at its own scale. */
  encarts: ({ code: string } & Cadre)[];
};

export const SOURCE_FOND_DE_CARTE =
  "Fond de carte : IGN, ADMIN EXPRESS COG CARTO PE, édition novembre 2026, Licence Ouverte 2.0 ; contours simplifiés par Sovermap";

/**
 * The layout of the drawing: mainland France on the right, as wide as the drawing allows (its height follows), the
 * five overseas departments in a column on the left, each in its own frame and at its own scale.
 */
const DESSIN = { largeur: 2000, marge: 20, colonne: 300, ecart: 20 } as const;

/** « 12 34 » for a point of the drawing: whole units (half a pixel at 1000 px wide), never « -0 ». */
const formater = ([x, y]: Point) => `${Math.round(x) + 0} ${Math.round(y) + 0}`;

/**
 * The drawing of the departments: mainland France in Lambert-93, each overseas department in its own frame; every
 * border simplified once (Douglas–Peucker, `tolerance` units of the drawing), so that two neighbours keep exactly
 * the same border. A ring left with fewer than three points is an islet too small for the drawing: it is left out;
 * a department left without any ring is an error, never a silent gap in the map.
 */
export function deriverFondDeCarte(
  departements: readonly Departement[],
  { tolerance = 1.5 }: { tolerance?: number } = {},
): FondDeCarte {
  const { largeur, marge, colonne, ecart } = DESSIN;
  const metropole = departements.filter((d) => !(DROM as readonly string[]).includes(d.code));
  const projectionMetropole = lambert();
  const projetes = metropole.flatMap((d) => d.polygones.flat(2).map(projectionMetropole));
  const etendue = bornes(projetes);
  const largeurMetropole = largeur - 2 * marge - colonne - ecart;
  const hauteurMetropole = Math.ceil(
    (largeurMetropole * (etendue.yMax - etendue.yMin)) / (etendue.xMax - etendue.xMin),
  );
  const hauteur = hauteurMetropole + 2 * marge;
  const placerMetropole = placer(projetes, {
    x: marge + colonne + ecart,
    y: marge,
    largeur: largeurMetropole,
    hauteur: hauteurMetropole,
  });
  const cote = (hauteur - 2 * marge - (DROM.length - 1) * ecart) / DROM.length;
  const encarts: FondDeCarte["encarts"] = [];
  const transformations = new Map<string, Transformation>();
  for (const d of metropole) transformations.set(d.code, (p) => placerMetropole(projectionMetropole(p)));
  DROM.forEach((code, i) => {
    const d = departements.find((x) => x.code === code);
    if (d === undefined) return;
    const points = d.polygones.flat(2);
    const b = bornes(points);
    const projection = equirectangulaire((b.xMin + b.xMax) / 2, (b.yMin + b.yMax) / 2);
    const cadre = { x: marge, y: marge + i * (cote + ecart), largeur: colonne, hauteur: cote };
    encarts.push({ code, ...cadre });
    const interieur = { x: cadre.x + 10, y: cadre.y + 10, largeur: cadre.largeur - 20, hauteur: cadre.hauteur - 20 };
    const placerDrom = placer(points.map(projection), interieur);
    transformations.set(code, (p) => placerDrom(projection(p)));
  });
  // Points numbered by their exact coordinates in the copy: two neighbours' shared points get the same number.
  const numeros = new Map<string, number>();
  const places: Point[] = [];
  const anneaux: AnneauNumerote[] = [];
  departements.forEach((d, indice) => {
    const transformer = transformations.get(d.code) as Transformation;
    for (const anneau of d.polygones.flat(1)) {
      const points = anneau.slice(0, -1).map((p) => {
        const cle = `${p[0]},${p[1]}`;
        let n = numeros.get(cle);
        if (n === undefined) {
          n = places.length;
          numeros.set(cle, n);
          places.push(transformer(p));
        }
        return n;
      });
      anneaux.push({ departement: indice, points });
    }
  });
  const topo = topologie(anneaux);
  const simplifies = topo.arcs.map((arc) => {
    const points = arc.points.map((n) => places[n] as Point);
    return arc.boucle ? simplifierBoucle(points, tolerance) : simplifierLigne(points, tolerance);
  });
  const chemins = departements.map(() => [] as string[]);
  topo.anneaux.forEach(({ departement, arcs }) => {
    const points: Point[] = [];
    for (const { arc, inverse } of arcs) {
      const morceau = simplifies[arc] as Point[];
      const sens = inverse ? [...morceau].reverse() : morceau;
      points.push(...(points.length === 0 ? sens : sens.slice(1)));
    }
    // A ring cut at junctions comes back to its first point: the path's « Z » closes it.
    const [premier, dernier] = [points[0], points[points.length - 1]];
    if (
      points.length > 1 &&
      premier !== undefined &&
      dernier !== undefined &&
      formater(premier) === formater(dernier)
    ) {
      points.pop();
    }
    const distincts = points.filter((p, i) => i === 0 || formater(p) !== formater(points[i - 1] as Point));
    if (distincts.length >= 3) (chemins[departement] as string[]).push(`M${distincts.map(formater).join(" ")}Z`);
  });
  departements.forEach((d, i) => {
    if ((chemins[i] as string[]).length === 0) throw new Error(`${d.code} : aucun contour assez grand pour le dessin`);
  });
  const frontieres = topo.arcs.flatMap((arc, i) => {
    const regions = new Set([...arc.departements].map((d) => (departements[d] as Departement).region));
    if (arc.departements.size < 2 || regions.size < 2) return [];
    return [`M${(simplifies[i] as Point[]).map(formater).join(" ")}`];
  });
  return {
    source: SOURCE_FOND_DE_CARTE,
    largeur,
    hauteur,
    departements: departements.map((d, i) => ({
      code: d.code,
      region: d.region,
      nom: d.nom,
      d: (chemins[i] as string[]).join(""),
    })),
    frontieresRegions: frontieres.join(""),
    encarts,
  };
}
