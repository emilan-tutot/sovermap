// npx tsx scripts/design/icones.ts [--planche <dossier>]
// Draws the site's icons from the logo's geometry (lib/design/logo.ts), with Edge and no other tool:
//   public/icon.svg               the tab icon: thick strokes (legible at 16 px), light on a dark tab;
//   public/apple-touch-icon.png   180 × 180, opaque (iOS fills transparency with black), on the site's background;
//   public/partage.png            1200 × 630, the share image of the waiting page (texts from lib/i18n/fr.ts).
// With --planche, also draws the board of a point: tabs light and dark at 16 and 32 pixels (before and after, each
// pixel enlarged), the home-screen icon and the share image.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ENCRE, ENCRE_CLAIRE, LOGO_FIDELE, LOGO_PETIT, svgLogo } from "../../lib/design/logo";
import { JETONS } from "../../lib/design/tokens";
import { fr } from "../../lib/i18n/fr";
import { AIDE_TSX, lancerEdge, option } from "./commun";

const FOND = JETONS.fond;
const DISCRET = JETONS.discret;

const police = (fichier: string) =>
  `data:font/woff2;base64,${readFileSync(path.join("app", "fonts", fichier)).toString("base64")}`;
const POLICES = `
@font-face { font-family: Titre; font-weight: 600; src: url(${police("chakra-petch-latin-600-normal.woff2")}) format("woff2"); }
@font-face { font-family: Texte; font-weight: 200 800; src: url(${police("manrope-latin-wght-normal.woff2")}) format("woff2"); }`;

const enDonnee = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const icone = svgLogo({ ...LOGO_PETIT, claire: ENCRE_CLAIRE, titre: fr.site.name });
writeFileSync("public/icon.svg", icone);

const navigateur = await lancerEdge();
const page = await navigateur.newPage({ deviceScaleFactor: 1 });

// The home-screen icon: the faithful drawing, about 70 % of the side, on the site's background.
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(
  `<body style="margin:0;background:${FOND}"><img src="${enDonnee(svgLogo(LOGO_FIDELE))}" width="128" height="128" style="position:absolute;left:26px;top:26px"></body>`,
);
await page.screenshot({ path: "public/apple-touch-icon.png" });

// The share image of the waiting page: the question and the wordmark, the logo at the right.
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${POLICES}
  body { margin: 0; width: 1200px; height: 630px; background: ${FOND}; color: ${ENCRE}; position: relative; overflow: hidden; }
  .marque { position: absolute; left: 88px; top: 80px; font: 600 30px Titre; letter-spacing: 0.22em; text-transform: uppercase; }
  .etat { position: absolute; left: 88px; top: 250px; font: 600 22px Texte; letter-spacing: 0.12em; text-transform: uppercase; color: ${DISCRET}; }
  h1 { position: absolute; left: 84px; top: 292px; width: 640px; margin: 0; font: 600 76px/1.08 Titre; letter-spacing: 0.01em; }
  img { position: absolute; right: 88px; top: 135px; width: 360px; height: 360px; }
</style></head><body>
  <div class="marque">${fr.site.name}</div>
  <div class="etat">${fr.attente.title}</div>
  <h1>${fr.site.question}</h1>
  <img src="${enDonnee(svgLogo(LOGO_FIDELE))}" alt="">
</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/partage.png" });

const dossier = option("planche");
if (dossier !== undefined) {
  mkdirSync(dossier, { recursive: true });
  // The two rows of tabs are drawn apart (one colour scheme each), in the system's temporary folder, then deleted.
  const brouillons = path.join(tmpdir(), "sovermap-icones");
  mkdirSync(brouillons, { recursive: true });
  const avant = execFileSync("git", ["show", "main:public/icon.svg"], { encoding: "utf8" });
  // Each icon drawn at its true size on a canvas, then each pixel enlarged eight times (no smoothing).
  const tuiles = (svg: string) =>
    [16, 32]
      .map(
        (taille) =>
          `<figure><canvas data-svg="${enDonnee(svg)}" data-taille="${taille}"></canvas><figcaption>${taille} px</figcaption></figure>`,
      )
      .join("");
  const rangee = (titre: string, onglet: string, couleurTexte: string) => `
    <section style="background:${onglet};color:${couleurTexte}"><h2>${titre}</h2>
      <div class="paire"><div><p>Avant</p>${tuiles(avant)}</div><div><p>Après</p>${tuiles(icone)}</div></div></section>`;
  for (const schema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: schema });
    await page.setViewportSize({ width: 1100, height: 420 });
    await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${POLICES}
      body { margin: 0; font: 500 18px Texte; }
      section { padding: 20px 28px; height: 420px; box-sizing: border-box; }
      h2 { font: 600 22px Titre; margin: 0 0 12px; }
      .paire { display: flex; gap: 48px; } .paire > div { display: flex; gap: 20px; align-items: flex-end; }
      p { margin: 0 8px 0 0; } figure { margin: 0; text-align: center; } canvas { image-rendering: pixelated; display: block; }
    </style></head><body>${
      schema === "light"
        ? rangee("Onglet clair (le navigateur en thème clair)", "#F3F3F3", ENCRE)
        : rangee("Onglet sombre (le navigateur en thème sombre)", "#202124", "#E8EAED")
    }</body></html>`);
    await page.evaluate(AIDE_TSX);
    await page.evaluate(async () => {
      for (const c of Array.from(document.querySelectorAll("canvas"))) {
        const taille = Number(c.dataset["taille"]);
        const image = new Image(taille, taille);
        image.src = c.dataset["svg"] ?? "";
        await image.decode();
        const petit = document.createElement("canvas");
        petit.width = taille;
        petit.height = taille;
        petit.getContext("2d")?.drawImage(image, 0, 0, taille, taille);
        const loupe = 8;
        c.width = taille * loupe;
        c.height = taille * loupe;
        const ctx = c.getContext("2d");
        if (ctx === null) continue;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(petit, 0, 0, taille * loupe, taille * loupe);
      }
    });
    await page.screenshot({ path: path.join(brouillons, `onglets-${schema === "light" ? "clair" : "sombre"}.png`) });
  }
  await page.emulateMedia({ colorScheme: "light" });
  const image = (fichier: string) => `data:image/png;base64,${readFileSync(fichier).toString("base64")}`;
  await page.setViewportSize({ width: 1100, height: 1440 });
  await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${POLICES}
    body { margin: 0; padding: 24px; background: #FFFFFF; font: 500 18px Texte; color: ${ENCRE}; }
    h1 { font: 600 26px Titre; margin: 0 0 16px; } h2 { font: 600 20px Titre; margin: 24px 0 10px; }
    img.ligne { display: block; width: 1052px; border: 1px solid #C8CCD0; }
    .bas { display: flex; gap: 32px; align-items: flex-start; }
  </style></head><body>
    <h1>Logo et icônes · avant et après (chaque pixel des onglets agrandi 8 fois)</h1>
    <img class="ligne" src="${image(path.join(brouillons, "onglets-clair.png"))}" alt="">
    <img class="ligne" src="${image(path.join(brouillons, "onglets-sombre.png"))}" alt="">
    <div class="bas">
      <div><h2>Écran d'accueil (180 × 180)</h2><img src="${image("public/apple-touch-icon.png")}" width="180" height="180" alt=""></div>
      <div><h2>Image de partage (1200 × 630, ici à moitié)</h2><img src="${image("public/partage.png")}" width="600" height="315" alt=""></div>
    </div>
  </body></html>`);
  await page.screenshot({ path: path.join(dossier, "planche-logo.png"), fullPage: true });
  rmSync(brouillons, { recursive: true, force: true });
}
await navigateur.close();
console.log(
  "icones : public/icon.svg, public/apple-touch-icon.png, public/partage.png" +
    (dossier ? ` ; planche dans ${dossier}` : ""),
);
