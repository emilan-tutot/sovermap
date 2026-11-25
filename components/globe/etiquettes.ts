// Placement of the labels of the globe: pure geometry, no DOM, so that it can be measured and tested.
//
// Rules (owner's correction a, ARRÊT 2 bis): beside each group of points, the labels stand in a column, from top to
// bottom in the order of their points (north to south); a leader line never crosses another leader line nor a label;
// a label never covers a thread, a point or another label. Labels keep their place while it stays valid, and glide
// when they must move: they never swap places.

export type Point = { x: number; y: number };
export type Cote = "gauche" | "droite";
/** A visible point and the size of its label. */
export type Ancre = { code: string; x: number; y: number; l: number; h: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number };
/** Where a label goes (top-left corner) and its leader line, from just outside its point to the edge of the label. */
export type Place = { code: string; x: number; y: number; l: number; h: number; cote: Cote; ligne: Segment };
/** What is kept from one frame to the next: the side of each label, the column of each side. */
export type Memoire = { cotes: Map<string, Cote>; colonnes: Map<Cote, { decalage: number; ecart: number }> };

export const nouvelleMemoire = (): Memoire => ({ cotes: new Map(), colonnes: new Map() });

const MARGE = 4;
const ECART_VERTICAL = 6;
const DECALAGES = [0, 12, 24, 36, 48, 60, 72, 84, 96, -12, -24, -36, -48];

const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** Two segments cross (touching at an end does not count). */
export function seCroisent(s: Segment, t: Segment): boolean {
  const d1 = orient(s.x1, s.y1, s.x2, s.y2, t.x1, t.y1);
  const d2 = orient(s.x1, s.y1, s.x2, s.y2, t.x2, t.y2);
  const d3 = orient(t.x1, t.y1, t.x2, t.y2, s.x1, s.y1);
  const d4 = orient(t.x1, t.y1, t.x2, t.y2, s.x2, s.y2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

type Boite = { x: number; y: number; l: number; h: number };
const dedans = (p: Point, b: Boite, m: number) => p.x > b.x - m && p.x < b.x + b.l + m && p.y > b.y - m && p.y < b.y + b.h + m;
const chevauchent = (a: Boite, b: Boite, m: number) => a.x < b.x + b.l + m && b.x < a.x + a.l + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

/** Two segments cross, given by their ends (the same test as seCroisent, without building objects). */
function croisent(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  return orient(ax, ay, bx, by, cx, cy) * orient(ax, ay, bx, by, dx, dy) < 0 && orient(cx, cy, dx, dy, ax, ay) * orient(cx, cy, dx, dy, bx, by) < 0;
}

/**
 * A segment, given by its ends, touches a box (enlarged by a margin): an end inside, or a crossing of one of its sides.
 * Run for every piece of every thread at every frame: no object is built, and a segment far from the box is set aside
 * at once.
 */
function segmentTouche(x1: number, y1: number, x2: number, y2: number, b: Boite, m: number): boolean {
  const g = b.x - m;
  const d = b.x + b.l + m;
  const h = b.y - m;
  const bas = b.y + b.h + m;
  if (Math.max(x1, x2) <= g || Math.min(x1, x2) >= d || Math.max(y1, y2) <= h || Math.min(y1, y2) >= bas) return false;
  if ((x1 > g && x1 < d && y1 > h && y1 < bas) || (x2 > g && x2 < d && y2 > h && y2 < bas)) return true;
  return croisent(x1, y1, x2, y2, g, h, d, h) || croisent(x1, y1, x2, y2, d, h, d, bas) || croisent(x1, y1, x2, y2, d, bas, g, bas) || croisent(x1, y1, x2, y2, g, bas, g, h);
}

/** A segment touches a box (enlarged by a margin): an end inside, or a crossing of one of its sides. */
export function toucheBoite(s: Segment, b: Boite, m: number): boolean {
  return segmentTouche(s.x1, s.y1, s.x2, s.y2, b, m);
}

/** A label covers a piece of one of the visible threads. */
function surUnFil(fils: Point[][], b: Boite, m: number): boolean {
  for (const fil of fils)
    for (let k = 1; k < fil.length; k += 1) {
      const a = fil[k - 1];
      const z = fil[k];
      if (a && z && segmentTouche(a.x, a.y, z.x, z.y, b, m)) return true;
    }
  return false;
}

/** Distance from a point to a segment. */
function distance(p: Point, s: Segment): number {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / l2));
  return Math.hypot(p.x - (s.x1 + t * dx), p.y - (s.y1 + t * dy));
}

/** Tops of the labels of a column, as near as possible to their targets, in the same order, never overlapping. */
export function empiler(cibles: number[], h: number[], haut: number, bas: number): number[] {
  const y = [...cibles];
  for (let tour = 0; tour < 40; tour += 1) {
    let bouge = false;
    for (let i = 1; i < y.length; i += 1) {
      const min = (y[i - 1] ?? 0) + (h[i - 1] ?? 0) + ECART_VERTICAL;
      if ((y[i] ?? 0) < min - 0.01) {
        const d = (min - (y[i] ?? 0)) / 2;
        y[i - 1] = (y[i - 1] ?? 0) - d;
        y[i] = (y[i] ?? 0) + d;
        bouge = true;
      }
    }
    for (let i = 0; i < y.length; i += 1) y[i] = Math.min(bas - (h[i] ?? 0), Math.max(haut, y[i] ?? 0));
    if (!bouge) break;
  }
  for (let i = 1; i < y.length; i += 1) y[i] = Math.max(y[i] ?? 0, (y[i - 1] ?? 0) + (h[i - 1] ?? 0) + ECART_VERTICAL);
  for (let i = y.length - 1; i >= 0; i -= 1) {
    const max = i === y.length - 1 ? bas - (h[i] ?? 0) : (y[i + 1] ?? 0) - ECART_VERTICAL - (h[i] ?? 0);
    y[i] = Math.min(y[i] ?? 0, max);
  }
  return y;
}

type Cadre = { largeur: number; hauteur: number; basLibre: number; ecart: number };
type Obstacles = { points: Point[]; fils: Point[][]; boites: Boite[]; lignes: Segment[] };

/** The column of one side for one candidate shift; null if a hard rule breaks (`souple` relaxes the softest ones). */
function colonne(groupe: Ancre[], cote: Cote, decalage: number, ecart: number, c: Cadre, o: Obstacles, souple: number): Place[] | null {
  const bord = cote === "gauche" ? Math.min(...groupe.map((a) => a.x)) - ecart : Math.max(...groupe.map((a) => a.x)) + ecart;
  const ys = empiler(
    groupe.map((a) => a.y - a.h / 2 + decalage),
    groupe.map((a) => a.h),
    4,
    c.hauteur - c.basLibre,
  );
  const places: Place[] = groupe.map((a, i) => {
    const x = cote === "gauche" ? bord - a.l : bord;
    const y = ys[i] ?? 0;
    const ax = cote === "gauche" ? x + a.l : x;
    const ay = Math.min(y + a.h - 3, Math.max(y + 3, a.y));
    const d = Math.hypot(ax - a.x, ay - a.y) || 1;
    return { code: a.code, x, y, l: a.l, h: a.h, cote, ligne: { x1: a.x + ((ax - a.x) / d) * 6, y1: a.y + ((ay - a.y) / d) * 6, x2: ax, y2: ay } };
  });
  for (const p of places) {
    // Inside the scene, on the right side of its point (a clamped column would cover it).
    if (p.x < 4 || p.x + p.l > c.largeur - 4) return null;
    if (o.boites.some((b) => chevauchent(p, b, MARGE))) return null;
    if (o.points.some((q) => dedans(q, p, 5))) return null;
    if (o.lignes.some((l) => toucheBoite(l, p, 2))) return null;
    if (souple < 2 && surUnFil(o.fils, p, 3)) return null;
  }
  for (let i = 0; i < places.length; i += 1) {
    const p = places[i];
    if (!p) continue;
    for (let j = i + 1; j < places.length; j += 1) {
      const q = places[j];
      if (!q) continue;
      if (chevauchent(p, q, MARGE)) return null;
      if (seCroisent(p.ligne, q.ligne)) return null;
      if (toucheBoite(p.ligne, q, 2) || toucheBoite(q.ligne, p, 2)) return null;
    }
    if (o.lignes.some((l) => seCroisent(l, p.ligne))) return null;
    if (o.boites.some((b) => toucheBoite(p.ligne, b, 2))) return null;
    if (souple < 1 && o.points.some((q) => Math.hypot(q.x - (p.ligne.x1 - 0), q.y - p.ligne.y1) > 8 && distance(q, p.ligne) < 4)) return null;
  }
  return places;
}

/**
 * The best column of one side for these labels, or null: the one it had while it stays valid, otherwise the cheapest
 * valid one (near its points, downwards first); when nothing is valid, the softest rules give way first (a line near a
 * point, then a label over a thread). The chosen column is kept in `memoire`.
 */
function meilleureColonne(groupe: Ancre[], cote: Cote, ecart: number, c: Cadre, o: Obstacles, memoire: Memoire): Place[] | null {
  let choix: Place[] | null = null;
  for (let souple = 0; souple <= 2 && !choix; souple += 1) {
    const avant = memoire.colonnes.get(cote);
    if (avant) {
      choix = colonne(groupe, cote, avant.decalage, avant.ecart, c, o, souple);
      if (choix) break;
    }
    let coutMin = Infinity;
    for (const decalage of DECALAGES) {
      for (const plus of [0, 16, 32]) {
        const places = colonne(groupe, cote, decalage, ecart + plus, c, o, souple);
        if (!places) continue;
        const cout = places.reduce((s, p, i) => s + Math.abs(p.y + p.h / 2 - (groupe[i]?.y ?? 0)), 0) + Math.abs(decalage) * (decalage < 0 ? 0.8 : 0.5) + plus * 0.3;
        if (cout < coutMin) {
          coutMin = cout;
          choix = places;
          memoire.colonnes.set(cote, { decalage, ecart: ecart + plus });
        }
      }
    }
  }
  return choix;
}

/**
 * Places every visible label. Each side is a column: the side with more labels first, then the other one, which keeps
 * clear of the first. `ancres` come in order of priority (France first, then the countries by number of sites): a
 * column holds at most what its height allows, and when it cannot hold all its labels, it keeps the most it can from
 * the first ones (D.3, correction 3: with dozens of countries, the smallest stay in the list, never the largest).
 */
export function placerEtiquettes(ancres: Ancre[], fils: Point[][], largeur: number, hauteur: number, basLibre: number, memoire: Memoire): Place[] {
  const milieu = largeur / 2;
  const ecart = largeur < 520 ? 14 : 34;
  const cotes: Record<Cote, Ancre[]> = { gauche: [], droite: [] };
  for (const a of ancres) {
    const avant = memoire.cotes.get(a.code);
    const seuil = avant === "droite" ? largeur * 0.06 : avant === "gauche" ? -largeur * 0.06 : 0;
    const cote: Cote = a.x > milieu + seuil ? "gauche" : "droite";
    memoire.cotes.set(a.code, cote);
    cotes[cote].push(a);
  }
  for (const code of [...memoire.cotes.keys()]) if (!ancres.some((a) => a.code === code)) memoire.cotes.delete(code);
  const ordre: Cote[] = cotes.gauche.length >= cotes.droite.length ? ["gauche", "droite"] : ["droite", "gauche"];
  const obstacles: Obstacles = { points: ancres.map((a) => ({ x: a.x, y: a.y })), fils, boites: [], lignes: [] };
  const cadre: Cadre = { largeur, hauteur, basLibre, ecart };
  const sortie: Place[] = [];
  for (const cote of ordre) {
    // The side's labels in order of priority, at most as many as the column's height can hold.
    const parPriorite = cotes[cote];
    const hauteurMax = Math.max(1, ...parPriorite.map((a) => a.h));
    // n labels need n heights and n − 1 gaps between the top (4) and the free bottom (empiler).
    const capacite = Math.floor((hauteur - basLibre - 4 + ECART_VERTICAL) / (hauteurMax + ECART_VERTICAL));
    const essayer = (n: number) => meilleureColonne(parPriorite.slice(0, n).sort((a, b) => a.y - b.y), cote, ecart, cadre, obstacles, memoire);
    let haut = Math.min(capacite, parPriorite.length);
    let choix = haut > 0 ? essayer(haut) : null;
    if (!choix && haut > 1) {
      // The most labels that fit, from the first ones: a search by halves, so that a crowded frame stays fast.
      let bas = 0;
      while (haut - bas > 1) {
        const milieuN = Math.floor((bas + haut) / 2);
        const places = essayer(milieuN);
        if (places) [bas, choix] = [milieuN, places];
        else haut = milieuN;
      }
    }
    if (!choix) {
      memoire.colonnes.delete(cote);
      continue;
    }
    for (const p of choix) {
      obstacles.boites.push(p);
      obstacles.lignes.push(p.ligne);
      sortie.push(p);
    }
  }
  return sortie;
}
