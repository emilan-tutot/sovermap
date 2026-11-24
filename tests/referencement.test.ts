// Tests of the foundations of indexing (D.7): the robots rule, the sitemaps, the site's structured data, the domains'
// index and the canonical page of a company's list. Made-up values, no network.
import { describe, expect, it } from "vitest";
import { lireIndexDomaines } from "@/lib/donnees/domaines";
import { numeroDePage } from "@/lib/donnees/societes";
import { ADRESSES_PAR_PLAN, indexDesPlans, jsonLdSite, PLAN_VIDE, plan, robotsDe } from "@/lib/referencement";

describe("the robots rule of a page (D.7)", () => {
  it("closes every page until the door and indexing are open, then follows the indexing policy", () => {
    const ferme = {};
    const porteSeule = { SITE_PUBLIC: "open", SITE_INDEXING: "closed" };
    const ouvert = { SITE_PUBLIC: "open", SITE_INDEXING: "open" };
    expect(robotsDe(true, ferme)).toEqual({ index: false, follow: false });
    expect(robotsDe(true, { SITE_INDEXING: "open" })).toEqual({ index: false, follow: false });
    expect(robotsDe(true, porteSeule)).toEqual({ index: false, follow: false });
    expect(robotsDe(true, ouvert)).toEqual({ index: true, follow: true });
    expect(robotsDe(false, ouvert)).toEqual({ index: false, follow: true });
  });
});

describe("the sitemaps (D.7)", () => {
  it("says nothing while closed: an empty sitemap, as the door expects", () => {
    expect(PLAN_VIDE).toContain("<urlset");
    expect(PLAN_VIDE).not.toMatch(/<url>|<sitemap>/);
  });

  it("lists its two sitemaps by their absolute addresses", () => {
    const index = indexDesPlans("https://sovermap.com");
    expect([...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([
      "https://sovermap.com/plans/pages.xml",
      "https://sovermap.com/plans/radiographies.xml",
    ]);
  });

  it("writes each page's absolute address, escaped, with its date only when it is one", () => {
    const xml = plan("https://sovermap.com", [
      { chemin: "/radiographie/a.gouv.fr", date: "2026-11-21" },
      { chemin: "/societes/x?page=2&y=1" },
      { chemin: "/radiographie/b.gouv.fr", date: "hier" },
    ]);
    expect(xml).toContain(
      "<url><loc>https://sovermap.com/radiographie/a.gouv.fr</loc><lastmod>2026-11-21</lastmod></url>",
    );
    expect(xml).toContain("<loc>https://sovermap.com/societes/x?page=2&amp;y=1</loc>");
    expect(xml).toContain("<url><loc>https://sovermap.com/radiographie/b.gouv.fr</loc></url>");
  });

  it("never lists more than 50,000 addresses in one sitemap", () => {
    const adresses = Array.from({ length: ADRESSES_PAR_PLAN + 1 }, (_, i) => ({ chemin: `/radiographie/d${i}.fr` }));
    expect(plan("https://sovermap.com", adresses).match(/<url>/g)?.length).toBe(ADRESSES_PAR_PLAN);
  });
});

describe("the site's structured data (D.7)", () => {
  it("gives the site's name and its home page, as JSON that no « < » can close", () => {
    const texte = jsonLdSite("https://sovermap.com");
    expect(texte).not.toContain("<");
    expect(JSON.parse(texte)).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Sovermap",
      url: "https://sovermap.com/",
    });
  });

  it("names no organization, no publisher and no author while no legal structure exists (point 11, Q4)", () => {
    expect(jsonLdSite("https://sovermap.com")).not.toMatch(/Organization|publisher|author|creator/);
  });
});

describe("the domains' index (D.2, D.7)", () => {
  it("keeps the domains, their perimeter and the day of their last confirmed change, and leaves out what is not one", () => {
    expect(
      lireIndexDomaines({
        domaines: [
          ["a.gouv.fr", 1, "2026-11-21"],
          ["b.fr", 0],
          ["c.fr", 1, "demain"],
          ["D.FR", 1],
          ["e.fr", 2],
          "f.fr",
        ],
      }),
    ).toEqual([
      { domaine: "a.gouv.fr", etat: true, date: "2026-11-21" },
      { domaine: "b.fr", etat: false, date: null },
      { domaine: "c.fr", etat: true, date: null },
    ]);
    expect(lireIndexDomaines({ domaines: "tous" })).toBeNull();
    expect(lireIndexDomaines(null)).toBeNull();
  });
});

describe("the page of a company's list (D.7, canonical address)", () => {
  it("is the one asked when it exists, otherwise the first", () => {
    expect(numeroDePage(450, 2)).toBe(2);
    expect(numeroDePage(450, 3)).toBe(3);
    expect(numeroDePage(450, 4)).toBe(1);
    expect(numeroDePage(450, 0)).toBe(1);
    expect(numeroDePage(450, Number.NaN)).toBe(1);
    expect(numeroDePage(0, 1)).toBe(1);
  });
});
