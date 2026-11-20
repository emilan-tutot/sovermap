// The Sovermap logo (A.5, the owner's choice of 20/11/2026): a circle, an arc across its upper half, and two filled
// dots where the arc meets the circle — « le fil » between two countries. Redrawn from the owner's PNG (1254 × 1254
// pixels): the proportions below were measured on it and are given for a circle of radius 1. The PNG's ring was
// slightly oval (radius 420 to 425 pixels) and its arc slightly irregular: the redraw keeps the measured anchors — the
// arc's top, the dots' height and size, the strokes — and makes the arc the half-ellipse that joins both dots.
// One colour (--color-encre), one stroke. The tab icon thickens its strokes, legible at 16 pixels, and turns light on a
// dark tab (prefers-color-scheme). Tested in tests/logo.test.ts; the files are drawn by scripts/design/icones.ts.
import { JETONS } from "./tokens";

export type Proportions = {
  /** Stroke of the circle and of the arc. */
  trait: number;
  /** Radius of the two dots. */
  point: number;
};

/** Measured on the PNG (ring of radius 408.3 pixels): strokes of 30 pixels, dots of radius 35.3 pixels. */
export const LOGO_FIDELE: Proportions = { trait: 0.0735, point: 0.0865 };

/** For the tab icon, drawn 16 to 32 pixels wide: thicker strokes and dots, the same shape. */
export const LOGO_PETIT: Proportions = { trait: 0.16, point: 0.19 };

/** Height of the dots above the circle's horizontal diameter, in degrees (measured: 11.0° and 14.3°). */
export const ELEVATION_DES_POINTS = 12.65;

/** Height of the top of the arc's midline above the circle's centre (measured: 251.5 pixels for 408.3). */
export const SOMMET_DE_L_ARC = 0.616;

/**
 * The arc is half an ellipse, like an orbit seen around the globe: its vertical half-axis, measured by fitting its
 * midline (mean gap: 1 pixel over 1254); its centre and its horizontal half-axis follow from the top and the dots.
 */
export const DEMI_HAUTEUR_DE_L_ARC = 0.6451;

/** The one colour of the logo: the ink of the site (--color-encre). */
export const ENCRE = JETONS.encre;
/** The light version, for a dark tab: the colour of the site's background (--color-fond). */
export const ENCRE_CLAIRE = JETONS.fond;

/** The arc's ellipse — centre (0, cy), half-axes rx and ry — through the arc's top and both dots (px, py). */
export function ellipseDeLArc(elevation = ELEVATION_DES_POINTS, sommet = SOMMET_DE_L_ARC, ry = DEMI_HAUTEUR_DE_L_ARC) {
  const a = (elevation * Math.PI) / 180;
  const px = Math.cos(a);
  const py = -Math.sin(a);
  const cy = ry - sommet;
  // The dot lies on the ellipse: (px / rx)² + ((py − cy) / ry)² = 1.
  const rx = px / Math.sqrt(1 - ((py - cy) / ry) ** 2);
  return { cy, rx, ry, px, py };
}

const nombre = (v: number) => Number(v.toFixed(4)).toString();

/** Half the side of a square that holds the drawing, with a small margin. */
export function demiCote(p: Proportions): number {
  const { px } = ellipseDeLArc();
  return Math.max(1 + p.trait / 2, px + p.point) + 0.02;
}

export type OptionsSvg = Proportions & {
  /** The light colour, under prefers-color-scheme: dark (the tab icon only). */
  claire?: string;
  titre?: string;
};

/** The logo as an SVG document, centred in a square viewBox; one colour, two forms: circles and an arc. */
export function svgLogo(options: OptionsSvg): string {
  const { rx, ry, px, py } = ellipseDeLArc();
  const d = demiCote(options);
  const style =
    `.l{fill:none;stroke:${ENCRE};stroke-width:${nombre(options.trait)}}.p{fill:${ENCRE}}` +
    (options.claire === undefined
      ? ""
      : `@media (prefers-color-scheme:dark){.l{stroke:${options.claire}}.p{fill:${options.claire}}}`);
  const titre = options.titre === undefined ? "" : `<title>${options.titre}</title>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${nombre(-d)} ${nombre(-d)} ${nombre(2 * d)} ${nombre(2 * d)}">`,
    titre,
    `<style>${style}</style>`,
    `<circle class="l" r="1"/>`,
    // From the left dot over the top to the right dot, clockwise around the ellipse's centre (below the dots): sweep 1.
    `<path class="l" d="M${nombre(-px)} ${nombre(py)}A${nombre(rx)} ${nombre(ry)} 0 0 1 ${nombre(px)} ${nombre(py)}"/>`,
    `<circle class="p" cx="${nombre(-px)}" cy="${nombre(py)}" r="${nombre(options.point)}"/>`,
    `<circle class="p" cx="${nombre(px)}" cy="${nombre(py)}" r="${nombre(options.point)}"/>`,
    `</svg>`,
  ]
    .filter((ligne) => ligne !== "")
    .join("")
    .concat("\n");
}
