import { existsSync } from "node:fs";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { describe, expect, it } from "vitest";
import { ADRESSES_PORTE, CHEMIN_FERME, reecrituresPorte } from "../lib/porte";
import { indexingOpen, sitePublic } from "../lib/site";

// The rewrite of a closed door, matched the way Next.js matches a rewrite: its own path matcher, in strict mode
// (next/dist/server/lib/router-utils/filesystem.js). The e2e tests and probe:prod check the real answers.
const [regle] = reecrituresPorte({});
const correspond = regle === undefined ? () => false : getPathMatch(regle.source, { strict: true, removeUnnamedParams: true });
const fermee = (chemin: string) => correspond(chemin) !== false;

describe("the production door (brief of chantier 2, A.6)", () => {
  it("opens only on the exact value SITE_PUBLIC=open", () => {
    expect(sitePublic({ SITE_PUBLIC: "open" })).toBe(true);
    for (const valeur of [undefined, "", "OPEN", "open ", " open", "1", "true", "yes", "closed", "ouvert"]) {
      expect(sitePublic({ SITE_PUBLIC: valeur }), String(valeur)).toBe(false);
    }
  });

  it("keeps search engines out unless the door is open AND SITE_INDEXING=open", () => {
    expect(indexingOpen({ SITE_PUBLIC: "open", SITE_INDEXING: "open" })).toBe(true);
    expect(indexingOpen({ SITE_INDEXING: "open" })).toBe(false);
    expect(indexingOpen({ SITE_PUBLIC: "closed", SITE_INDEXING: "open" })).toBe(false);
    expect(indexingOpen({ SITE_PUBLIC: "open", SITE_INDEXING: "closed" })).toBe(false);
    expect(indexingOpen({})).toBe(false);
  });

  it("rewrites nothing when open, and one rule, to a path no route serves, when closed", () => {
    expect(reecrituresPorte({ SITE_PUBLIC: "open" })).toEqual([]);
    expect(reecrituresPorte({ SITE_PUBLIC: "" })).toHaveLength(1);
    expect(regle?.destination).toBe(CHEMIN_FERME);
    // A folder whose name starts with « _ » is private in the App Router: it never becomes a route.
    expect(CHEMIN_FERME.startsWith("/_")).toBe(true);
    expect(existsSync(`app${CHEMIN_FERME}`)).toBe(false);
  });

  it("lets the waiting page's addresses through", () => {
    for (const chemin of [
      "/",
      "/robots.txt",
      "/sitemap.xml",
      "/icon.svg",
      "/licenses/manrope-OFL.txt",
      "/licenses/chakra-petch-OFL.txt",
      "/_next/static/chunks/0dwdep2qwupfl.css",
      "/_next/static/media/manrope_latin_wght_normal.woff2",
      "/_next/webpack-hmr",
    ]) {
      expect(fermee(chemin), chemin).toBe(false);
    }
  });

  it("closes every other address", () => {
    for (const chemin of [
      "/globe/monde.json",
      "/globe/repli.svg",
      "/site/www.impots.gouv.fr",
      "/ministeres",
      "/api/etat",
      "/_next/image",
      "/_next/static",
      "/_next/staticx/a.js",
      "/_next/data/x.json",
      "/robots.txt.bak",
      "/robots.txtx",
      "/sitemap-0.xml",
      "/sitemaps/index.xml",
      "/icon.svg.map",
      "/licenses/a/b.txt",
      "/licenses/manrope-OFL.txt.gz",
      "/donnees/etat.json",
      "/recherche/index.json",
      "/opengraph-image",
      "/favicon.ico",
      "/_porte-fermee",
    ]) {
      expect(fermee(chemin), chemin).toBe(true);
    }
  });

  it("agrees with the addresses that probe:prod and the e2e tests ask", () => {
    for (const adresse of ADRESSES_PORTE) {
      const chemin = adresse.chemin.split("?")[0] ?? adresse.chemin;
      expect(fermee(chemin), adresse.chemin).toBe(adresse.attendu === "introuvable");
    }
  });
});
