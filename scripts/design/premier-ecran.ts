// First screen of a page (owner's corrections a, b, c, ARRÊT 2): the elements named on the command line must stand
// entirely in the first screen, at 1707 × 799 and 1920 × 1080 on a computer and at 360 × 732 on a phone, without
// horizontal scrolling. With the globe: the whole disc (with its halo) and « Recentrer » too, and its labels without
// overlap. --ordre-telephone a,b,c: on a phone, these elements stacked in that order (« globe » is the scene);
// --hors-telephone a,b: not required in the first screen of a phone. The captures go to the temporary folder.
//   npx tsx scripts/design/premier-ecran.ts <chemin> <nom>=<sélecteur>... [--ordre-telephone a,b] [--hors-telephone a]
//   e.g. npx tsx scripts/design/premier-ecran.ts / question=.titre-page chapo=.chapo
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { devices } from "@playwright/test";
import { AIDE_TSX, adresse, aLeGlobe, attendreGlobe, ecrireMesures, lancerEdge, option, positionnels } from "./commun";

const [chemin = "/", ...elements] = positionnels();
const ORDRE = option("ordre-telephone")?.split(",") ?? [];
const HORS_TELEPHONE = new Set(option("hors-telephone")?.split(",") ?? []);
const dossier = path.join(tmpdir(), "sovermap-captures", "premier-ecran");
mkdirSync(dossier, { recursive: true });
const FORMATS = [
  ["ordinateur-1707", { viewport: { width: 1707, height: 799 }, deviceScaleFactor: 1.5 }],
  ["ordinateur-1920", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }],
  ["telephone-360", { ...devices["Pixel 9"] }],
] as const;

type Boite = { haut: number; bas: number };
const navigateur = await lancerEdge();
const resultats: Record<string, unknown>[] = [];
let echecs = 0;
for (const [format, contexte] of FORMATS) {
  const tel = format.startsWith("telephone");
  const ctx = await navigateur.newContext(contexte);
  await ctx.addInitScript({ content: AIDE_TSX });
  const page = await ctx.newPage();
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") erreurs.push(m.text());
  });
  await page.goto(adresse(chemin), { waitUntil: "networkidle" });
  const globe = await aLeGlobe(page);
  if (globe) {
    await attendreGlobe(page);
    await page.waitForTimeout(4200);
  } else await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(dossier, `${format}.png`) });
  const m = await page.evaluate((liste) => {
    const boite = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { haut: Math.round(r.top), bas: Math.round(r.bottom) };
    };
    const boites: Record<string, { haut: number; bas: number } | null> = {};
    for (const e of liste) {
      const [nom = "", selecteur = ""] = e.split(/=(.*)/s);
      boites[nom] = boite(document.querySelector(selecteur));
    }
    const etiquettes = [...document.querySelectorAll<HTMLElement>(".etiquette-pays")].filter((e) => Number(getComputedStyle(e).opacity) > 0.5).map((e) => ({ code: e.dataset["code"] ?? "", r: e.getBoundingClientRect() }));
    const chevauchements: string[] = [];
    for (let i = 0; i < etiquettes.length; i += 1)
      for (let j = i + 1; j < etiquettes.length; j += 1) {
        const a = etiquettes[i];
        const b = etiquettes[j];
        if (a && b && a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom) chevauchements.push(`${a.code}/${b.code}`);
      }
    const outils = [...document.querySelectorAll(".scene-outils .bouton")].map((b) => b.getBoundingClientRect());
    return {
      hauteur: innerHeight,
      defilementHorizontal: document.documentElement.scrollWidth > innerWidth,
      boites,
      scene: boite(document.querySelector(".scene")),
      recentrer: outils.length ? { haut: Math.round(Math.min(...outils.map((b) => b.top))), bas: Math.round(Math.max(...outils.map((b) => b.bottom))) } : null,
      etiquettes: etiquettes.length,
      chevauchements,
    };
  }, elements);
  const dans = (b: Boite | null | undefined) => b !== null && b !== undefined && b.haut >= 0 && b.bas <= m.hauteur;
  const controles: Record<string, boolean> = {};
  for (const [nom, b] of Object.entries(m.boites)) controles[nom] = tel && HORS_TELEPHONE.has(nom) ? true : dans(b);
  if (globe) {
    // The globe is a disc of 0.89 × the height of the scene (camera at 3.7, fov 35°), plus its halo (× 1.06).
    const s = m.scene;
    const marge = s ? ((s.bas - s.haut) * (1 - 0.89 * 1.06)) / 2 : 0;
    controles["globe entier"] = s !== null && dans({ haut: s.haut + marge, bas: s.bas - marge });
    controles["Recentrer"] = dans(m.recentrer);
    controles["étiquettes sans chevauchement"] = m.chevauchements.length === 0;
  }
  if (tel && ORDRE.length > 1) {
    const b = (nom: string) => (nom === "globe" ? m.scene : m.boites[nom]);
    controles[`ordre ${ORDRE.join(", ")}`] = ORDRE.slice(1).every((nom, i) => {
      const avant = b(ORDRE[i] ?? "");
      const apres = b(nom);
      return avant !== null && avant !== undefined && apres !== null && apres !== undefined && apres.haut >= avant.bas;
    });
  }
  controles["sans défilement horizontal"] = !m.defilementHorizontal;
  const ok = Object.values(controles).every(Boolean);
  if (!ok) echecs += 1;
  console.log(`${ok ? "ok   " : "ÉCHEC"} ${format} : ${Object.entries(controles).filter(([, v]) => !v).map(([k]) => k).join(", ") || "tout tient"}${globe ? ` ; étiquettes ${m.etiquettes}${m.chevauchements.length ? ` (chevauchent : ${m.chevauchements.join(" ")})` : ""}` : ""}`);
  if (erreurs.length) console.log(`  erreurs de console : ${erreurs.join(" | ")}`);
  resultats.push({ format, ...m, controles, ok, erreurs });
  await ctx.close();
}
await navigateur.close();
ecrireMesures("premier-ecran.json", { chemin, captures: dossier, resultats });
console.log(echecs === 0 ? "premier écran : tout tient" : `premier écran : ${echecs} échec(s)`);
process.exit(echecs === 0 ? 0 : 1);
