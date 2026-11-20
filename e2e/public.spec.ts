import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { fr } from "../lib/i18n/fr";

// What a visitor sees: the waiting page, closed to indexing, accessible, and talking to no other domain.
test("la page d'attente s'affiche sans tiers, sans erreur et sans violation d'accessibilité", async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? "http://127.0.0.1:3100").origin;
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== origin) foreign.push(url.origin);
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(fr.site.question);
  await expect(page.getByRole("link", { name: fr.coque.logo })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => v.id)).toEqual([]);

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
});

test("une page inconnue répond 404", async ({ page }) => {
  const response = await page.goto("/page-qui-n-existe-pas");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("robots.txt interdit tout et le sitemap est vide tant que le site est fermé", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toMatch(/Disallow:\s*\/\s*$/m);
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("<url>");
});
