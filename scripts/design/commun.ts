// Shared by the design tools (DESIGN.md §14). They measure the local production build (npm run build, then
// npx next start -p 3100), or the site at ORIGINE. Their measures go outside the repository (the folder MESURES, or
// sovermap-mesures in the system temporary folder): what counts is copied, dated, into
// specs/001-sovermap/journal-design.md.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, devices, type BrowserContextOptions, type Page } from "@playwright/test";

export const ORIGINE = process.env["ORIGINE"] ?? "http://localhost:3100";
/** The address of a page of the site. Under Git Bash, an argument that starts with / becomes a Windows folder unless
 * the tool runs with MSYS_NO_PATHCONV=1: such a path is refused with that hint. */
export function adresse(chemin: string): string {
  if (!chemin.startsWith("/")) throw new Error(`chemin de page invalide : « ${chemin} » (il commence par /) ; sous Git Bash, lancer avec MSYS_NO_PATHCONV=1`);
  return `${ORIGINE}${chemin}`;
}

/** The two devices of every design point: the owner's screen (1707 × 799 CSS px at scale 1.5) and a phone (Pixel 9). */
export type Appareil = "ordinateur" | "telephone";
export const APPAREILS: Record<Appareil, BrowserContextOptions> = {
  ordinateur: { viewport: { width: 1707, height: 799 }, deviceScaleFactor: 1.5 },
  telephone: { ...devices["Pixel 9"] },
};
export const ECHELLE: Record<Appareil, number> = { ordinateur: 1.5, telephone: devices["Pixel 9"]?.deviceScaleFactor ?? 3 };

/** Edge without any window, with its GPU (Direct3D 11): the 3D is drawn as for a visitor. */
export const lancerEdge = () => chromium.launch({ channel: "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

/** tsx gives the functions it sends to a page a helper of its own (__name): the page gets that helper. */
export const AIDE_TSX = "window.__name = (f) => f;";

/** Waits until the globe of the page (components/globe/Globe.tsx) has drawn its first image. */
export async function attendreGlobe(page: Page, delai = 30000): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { __sovermap3d?: { pret: boolean } }).__sovermap3d?.pret === true, null, { timeout: delai, polling: 100 });
}

/** Does the page carry the globe? */
export const aLeGlobe = async (page: Page) => (await page.locator(".scene canvas").count()) > 0;

/** The value given after --nom on the command line, or every value when the option is repeated. */
export const option = (nom: string): string | undefined => valeursOption(nom)[0];
export function valeursOption(nom: string): string[] {
  const a = process.argv.slice(2);
  return a.flatMap((x, i) => (x === `--${nom}` && a[i + 1] !== undefined ? [a[i + 1] ?? ""] : []));
}
/** The arguments that are neither an option (--nom) nor the value of one. */
export function positionnels(): string[] {
  const a = process.argv.slice(2);
  return a.filter((x, i) => !x.startsWith("--") && !(a[i - 1]?.startsWith("--") ?? false));
}

/** Writes measures (JSON) outside the repository; returns the file. */
export function ecrireMesures(nom: string, donnees: Record<string, unknown>): string {
  const dossier = process.env["MESURES"] ?? path.join(tmpdir(), "sovermap-mesures");
  mkdirSync(dossier, { recursive: true });
  const fichier = path.join(dossier, nom);
  writeFileSync(fichier, `${JSON.stringify({ date: new Date().toISOString(), origine: ORIGINE, ...donnees }, null, 2)}\n`, "utf8");
  return fichier;
}

/** A number written the French way: 5,4 rather than 5.4. */
export const fr = (v: number, decimales = 2) => v.toFixed(decimales).replace(".", ",");

// Colours: sRGB bytes; WCAG 2.2 contrast; OKLab (its L is the OKLCH lightness).
export type Rgb = [number, number, number];
const lineaire = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const luminance = ([r, g, b]: Rgb) => 0.2126 * lineaire(r / 255) + 0.7152 * lineaire(g / 255) + 0.0722 * lineaire(b / 255);
export function ratio(a: Rgb, b: Rgb): number {
  const [x = 0, y = 0] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export function oklab([r, g, b]: Rgb): Rgb {
  const [lr, lg, lb] = [lineaire(r / 255), lineaire(g / 255), lineaire(b / 255)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export const clarte = (c: Rgb) => oklab(c)[0];
export const versHex = (c: Rgb) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0").toUpperCase()).join("")}`;
export function depuisHex(hex: string): Rgb {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** An image, or a box of it (device pixels, kept inside the image), as RGB bytes read through ffmpeg. */
export type Image = { l: number; h: number; px: Buffer };
export type Boite = { x: number; y: number; l: number; h: number };
export function lireImage(fichier: string, boite?: Boite): Image {
  const sonde = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", fichier], { encoding: "utf8" });
  let [l = 0, h = 0] = sonde.stdout.trim().split(",").map(Number);
  const filtre: string[] = [];
  if (boite) {
    const x = Math.min(Math.max(0, Math.round(boite.x)), l - 2);
    const y = Math.min(Math.max(0, Math.round(boite.y)), h - 2);
    [l, h] = [Math.max(2, Math.min(Math.round(boite.l), l - x)), Math.max(2, Math.min(Math.round(boite.h), h - y))];
    filtre.push("-vf", `crop=${l}:${h}:${x}:${y}`);
  }
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", fichier, ...filtre, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 256 << 20 });
  if (r.status !== 0 || r.stdout.length !== l * h * 3) throw new Error(`lecture de l'image : ${fichier}`);
  return { l, h, px: r.stdout };
}
export function pixel(image: Image, x: number, y: number): Rgb {
  const i = (Math.round(y) * image.l + Math.round(x)) * 3;
  return [image.px[i] ?? 0, image.px[i + 1] ?? 0, image.px[i + 2] ?? 0];
}
export function pixels(image: Image): Rgb[] {
  const px: Rgb[] = [];
  for (let i = 0; i + 2 < image.px.length; i += 3) px.push([image.px[i] ?? 0, image.px[i + 1] ?? 0, image.px[i + 2] ?? 0]);
  return px;
}
/** The median colour, by lightness. */
export const mediane = (px: Rgb[]): Rgb => [...px].sort((a, b) => luminance(a) - luminance(b))[Math.floor(px.length / 2)] ?? [0, 0, 0];
/** The most frequent colour: the background of a box of text, or of a page. */
export function frequente(px: Rgb[]): Rgb {
  const comptes = new Map<number, number>();
  let meilleure = 0;
  let max = 0;
  for (const [r, g, b] of px) {
    const cle = (r << 16) | (g << 8) | b;
    const n = (comptes.get(cle) ?? 0) + 1;
    comptes.set(cle, n);
    if (n > max) [max, meilleure] = [n, cle];
  }
  return [(meilleure >> 16) & 255, (meilleure >> 8) & 255, meilleure & 255];
}
