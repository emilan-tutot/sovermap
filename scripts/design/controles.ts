// D.4 controls of pages of the site (DESIGN.md §14): horizontal scrolling at 9 widths from 360 to 1920 px, axe (serious
// or critical violations, at 390 and 1707 px), console errors and requests to another domain, in Edge, Firefox and
// WebKit. A page given as <chemin>#<bouton> is measured after a click on that button (e.g. /site/x#Expert).
//   npx tsx scripts/design/controles.ts <chemin>... [--attente 700]
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox, webkit, type Browser, type Page } from "@playwright/test";
import { ORIGINE, adresse, ecrireMesures, option, positionnels } from "./commun";

const LARGEURS = [360, 390, 412, 768, 1024, 1280, 1440, 1707, 1920];
const PAGES = positionnels().length > 0 ? positionnels() : ["/"];
const ATTENTE = Number(option("attente") ?? 700);
const NAVIGATEURS: [string, () => Promise<Browser>][] = [
  ["Edge", () => chromium.launch({ channel: "msedge" })],
  ["Firefox", () => firefox.launch({ channel: "moz-firefox" })],
  ["WebKit", () => webkit.launch()],
];

type Resultat = { navigateur: string; page: string; debordements: number[]; axe: { largeur: number; graves: { id: string; impact: string; noeuds: number }[] }[]; console: string[]; etrangeres: string[] };
const resultats: Resultat[] = [];

async function ouvrir(page: Page, chemin: string) {
  const [lien = "/", bouton] = chemin.split("#");
  await page.goto(adresse(lien), { waitUntil: "load" });
  if (bouton) await page.getByRole("button", { name: bouton }).click();
  // Panels and layers unfold: measure once they have settled.
  await page.waitForTimeout(ATTENTE);
}

for (const [nom, lancer] of NAVIGATEURS) {
  const navigateur = await lancer();
  for (const chemin of PAGES) {
    const ctx = await navigateur.newContext({ viewport: { width: 1707, height: 799 } });
    const page = await ctx.newPage();
    const r: Resultat = { navigateur: nom, page: chemin, debordements: [], axe: [], console: [], etrangeres: [] };
    page.on("console", (m) => {
      // The browser reports the status of the page itself (a 404 page answers 404): not an error of the page.
      const statutDeLaPage = m.text().startsWith("Failed to load resource") && m.location().url === page.url();
      if (m.type() === "error" && !statutDeLaPage) r.console.push(m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => r.console.push(String(e).slice(0, 200)));
    page.on("request", (q) => {
      if (!q.url().startsWith(ORIGINE) && !q.url().startsWith("data:") && !q.url().startsWith("blob:")) r.etrangeres.push(q.url());
    });
    for (const largeur of LARGEURS) {
      await page.setViewportSize({ width: largeur, height: largeur === 1707 ? 799 : largeur < 800 ? 844 : 900 });
      await ouvrir(page, chemin);
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) r.debordements.push(largeur);
      if (largeur === 390 || largeur === 1707) {
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        r.axe.push({
          largeur,
          graves: axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => ({ id: v.id, impact: v.impact ?? "", noeuds: v.nodes.length })),
        });
      }
    }
    resultats.push(r);
    const graves = r.axe.flatMap((a) => a.graves.map((g) => `${a.largeur}:${g.id}`));
    console.log(`${nom.padEnd(8)} ${chemin.padEnd(44)} débordement ${r.debordements.length ? r.debordements.join(",") : "aucun"} ; axe ${graves.length ? graves.join(" ") : "0"} ; console ${r.console.length} ; étrangères ${r.etrangeres.length}`);
    await ctx.close();
  }
  await navigateur.close();
}
const bilan = {
  pages: resultats.length,
  debordements: resultats.filter((r) => r.debordements.length).length,
  axe: resultats.reduce((n, r) => n + r.axe.reduce((m, a) => m + a.graves.length, 0), 0),
  console: resultats.reduce((n, r) => n + r.console.length, 0),
  etrangeres: resultats.reduce((n, r) => n + r.etrangeres.length, 0),
};
ecrireMesures("controles.json", { bilan, resultats });
console.log(`Bilan : ${bilan.pages} page(s) × navigateur ; débordements ${bilan.debordements} ; axe ${bilan.axe} ; console ${bilan.console} ; étrangères ${bilan.etrangeres}`);
process.exit(bilan.debordements + bilan.axe + bilan.console + bilan.etrangeres === 0 ? 0 : 1);
