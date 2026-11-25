// npx tsx scripts/design/partage.ts
// Draws the share images of the full site (D.7, proposal A « la question », point 11), one per kind of page, with Edge
// and no other tool: public/partage/<type>.png, 1200 × 630, on the site's background: the wordmark, the kind of page in
// capitals, its question in large type, one sentence (texts from lib/i18n/fr.ts), the logo at the right. Fixed images,
// made once and served as files: no function, nothing read per visit. The waiting page keeps public/partage.png
// (scripts/design/icones.ts).
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { LOGO_FIDELE, svgLogo } from "../../lib/design/logo";
import { JETONS } from "../../lib/design/tokens";
import { fr } from "../../lib/i18n/fr";
import { TYPES_PARTAGE } from "../../lib/referencement";
import { lancerEdge } from "./commun";

const { fond: FOND, encre: ENCRE, discret: DISCRET } = JETONS;
const police = (fichier: string) =>
  `data:font/woff2;base64,${readFileSync(path.join("app", "fonts", fichier)).toString("base64")}`;
const POLICES = `
@font-face { font-family: Titre; font-weight: 600; src: url(${police("chakra-petch-latin-600-normal.woff2")}) format("woff2"); }
@font-face { font-family: Texte; font-weight: 200 800; src: url(${police("manrope-latin-wght-normal.woff2")}) format("woff2"); }`;
const LOGO = `data:image/svg+xml;base64,${Buffer.from(svgLogo(LOGO_FIDELE)).toString("base64")}`;

mkdirSync(path.join("public", "partage"), { recursive: true });
const navigateur = await lancerEdge();
try {
  const page = await navigateur.newPage({ deviceScaleFactor: 1 });
  await page.setViewportSize({ width: 1200, height: 630 });
  for (const type of TYPES_PARTAGE) {
    const t = fr.partage[type];
    // A long question (a country's) is set smaller, so that it keeps to three lines at most.
    const taille = t.question.length > 32 ? 58 : 70;
    await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${POLICES}
      body { margin: 0; width: 1200px; height: 630px; background: ${FOND}; color: ${ENCRE}; position: relative; overflow: hidden; }
      .marque { position: absolute; left: 88px; top: 72px; font: 600 28px Titre; letter-spacing: 0.22em; text-transform: uppercase; }
      .bloc { position: absolute; left: 88px; top: 196px; width: 720px; }
      .etiquette { margin: 0 0 18px; font: 600 21px Texte; letter-spacing: 0.12em; text-transform: uppercase; color: ${DISCRET}; }
      h1 { margin: 0; font: 600 ${taille}px/1.08 Titre; letter-spacing: 0.01em; }
      .phrase { margin: 26px 0 0; width: 660px; font: 500 25px/1.42 Texte; color: ${DISCRET}; }
      img { position: absolute; right: 88px; top: 165px; width: 270px; height: 270px; }
    </style></head><body>
      <div class="marque">${fr.site.name}</div>
      <div class="bloc"><p class="etiquette">${t.etiquette}</p><h1>${t.question}</h1><p class="phrase">${t.phrase}</p></div>
      <img src="${LOGO}" alt="">
    </body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join("public", "partage", `${type}.png`) });
  }
} finally {
  await navigateur.close();
}
console.log(`partage : ${TYPES_PARTAGE.length} images dans public/partage/`);
