// Geography of the scene: no three.js here, only numbers. Natural Earth data (public domain).

export type PaysMonde = { c: string; n: string; lx: number; ly: number; p: number[][] };
export type Monde = { pays: PaysMonde[]; cotes: number[][]; frontieres: number[][] };
/**
 * A thread from France to the country of the headquarters of the ultimate parents, thicker with more sites. `horsUE`
 * says whether that country is outside the European Union: only those threads take the accent.
 */
export type Fil = { code: string; nom: string; lat: number; lon: number; sites: number; horsUE: boolean };

export const FRANCE = { code: "FR", lat: 46.7, lon: 2.55 };
const RAD = Math.PI / 180;

/** Position on a sphere: longitude 0 faces +z, east is +x, north is +y. */
export function surSphere(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = lat * RAD;
  const lam = lon * RAD;
  return [r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam)];
}

export function versLatLon(x: number, y: number, z: number): { lat: number; lon: number } {
  const r = Math.hypot(x, y, z) || 1;
  return { lat: Math.asin(y / r) / RAD, lon: Math.atan2(x, z) / RAD };
}

/**
 * Points of a great-circle arc above the sphere, highest in the middle. Its height follows its length: a long thread
 * rises like a trajectory, a short one (France to Luxembourg or to the United Kingdom) lies almost flat on the map, so
 * that no thread ever looks like a hook, from any angle. `rayon` is the radius of its ends: just above the surface,
 * so that the tube never sinks into the globe.
 */
export function arcGrandCercle(a: { lat: number; lon: number }, b: { lat: number; lon: number }, n = 96, rayon = 1): [number, number, number][] {
  const va = surSphere(a.lat, a.lon);
  const vb = surSphere(b.lat, b.lon);
  const cos = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(cos);
  // 0.13 radius for France to the United States (about 0.94 rad), 0.0014 for France to Luxembourg.
  const hauteur = 0.13 * Math.pow(omega / 0.94, 1.6);
  const points: [number, number, number][] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const s = Math.sin(omega) || 1;
    const k1 = Math.sin((1 - t) * omega) / s;
    const k2 = Math.sin(t * omega) / s;
    const r = rayon + hauteur * Math.sin(Math.PI * t);
    points.push([(k1 * va[0] + k2 * vb[0]) * r, (k1 * va[1] + k2 * vb[1]) * r, (k1 * va[2] + k2 * vb[2]) * r]);
  }
  return points;
}

// Equal Earth projection (Šavrič, Patterson, Jenny, 2018), in units where the map is about 5.4 wide.
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
export function equalEarth(lat: number, lon: number): [number, number] {
  const theta = Math.asin(M * Math.sin(lat * RAD));
  const t2 = theta * theta;
  const t6 = t2 * t2 * t2;
  const x = (2 * Math.sqrt(3) * (lon * RAD) * Math.cos(theta)) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1));
  const y = theta * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x, y];
}
export function equalEarthInverse(x: number, y: number): { lat: number; lon: number } | null {
  let theta = y;
  for (let i = 0; i < 12; i += 1) {
    const t2 = theta * theta;
    const t6 = t2 * t2 * t2;
    const f = theta * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)) - y;
    const df = A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2);
    const d = f / df;
    theta -= d;
    if (Math.abs(d) < 1e-9) break;
  }
  const t2 = theta * theta;
  const t6 = t2 * t2 * t2;
  const lon = (M * x * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))) / Math.cos(theta) / RAD;
  const s = Math.sin(theta) / M;
  if (Math.abs(s) > 1 || Math.abs(lon) > 180) return null;
  return { lat: Math.asin(s) / RAD, lon };
}

type Boite = { code: string; minX: number; maxX: number; minY: number; maxY: number; anneaux: number[][] };
/** Point-in-polygon search over the countries, with bounding boxes. */
export function indexPays(monde: Monde): (lat: number, lon: number) => string | null {
  const boites: Boite[] = [];
  for (const p of monde.pays) {
    for (const anneau of p.p) {
      let minX = 180;
      let maxX = -180;
      let minY = 90;
      let maxY = -90;
      for (let i = 0; i < anneau.length; i += 2) {
        const x = anneau[i] ?? 0;
        const y = anneau[i + 1] ?? 0;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      boites.push({ code: p.c, minX, maxX, minY, maxY, anneaux: [anneau] });
    }
  }
  return (lat, lon) => {
    for (const b of boites) {
      if (lon < b.minX || lon > b.maxX || lat < b.minY || lat > b.maxY) continue;
      for (const anneau of b.anneaux) {
        let dedans = false;
        for (let i = 0, j = anneau.length - 2; i < anneau.length; j = i, i += 2) {
          const xi = anneau[i] ?? 0;
          const yi = anneau[i + 1] ?? 0;
          const xj = anneau[j] ?? 0;
          const yj = anneau[j + 1] ?? 0;
          if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dedans = !dedans;
        }
        if (dedans) return b.code;
      }
    }
    return null;
  };
}

/** Graticule lines every `pas` degrees, as polylines of [lon, lat] pairs. */
export function graticule(pas = 15, finesse = 2): number[][] {
  const lignes: number[][] = [];
  for (let lat = -75; lat <= 75; lat += pas) {
    const l: number[] = [];
    for (let lon = -180; lon <= 180; lon += finesse) l.push(lon, lat);
    lignes.push(l);
  }
  for (let lon = -180; lon < 180; lon += pas) {
    const l: number[] = [];
    for (let lat = -85; lat <= 85; lat += finesse) l.push(lon, lat);
    lignes.push(l);
  }
  return lignes;
}
