import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { dateFr } from "../lib/i18n/format";
import { fr } from "../lib/i18n/fr";

// Every kind of page of the full site (D.8), door and indexing open, on the made-up published state of
// scripts/donnees-essai.ts: its status, its title, no request to another domain, no console error, no serious or
// critical axe violation, no horizontal scroll, on a computer and a Pixel 7. And the foundations of indexing (D.7): one
// H1, a title that ends with the site's name, a description, an absolute canonical address without its query, the
// robots rule of the indexing policy, the sitemaps and the site's structured data.
const PAGES: [string, string][] = [
  ["/", fr.site.question],
  ["/radiographie/service.example", "service.example"],
  ["/radiographie/nuage.example?mode=expert", "nuage.example"],
  ["/radiographie/mairie.example", "mairie.example"],
  ["/societes", fr.societes.titre],
  ["/societes/hebergeur-fr", "Hébergeur Exemple"],
  ["/ministeres", fr.ministeres.titre],
  ["/ministeres/ministere-de-l-exemple", "Ministère de l’Exemple"],
  ["/journal", fr.journal.titre],
  ["/journal/2026-11-21", fr.journal.jour("21/11/2026")],
  ["/pays/etats-unis", "États-Unis"],
  ["/qualite", fr.qualite.titre],
];

/** The robots rule of the indexing policy (docs/referencement.md), indexing open. */
const ROBOTS: [string, string][] = [
  ["/", "index, follow"],
  ["/radiographie/service.example", "index, follow"],
  ["/radiographie/mairie.example", "noindex, follow"],
  ["/ministeres/ministere-de-l-exemple", "index, follow"],
  ["/societes/hebergeur-fr", "index, follow"],
  ["/pays/etats-unis", "index, follow"],
  ["/pays/allemagne", "noindex, follow"],
  ["/journal/2026-11-21", "noindex, follow"],
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

/** The paths of a sitemap's addresses, in their order. */
const chemins = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1] ?? "").pathname);

for (const [chemin, titre] of PAGES) {
  test(`site complet : ${chemin}`, async ({ page, baseURL }) => {
    const { etrangeres, erreurs } = surveiller(page, new URL(baseURL ?? "http://127.0.0.1:3100").origin);
    const reponse = await page.goto(chemin);
    expect(reponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(titre);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/ · Sovermap$/);
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(180);
    const canonique = new URL((await page.locator('link[rel="canonical"]').getAttribute("href")) ?? "/", "relative:/");
    expect(canonique.protocol).toMatch(/^https?:$/);
    expect(canonique.pathname).toBe(new URL(chemin, "http://exemple").pathname);
    expect(canonique.search).toBe("");
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

for (const [chemin, regle] of ROBOTS) {
  test(`indexation : ${chemin} en « ${regle} »`, async ({ page }) => {
    await page.goto(chemin);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", regle);
  });
}

test("plans du site : un index de deux sous-plans, qui ne listent que les pages indexables", async ({ request }) => {
  const index = await request.get("/sitemap.xml");
  expect(index.status()).toBe(200);
  const texteIndex = await index.text();
  expect(texteIndex).toContain("<sitemapindex");
  expect(chemins(texteIndex)).toEqual(["/plans/pages.xml", "/plans/radiographies.xml"]);
  const pages = chemins(await (await request.get("/plans/pages.xml")).text());
  expect(pages).toEqual(
    expect.arrayContaining([
      "/",
      "/ministeres",
      "/ministeres/ministere-de-l-exemple",
      "/societes",
      "/societes/hebergeur-fr",
      "/pays/etats-unis",
      "/journal",
      "/qualite",
    ]),
  );
  expect(pages).not.toContain("/pays/allemagne");
  expect(pages.filter((c) => c.startsWith("/journal/") || c.startsWith("/radiographie/"))).toEqual([]);
  const radiographies = chemins(await (await request.get("/plans/radiographies.xml")).text());
  expect(radiographies).toEqual(["/radiographie/nuage.example", "/radiographie/service.example"]);
});

test("accueil : les données structurées WebSite donnent le nom du site et son adresse", async ({ page }) => {
  await page.goto("/");
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const donnees = JSON.parse((await scripts.textContent()) ?? "{}") as Record<string, unknown>;
  expect(donnees["@type"]).toBe("WebSite");
  expect(donnees["name"]).toBe(fr.site.name);
  expect(String(donnees["url"])).toMatch(/^https?:\/\/[^/]+\/$/);
});

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
