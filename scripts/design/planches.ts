// Image boards for the design points (DESIGN.md §14): for each device (computer 1707 × 799 CSS px at scale 1.5, the
// owner's screen; phone, Pixel 9 profile), the screens of one or more directions side by side, optionally headed by
// large flat swatches of their backgrounds. The screens are described in a JSON file, so that the same tool serves every
// chantier. Captures are kept in a folder and can be reused: a board can join screens taken from two builds (run once
// per build with --ecrans, then once with --composer).
//   npx tsx scripts/design/planches.ts <description.json> <dossier> [--ecrans 0,1] [--composer]
// Description: { "titre": "…", "origine": "http://localhost:3100", "aplats": [{ "nom": "…", "couleur": "#D7DADD" }],
//   "lignes": [{ "nom": "…", "prefixe": "/" }], "ecrans": [{ "nom": "…", "chemin": "", "absolu": false,
//   "bouton": "Expert", "attente": 1500, "pleinePage": false }] }
// « pleinePage »: the whole page, not only its first screen (a long page whose proposals differ below the fold).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, devices } from "@playwright/test";

type Ecran = { nom: string; chemin: string; absolu?: boolean; bouton?: string; attente?: number; pleinePage?: boolean };
type Description = { titre: string; origine: string; aplats?: { nom: string; couleur: string }[]; lignes: { nom: string; prefixe: string }[]; ecrans: Ecran[] };

const [fichierDescription = "", dossier = "planches", ...options] = process.argv.slice(2);
const d = JSON.parse(readFileSync(fichierDescription, "utf8")) as Description;
const composerSeulement = options.includes("--composer");
const iEcrans = options.indexOf("--ecrans");
const choix = iEcrans >= 0 ? (options[iEcrans + 1] ?? "").split(",").map(Number) : d.ecrans.map((_, i) => i);
const images = path.resolve(dossier, "ecrans");
mkdirSync(images, { recursive: true });

const APPAREILS = [
  { nom: "ordinateur", options: { viewport: { width: 1707, height: 799 }, deviceScaleFactor: 1.5 }, largeur: 640, legende: "ordinateur, 1707 × 799 px CSS, échelle 1,5" },
  { nom: "telephone", options: { ...devices["Pixel 9"] }, largeur: 300, legende: "téléphone, profil Pixel 9 (360 × 732 px CSS)" },
] as const;
const fichier = (appareil: string, ligne: number, ecran: number) => path.join(images, `${appareil}-${ligne}-${ecran}.png`);

const navigateur = await chromium.launch({ channel: "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
if (!composerSeulement) {
  for (const a of APPAREILS) {
    for (const [l, ligne] of d.lignes.entries()) {
      for (const i of choix) {
        const e = d.ecrans[i];
        if (!e) continue;
        const ctx = await navigateur.newContext(a.options);
        const page = await ctx.newPage();
        const adresse = `${d.origine}${e.absolu ? "" : ligne.prefixe}${e.chemin}`;
        await page.goto(adresse, { waitUntil: "load" });
        if (e.bouton) await page.getByRole("button", { name: e.bouton }).click();
        await page.waitForTimeout(e.attente ?? 1500);
        await page.screenshot({ path: fichier(a.nom, l, i), fullPage: e.pleinePage ?? false });
        await ctx.close();
      }
    }
  }
}
// With --ecrans the run only captures (a board joining two builds is composed later, with --composer).
if (iEcrans >= 0 && !composerSeulement) {
  console.log(`captures gardées dans ${images}`);
  await navigateur.close();
  process.exit(0);
}
for (const a of APPAREILS) {
  const manque = d.lignes.flatMap((_, l) => d.ecrans.map((__, i) => fichier(a.nom, l, i))).filter((f) => !existsSync(f));
  if (manque.length > 0) throw new Error(`captures manquantes : ${manque.join(", ")}`);
  const aplats = d.aplats?.length
    ? `<div class="aplats">${d.aplats.map((p) => `<figure><div class="aplat" style="background:${p.couleur}"></div><figcaption><b>${p.nom}</b> · ${p.couleur}</figcaption></figure>`).join("")}</div>`
    : "";
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:#d9d9d6;font:15px/1.3 system-ui,sans-serif;color:#17191c}
    h1{font-size:20px;margin:0 0 16px}
    table{border-collapse:separate;border-spacing:12px 10px}
    th{text-align:left;font-weight:600;font-size:14px;padding:0 0 2px}
    th.l{width:150px;vertical-align:middle}
    img{display:block;width:${a.largeur}px;border:1px solid #9a9a96}
    .aplats{display:flex;gap:24px;margin:0 12px 28px}
    .aplats figure{margin:0;flex:1}
    .aplat{height:${a.nom === "ordinateur" ? 320 : 200}px;border:1px solid #9a9a96}
    figcaption{margin-top:8px;font-size:${a.nom === "ordinateur" ? 18 : 14}px}
  </style><h1>${d.titre} · ${a.legende}</h1>${aplats}
  <table><tr><th class="l"></th>${d.ecrans.map((e) => `<th>${e.nom}</th>`).join("")}</tr>
  ${d.lignes.map((ligne, l) => `<tr><th class="l">${ligne.nom}</th>${d.ecrans.map((_, i) => `<td><img src="${pathToFileURL(fichier(a.nom, l, i)).href}"></td>`).join("")}</tr>`).join("")}
  </table></html>`;
  const page = path.join(images, `${a.nom}.html`);
  writeFileSync(page, html, "utf8");
  const ctx = await navigateur.newContext({ viewport: { width: 240 + d.ecrans.length * (a.largeur + 16), height: 400 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(page).href, { waitUntil: "load" });
  const cible = path.resolve(dossier, `planche-${a.nom}.png`);
  await p.screenshot({ path: cible, fullPage: true });
  console.log(`planche : ${cible}`);
  await ctx.close();
}
await navigateur.close();
