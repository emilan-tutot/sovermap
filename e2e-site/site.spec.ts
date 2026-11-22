import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { dateFr } from "../lib/i18n/format";
import { fr } from "../lib/i18n/fr";

// Every kind of page of the full site (D.8), door open, on the made-up published state of scripts/donnees-essai.ts:
// its status, its title, no request to another domain, no console error, no serious or critical axe violation, no
// horizontal scroll, on a computer and a Pixel 7.
const PAGES: [string, string][] = [
  ["/", fr.site.question],
  ["/radiographie/service.example", "service.example"],
  ["/radiographie/nuage.example?mode=expert", "nuage.example"],
  ["/societes", fr.societes.titre],
  ["/societes/hebergeur-fr", "Hébergeur Exemple"],
  ["/ministeres", fr.ministeres.titre],
  ["/ministeres/ministere-de-l-exemple", "Ministère de l’Exemple"],
  ["/journal", fr.journal.titre],
  ["/journal/2026-11-21", fr.journal.jour("21/11/2026")],
  ["/pays/etats-unis", "États-Unis"],
  ["/qualite", fr.qualite.titre],
];

/** Requests to another domain and console errors, from the page's opening. */
function surveiller(page: Page, origine: string) {
  const etrangeres: string[] = [];
  const erreurs: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.origin !== origine) etrangeres.push(url.origin);
  });
  page.on("console", (m) => {
    if (m.type() === "error") erreurs.push(m.text());
  });
  return { etrangeres, erreurs };
}

for (const [chemin, titre] of PAGES) {
  test(`site complet : ${chemin}`, async ({ page, baseURL }) => {
    const { etrangeres, erreurs } = surveiller(page, new URL(baseURL ?? "http://127.0.0.1:3100").origin);
    const reponse = await page.goto(chemin);
    expect(reponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(titre);
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(
      resultats.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
    ).toEqual([]);
    const [largeur, visible] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(largeur).toBeLessThanOrEqual(visible ?? 0);
    expect(etrangeres).toEqual([]);
    expect(erreurs).toEqual([]);
  });
}

test("site complet : un domaine que l'état du jour ne publie pas répond 404", async ({ page }) => {
  const reponse = await page.goto("/radiographie/inconnu.example");
  expect(reponse?.status()).toBe(404);
});

test("site complet : le curseur du temps montre chaque jour publié, au clavier", async ({ page }) => {
  await page.goto("/");
  const curseur = page.getByLabel(fr.atlas.temps.libelle);
  const zone = page.locator(".curseur-temps");
  await expect(curseur).toHaveAttribute("aria-valuetext", dateFr("2026-11-21"));
  await expect(zone).toContainText(fr.atlas.temps.reglesChangees("0.2.1"));
  await curseur.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(curseur).toHaveAttribute("aria-valuetext", dateFr("2026-11-20"));
  await expect(zone.locator("p[aria-live]")).toContainText(dateFr("2026-11-20"));
  await expect(zone).not.toContainText(fr.atlas.temps.reglesChangees("0.2.1"));
});

test("site complet : la recherche charge son index une fois et trouve un domaine par le début d'un mot", async ({
  page,
}) => {
  let chargements = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/recherche/index.json")) chargements += 1;
  });
  await page.goto("/");
  const champ = page.getByLabel(fr.recherche.libelle);
  await champ.fill("serv");
  await expect(page.locator(".recherche-resultats")).toContainText("service.example");
  await champ.fill("nuage");
  await expect(page.locator(".recherche-resultats")).toContainText("nuage.example");
  expect(chargements).toBe(1);
});
