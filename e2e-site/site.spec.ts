import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { dateFr } from "../lib/i18n/format";
import { fr } from "../lib/i18n/fr";
import { donneesOuvertes } from "../lib/i18n/fr-donnees";
import { erreur } from "../lib/i18n/fr-erreur";
import { PAGES_DE_TEXTE } from "../lib/i18n/fr-textes";

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
  ["/donnees", donneesOuvertes.titre],
  ...PAGES_DE_TEXTE.map((p): [string, string] => [p.chemin, p.titre]),
];

// The text pages (E.6): their sources, the day of their revision, and the AI notice by the title until the publisher
// has read them again.
for (const p of PAGES_DE_TEXTE) {
  test(`texte : ${p.chemin} donne ses sources et sa date de révision`, async ({ page }) => {
    await page.goto(p.chemin);
    await expect(page.locator(".texte-sources li")).toHaveCount(p.sources.length);
    await expect(page.locator(".texte-revision")).toContainText(dateFr(p.revision));
    await expect(page.locator(".texte-ia")).toHaveCount(p.relu ? 0 : 1);
  });
}

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
  expect(radiographies).toEqual([
    "/radiographie/nuage.example",
    "/radiographie/relais.example",
    "/radiographie/service.example",
  ]);
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

test("clavier : le lien d'évitement d'abord, puis chaque élément atteint montre son focus", async ({ page }) => {
  for (const chemin of ["/", "/radiographie/service.example", "/ministeres", "/societes/hebergeur-fr", "/qualite"]) {
    await page.goto(chemin);
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus"), chemin).toHaveText(fr.coque.evitement);
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const e = document.activeElement;
        if (e === null || e === document.body) return { nom: "body", visible: true };
        const s = getComputedStyle(e);
        return {
          nom: `${e.tagName} ${e.textContent?.trim().slice(0, 40) ?? ""}`,
          visible: s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0,
        };
      });
      expect(focus.visible, `${chemin} : ${focus.nom}`).toBe(true);
    }
  }
});

test("partage : chaque type de page annonce son image, un fichier servi tel quel", async ({ page, request }) => {
  const TYPES: [string, string][] = [
    ["/", "accueil"],
    ["/radiographie/service.example", "radiographie"],
    ["/ministeres/ministere-de-l-exemple", "ministere"],
    ["/societes/hebergeur-fr", "societe"],
    ["/pays/etats-unis", "pays"],
  ];
  for (const [chemin, type] of TYPES) {
    await page.goto(chemin);
    const image = new URL(
      (await page.locator('meta[property="og:image"]').getAttribute("content")) ?? "",
      "relative:/",
    );
    expect(image.protocol, chemin).toMatch(/^https?:$/);
    expect(image.pathname, chemin).toBe(`/partage/${type}.png`);
    const reponse = await request.get(image.pathname);
    expect(reponse.status(), chemin).toBe(200);
    expect(reponse.headers()["content-type"], chemin).toContain("image/png");
  }
});

test("site complet : une page dont les données ne se lisent pas répond une erreur, jamais gardée par le CDN", async ({
  page,
}) => {
  const reponse = await page.goto("/radiographie/panne.example");
  expect(reponse?.status()).toBeGreaterThanOrEqual(500);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(erreur.titre);
});

test("site complet : une Radiographie dont le nom web ne se lit pas répond une erreur, jamais « non déterminé »", async ({
  page,
}) => {
  const reponse = await page.goto("/radiographie/nompanne.example");
  expect(reponse?.status()).toBeGreaterThanOrEqual(500);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(erreur.titre);
});

test("site complet : un domaine que l'état du jour ne publie pas répond 404", async ({ page }) => {
  const reponse = await page.goto("/radiographie/inconnu.example");
  expect(reponse?.status()).toBe(404);
});

test("site complet : un site servi par la filiale américaine d'un groupe français montre ses deux sièges (C2-4)", async ({
  page,
}) => {
  // The retained seat, the farther one, gives the category and the link; both seats are written below it.
  await page.goto("/radiographie/relais.example");
  const pays = fr.radiographie.pays;
  await expect(
    page.getByText(pays.valeur("États-Unis", fr.radiographie.categories["hors d'Europe"])).first(),
  ).toBeVisible();
  await expect(page.getByText(pays.deuxSieges("États-Unis", "France"))).toBeVisible();
  // A company outside Europe whose parent is unknown: no retained seat, so no country, but its category stays.
  await page.goto("/radiographie/bouclier.example");
  const couche = page.locator("#couche-7");
  await expect(couche).toContainText(fr.radiographie.categories["hors d'Europe"]);
  await expect(couche).toContainText(pays.sansMere);
  await expect(couche.locator("a")).toHaveCount(0);
  // The country's page files it under the United States, the farther seat.
  await page.goto("/pays/etats-unis");
  await expect(page.locator("main")).toContainText("Relais Exemple, Inc.");
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
