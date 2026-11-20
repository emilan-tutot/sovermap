import { existsSync, readFileSync } from "node:fs";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { describe, expect, it } from "vitest";
import { fr } from "../lib/i18n/fr";
import { ADRESSES_PORTE, type Attendu, CHEMIN_FERME, reecrituresPorte } from "../lib/porte";
import { indexingOpen, sitePublic } from "../lib/site";
import { ecartsPorte } from "../scripts/lib/porte-controle";

// The rewrite of a closed door, matched the way Next.js matches a rewrite: its own path matcher, in strict mode
// (next/dist/server/lib/router-utils/filesystem.js). The e2e tests and probe:prod check the real answers.
const [regle] = reecrituresPorte({});
const correspond =
  regle === undefined ? () => false : getPathMatch(regle.source, { strict: true, removeUnnamedParams: true });
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

  it("rewrites nothing when open, and one rule, to a static route that always answers 404, when closed", () => {
    expect(reecrituresPorte({ SITE_PUBLIC: "open" })).toEqual([]);
    expect(reecrituresPorte({ SITE_PUBLIC: "" })).toHaveLength(1);
    expect(regle?.destination).toBe(CHEMIN_FERME);
    // A static route outranks any dynamic segment at the root ([lang], [...slug]); it only calls notFound().
    const page = `app${CHEMIN_FERME}/page.tsx`;
    expect(existsSync(page)).toBe(true);
    expect(readFileSync(page, "utf8")).toMatch(/^\s*notFound\(\);$/m);
    expect(existsSync(`public${CHEMIN_FERME}`)).toBe(false);
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
      "/porte-fermee",
      "/index.rsc",
    ]) {
      expect(fermee(chemin), chemin).toBe(true);
    }
  });

  it("agrees with the addresses that probe:prod and the e2e tests ask", () => {
    for (const adresse of ADRESSES_PORTE) {
      const chemin = adresse.chemin.split("?")[0] ?? adresse.chemin;
      const parLaRegle =
        (adresse.attendu === "introuvable" || adresse.attendu === "refusee") && !adresse.laisseeParLaRegle;
      expect(fermee(chemin), adresse.chemin).toBe(parLaRegle);
    }
  });

  it("checks each answer the way probe:prod does", () => {
    const adresse = (attendu: Attendu) => ({ chemin: "/x", famille: "essai", attendu });
    const reponse = (status: number, contentType: string, texte = "") => ({ status, contentType, texte });
    expect(ecartsPorte(adresse("refusee"), reponse(400, "text/plain", "INVALID_IMAGE_OPTIMIZE_REQUEST"))).toEqual([]);
    expect(ecartsPorte(adresse("refusee"), reponse(404, "text/html", fr.notFound.title))).toEqual([]);
    expect(ecartsPorte(adresse("refusee"), reponse(200, "image/png"))).toHaveLength(2);
    expect(ecartsPorte(adresse("introuvable"), reponse(404, "text/html", `<h1>${fr.notFound.title}</h1>`))).toEqual([]);
    expect(ecartsPorte(adresse("introuvable"), reponse(200, "text/html", "<h1>Atlas</h1>"))).toHaveLength(2);
    expect(ecartsPorte(adresse("robots-ferme"), reponse(200, "text/plain", "User-Agent: *\nDisallow: /\n"))).toEqual(
      [],
    );
    expect(ecartsPorte(adresse("robots-ferme"), reponse(200, "text/plain", "User-Agent: *\nAllow: /\n"))).toHaveLength(
      2,
    );
    expect(ecartsPorte(adresse("plan-vide"), reponse(200, "application/xml", "<urlset><url>"))).toHaveLength(1);
    expect(ecartsPorte(adresse("fichier"), reponse(200, "text/plain", '{"statut": "preparation"}'))).toHaveLength(1);
    // Data hidden in Next.js' page payload (an escaped string) or written as HTML entities is still seen.
    const page404 = `<h1>${fr.notFound.title}</h1>`;
    const echappee = `${page404}<script>self.__next_f.push([1,"{\\"statut\\":\\"ok\\"}"])</script>`;
    const entites = `${page404}<p>{&quot;statut&quot;: &quot;ok&quot;}</p>`;
    expect(ecartsPorte(adresse("introuvable"), reponse(404, "text/html", echappee))).toHaveLength(1);
    expect(ecartsPorte(adresse("introuvable"), reponse(404, "text/html", entites))).toHaveLength(1);
    expect(ecartsPorte(adresse("attente-rsc"), reponse(200, "text/x-component", fr.attente.status))).toEqual([]);
    expect(ecartsPorte(adresse("attente-rsc"), reponse(200, "text/html", "<h1>Atlas</h1>"))).toHaveLength(2);
  });
});
