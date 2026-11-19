// Films a route of the site (DESIGN.md §14: a video only when a movement must be judged), in Edge without any visible
// window and without capturing the screen. The page runs on a virtual clock (horloge.ts): each image of the film
// advances it by exactly 1/30 s, then Edge renders that state and the image is taken from its own rendering at the real
// pixel density (computer: 1707 × 799 at scale 1.5, images of 2560 × 1198; phone: Pixel 9 profile, 1080 × 2196).
// Every movement (rotation, drag, scroll) advances by a regular step per image, whatever the time a capture takes.
// The images go straight to ffmpeg (H.264, 30 images per second); the movements are written next to the film
// (<film>.segments.json) for the image-by-image check (verifier-film.ts).
//   npx tsx scripts/design/filmer.ts <parcours.json> <ordinateur|telephone> <film.mp4>
// The route: { "etapes": [ … ] }. A number may differ per device ({ "ordinateur": 520, "telephone": 900 }); a step
// with "appareil" runs on that device only. A target: { "role": "button", "nom": "Recentrer" }, { "libelle": "…" } (a
// field, by its label) or { "css": ".pays-bouton", "texte": "États-Unis" }. The steps:
//   { "aller": "/" }                       open a page of the site
//   { "globe": true }                      wait until the globe has drawn its first image
//   { "pause": 5.5 } or { "images": 12 }   let the page run; with "mouvement": "<nom>", every image must differ from
//                                          the previous one ("depuis": seconds left out at its start; "constante":
//                                          true for a movement at constant speed)
//   { "glisser": <cible>, "depart": [0.32, 0.55], "longueur": 0.3, "images": 54 }   a horizontal drag at a regular
//                                          step (the mouse; a finger on a phone), from a point of the target (fractions
//                                          of its box), over a fraction of its width
//   { "toucher": <cible> }                 a click (a tap on a phone)
//   { "defiler": 900, "duree": 2.4, "nom": "…" }   scroll at a constant speed, never past either end of the page
//   { "amener": <cible>, "hauteur": 360, "duree": 1.6, "nom": "…" }   scroll until the target stands at that height
//   { "haut": true }                       back to the top at once
//   { "adresse": "/site/" }                wait for an address (after a link)
//   { "taper": "impots", "cible": <cible>, "vider": true }   type letter by letter (4 images each), in the target
//                                          (emptied first with "vider")
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { APPAREILS, adresse, attendreGlobe, lancerEdge, type Appareil } from "./commun";
import { HORLOGE } from "./horloge";

type Valeur = number | Record<Appareil, number>;
type Cible = { role: Parameters<Page["getByRole"]>[0]; nom: string } | { libelle: string } | { css: string; texte?: string };
type Etape = {
  appareil?: Appareil;
  aller?: string;
  globe?: boolean;
  pause?: Valeur;
  images?: number;
  mouvement?: string;
  depuis?: number;
  constante?: boolean;
  glisser?: Cible;
  depart?: [Valeur, Valeur];
  longueur?: Valeur;
  toucher?: Cible;
  defiler?: Valeur;
  duree?: number;
  nom?: string;
  amener?: Cible;
  hauteur?: Valeur;
  haut?: boolean;
  adresse?: string;
  taper?: string;
  cible?: Cible;
  vider?: boolean;
};
// The kind of a step is its first key in this list: "images" also sets the length of a drag, so the pauses come last.
const GENRES = ["aller", "globe", "glisser", "toucher", "defiler", "amener", "haut", "adresse", "taper", "pause", "images"] as const;

const [fichierParcours = "", appareilDemande = "ordinateur", sortie = "film.mp4"] = process.argv.slice(2);
if (appareilDemande !== "ordinateur" && appareilDemande !== "telephone") throw new Error("appareil : ordinateur ou telephone");
const appareil: Appareil = appareilDemande;
const tel = appareil === "telephone";
const parcours = JSON.parse(readFileSync(fichierParcours, "utf8")) as { etapes: Etape[] };
const IMAGE = 1000 / 30;

const navigateur = await lancerEdge();
const ctx = await navigateur.newContext(APPAREILS[appareil]);
await ctx.addInitScript({ content: HORLOGE });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

const encodeur = spawn(
  "ffmpeg",
  ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-", "-vf", "crop=trunc(iw/2)*2:trunc(ih/2)*2:0:0,scale=out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-r", "30", "-movflags", "+faststart", sortie],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const encode = new Promise<void>((fin, echec) => encodeur.on("close", (code) => (code === 0 ? fin() : echec(new Error(`ffmpeg ${code}`)))));

let images = 0;
let taille = "";
const segments: { nom: string; debut: number; fin: number; constante: boolean }[] = [];
/** One image: the clock advances by 1/30 s, Edge renders, the image goes to the film. */
async function image() {
  for (let essai = 0; essai < 20; essai += 1) {
    try {
      await page.evaluate((ms) => (window as unknown as { __avancer: (ms: number) => Promise<void> }).__avancer(ms), IMAGE);
      break;
    } catch {
      // A navigation is under way: the new page is not ready yet.
      await page.waitForTimeout(50);
    }
  }
  // The caret is hidden: it blinks in real time, not on the virtual clock.
  const tampon = await page.screenshot({ type: "jpeg", quality: 92, scale: "device", caret: "hide", animations: "allow", timeout: 60000 });
  if (!taille) {
    for (let i = 2; i < tampon.length - 9; i += 1)
      if (tampon[i] === 0xff && (tampon[i + 1] === 0xc0 || tampon[i + 1] === 0xc2)) {
        taille = `${tampon.readUInt16BE(i + 7)}×${tampon.readUInt16BE(i + 5)}`;
        break;
      }
  }
  if (!encodeur.stdin.write(tampon)) await new Promise((fin) => encodeur.stdin.once("drain", fin));
  images += 1;
}
const plusieurs = async (n: number) => {
  for (let i = 0; i < n; i += 1) await image();
};
/** A movement, recorded as such for the check: every image of it must differ from the previous one. */
async function mouvement(nom: string, n: number, pas: (i: number) => Promise<unknown>, constante = false) {
  const debut = images;
  for (let i = 0; i < n; i += 1) {
    await pas(i);
    await image();
  }
  segments.push({ nom, debut, fin: images - 1, constante });
}
/** Scrolls by `total` pixels at a constant speed, never past either end of the page (a still image inside a movement
 * would count as repeated); a shorter way keeps the same speed. */
async function defiler(nom: string, total: number, duree: number) {
  const { reste, haut } = await page.evaluate(() => ({ reste: document.documentElement.scrollHeight - window.innerHeight - window.scrollY, haut: window.scrollY }));
  const distance = total > 0 ? Math.min(total, reste - 2) : Math.max(total, -(haut - 2));
  if (Math.abs(distance) < 4) return;
  const n = Math.max(1, Math.round(duree * 30 * (distance / total)));
  await mouvement(nom, n, () => page.evaluate((y) => window.scrollBy({ top: y, behavior: "instant" as ScrollBehavior }), distance / n));
}
const choisir = (v: Valeur): number => (typeof v === "number" ? v : v[appareil]);
function localiser(c: Cible): Locator {
  if ("role" in c) return page.getByRole(c.role, { name: c.nom });
  if ("libelle" in c) return page.getByLabel(c.libelle);
  return (c.texte === undefined ? page.locator(c.css) : page.locator(c.css, { hasText: c.texte })).first();
}
const toucher = (l: Locator) => (tel ? l.tap() : l.click());
function exiger<T>(v: T | undefined, n: number): T {
  if (v === undefined) throw new Error(`étape ${n + 1} incomplète`);
  return v;
}
/** One move of a drag, then wait until the page has handled it: one step per image, never two merged. */
async function bouger(envoyer: () => Promise<unknown>) {
  const avant = await page.evaluate(() => (window as unknown as { __mouvements: number }).__mouvements);
  await envoyer();
  await page.waitForFunction((n0) => (window as unknown as { __mouvements: number }).__mouvements > n0, avant, { polling: 5, timeout: 10000 });
}

for (const [n, e] of parcours.etapes.entries()) {
  if (e.appareil !== undefined && e.appareil !== appareil) continue;
  const genre = GENRES.find((g) => g in e);
  switch (genre) {
    case "aller":
      await page.goto(adresse(exiger(e.aller, n)), { waitUntil: "load" });
      break;
    case "globe":
      await attendreGlobe(page);
      break;
    case "pause":
    case "images": {
      const total = e.images ?? Math.round(choisir(e.pause ?? 0) * 30);
      const debut = images;
      await plusieurs(total);
      if (e.mouvement !== undefined) segments.push({ nom: e.mouvement, debut: debut + Math.round((e.depuis ?? 0) * 30), fin: images - 1, constante: e.constante ?? false });
      break;
    }
    case "glisser": {
      const b = await localiser(exiger(e.glisser, n)).boundingBox();
      if (!b) throw new Error(`étape ${n + 1} : cible introuvable`);
      const [fx = 0.32, fy = 0.55] = (e.depart ?? []).map(choisir);
      const pas = e.images ?? 54;
      const x0 = b.x + b.width * fx;
      const y0 = b.y + b.height * fy;
      const dx = (b.width * choisir(e.longueur ?? 0.3)) / pas;
      const nom = e.nom ?? "glisser";
      if (tel) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
        await mouvement(nom, pas, (i) => bouger(() => cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + dx * (i + 1), y: y0 }] })), true);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await page.mouse.move(x0, y0);
        await page.mouse.down();
        await mouvement(nom, pas, (i) => bouger(() => page.mouse.move(x0 + dx * (i + 1), y0)), true);
        await page.mouse.up();
      }
      break;
    }
    case "toucher":
      await toucher(localiser(exiger(e.toucher, n)));
      break;
    case "defiler":
      await defiler(e.nom ?? "défilement", choisir(exiger(e.defiler, n)), e.duree ?? 2);
      break;
    case "amener": {
      const b = await localiser(exiger(e.amener, n)).boundingBox();
      if (!b) throw new Error(`étape ${n + 1} : cible introuvable`);
      const total = b.y - choisir(e.hauteur ?? 300);
      if (Math.abs(total) > 4) await defiler(e.nom ?? "défilement", total, e.duree ?? 1.5);
      break;
    }
    case "haut":
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
      break;
    case "adresse":
      await page.waitForURL(new RegExp(exiger(e.adresse, n)), { waitUntil: "commit" });
      break;
    case "taper": {
      if (e.cible !== undefined) {
        const champ = localiser(e.cible);
        if (e.vider === true) await champ.fill("");
        else await toucher(champ);
      }
      for (const lettre of exiger(e.taper, n)) {
        await page.keyboard.type(lettre);
        await plusieurs(4);
      }
      break;
    }
    case undefined:
      throw new Error(`étape ${n + 1} inconnue : ${JSON.stringify(e)}`);
    default: {
      const jamais: never = genre;
      throw new Error(`étape ${String(jamais)} non traitée`);
    }
  }
}

encodeur.stdin.end();
await encode;
await navigateur.close();
writeFileSync(`${sortie}.segments.json`, JSON.stringify({ parcours: path.basename(fichierParcours), appareil, images, taille, segments }, null, 2));
console.log(`${appareil} : ${images} images (${(images / 30).toFixed(1).replace(".", ",")} s à 30 images/s) ; taille ${taille} ; ${segments.length} mouvement(s) ; ${sortie}`);
