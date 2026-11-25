// Tests of the data pages' shared cache (D.4): nothing behind a closed door; behind an open door, a day for a record and
// an hour for an aggregated page, on Vercel's CDN only.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CACHE_AGREGAT, CACHE_FICHE, enTetesDeCache } from "@/lib/cache";
import { PAGES_DE_TEXTE } from "@/lib/i18n/fr-textes";

const valeurDe = (regles: ReturnType<typeof enTetesDeCache>, source: string) =>
  regles.find((r) => r.source === source)?.headers;

describe("the data pages' shared cache (D.4)", () => {
  it("adds nothing behind a closed door", () => {
    expect(enTetesDeCache({})).toEqual([]);
    expect(enTetesDeCache({ SITE_PUBLIC: "closed" })).toEqual([]);
  });

  it("keeps a record a day and an aggregated page an hour, through Vercel's CDN header only", () => {
    const regles = enTetesDeCache({ SITE_PUBLIC: "open" });
    expect(valeurDe(regles, "/radiographie/:domaine")).toEqual([
      { key: "Vercel-CDN-Cache-Control", value: CACHE_FICHE },
    ]);
    expect(valeurDe(regles, "/journal/:date(\\d{4}-\\d{2}-\\d{2})")).toEqual([
      { key: "Vercel-CDN-Cache-Control", value: CACHE_FICHE },
    ]);
    for (const source of ["/", "/societes/:cle", "/ministeres/:slug", "/pays/:slug", "/qualite"]) {
      expect(valeurDe(regles, source)).toEqual([{ key: "Vercel-CDN-Cache-Control", value: CACHE_AGREGAT }]);
    }
    expect(regles.flatMap((r) => r.headers.map((h) => h.key))).not.toContain("Cache-Control");
    expect(CACHE_FICHE).toBe("max-age=86400, stale-while-revalidate=604800");
    expect(CACHE_AGREGAT).toBe("max-age=3600, stale-while-revalidate=86400");
  });

  it("gives every page of app/ a rule, and leaves every route its own Cache-Control (the review of PR 22)", () => {
    const regles = enTetesDeCache({ SITE_PUBLIC: "open" });
    // A rule's source without its parameters' constraints (« /journal/:date(…) » reads « /journal/:date »).
    const sources = regles.map((r) => r.source.replace(/\(.*?\)(?=\/|$)/g, ""));
    const fichiers = readdirSync("app", { recursive: true, encoding: "utf8" }).map((f) => f.split(path.sep).join("/"));
    const adresse = (fichier: string) =>
      `/${fichier.split("/").slice(0, -1).join("/")}`.replace(/\[(\w+)\]/g, ":$1");
    const pages = fichiers.filter((f) => /(^|\/)page\.tsx$/.test(f)).map(adresse);
    expect(pages.length).toBeGreaterThan(25);
    for (const page of pages) expect(sources, page).toContain(page === "" ? "/" : page);
    // Each route answers with its own Cache-Control (« no-store » when it fails), or is a file made at build time; a rule
    // would override it, a failure included.
    const routes = fichiers.filter((f) => /(^|\/)route\.ts$/.test(f));
    expect(routes.length).toBeGreaterThan(3);
    for (const route of routes) {
      const code = readFileSync(path.join("app", route), "utf8");
      expect(/"Cache-Control"/.test(code) || /dynamic = "force-static"/.test(code), route).toBe(true);
      expect(sources, route).not.toContain(adresse(route));
    }
    // The journal's days by their date only: its feed is not a day.
    const jour = regles.find((r) => r.source.startsWith("/journal/:date"))?.source ?? "";
    const contrainte = new RegExp(`^${/\((.*)\)$/.exec(jour)?.[1] ?? ""}$`);
    expect(contrainte.test("2026-11-24")).toBe(true);
    expect(contrainte.test("flux.xml")).toBe(false);
  });

  it("keeps every text page an hour too: they carry the date of the last collection (the review of PR 22)", () => {
    const regles = enTetesDeCache({ SITE_PUBLIC: "open" });
    for (const page of PAGES_DE_TEXTE) {
      expect(valeurDe(regles, page.chemin), page.chemin).toEqual([
        { key: "Vercel-CDN-Cache-Control", value: CACHE_AGREGAT },
      ]);
    }
  });
});
