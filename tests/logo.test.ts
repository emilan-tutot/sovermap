import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  demiCote,
  ELEVATION_DES_POINTS,
  ellipseDeLArc,
  ENCRE,
  ENCRE_CLAIRE,
  LOGO_FIDELE,
  LOGO_PETIT,
  SOMMET_DE_L_ARC,
  svgLogo,
} from "../lib/design/logo";
import { fr } from "../lib/i18n/fr";
import { origineDuSite } from "../lib/site";

describe("the logo (A.5, the owner's choice of 20/11/2026)", () => {
  it("keeps the measured shape: the arc joins both dots, which sit on the circle, through the arc's top", () => {
    const { cy, rx, ry, px, py } = ellipseDeLArc();
    expect(Math.hypot(px, py)).toBeCloseTo(1, 10);
    expect(Math.atan2(-py, px) * (180 / Math.PI)).toBeCloseTo(ELEVATION_DES_POINTS, 10);
    expect(cy - ry).toBeCloseTo(-SOMMET_DE_L_ARC, 10);
    expect((px / rx) ** 2 + ((py - cy) / ry) ** 2).toBeCloseTo(1, 10);
    // As measured on the owner's PNG: centre almost the circle's, wider than the circle, lower than it.
    expect(cy).toBeCloseTo(0.029, 3);
    expect(rx).toBeCloseTo(1.057, 3);
  });

  it("fits the whole drawing in its square, with one colour, light only on a dark tab", () => {
    for (const p of [LOGO_FIDELE, LOGO_PETIT]) {
      const { px } = ellipseDeLArc();
      expect(demiCote(p)).toBeGreaterThan(Math.max(1 + p.trait / 2, px + p.point));
    }
    const plein = svgLogo(LOGO_FIDELE);
    expect(plein.match(/#[0-9A-F]{6}/gi)?.every((c) => c.toUpperCase() === ENCRE)).toBe(true);
    const onglet = svgLogo({ ...LOGO_PETIT, claire: ENCRE_CLAIRE });
    expect(onglet).toContain(`@media (prefers-color-scheme:dark){.l{stroke:${ENCRE_CLAIRE}}.p{fill:${ENCRE_CLAIRE}}}`);
  });

  it("gives the tab icon bigger dots and a gap visible under the ring at 16 pixels, the logo unchanged", () => {
    const pixel = 16 / (2 * demiCote(LOGO_PETIT));
    const sommet = LOGO_PETIT.sommet ?? SOMMET_DE_L_ARC;
    // Between the ring's inner edge and the top of the arc's outer edge: two pixels at least (1.5 before).
    expect((1 - LOGO_PETIT.trait / 2 - (sommet + LOGO_PETIT.trait / 2)) * pixel).toBeGreaterThanOrEqual(2);
    // Each dot three pixels wide at least (2.6 before), and the arc lower than the logo's.
    expect(2 * LOGO_PETIT.point * pixel).toBeGreaterThanOrEqual(3);
    expect(sommet).toBeLessThan(SOMMET_DE_L_ARC);
    expect(LOGO_FIDELE.sommet).toBeUndefined();
    expect(svgLogo(LOGO_FIDELE)).toBe(svgLogo({ ...LOGO_FIDELE, sommet: SOMMET_DE_L_ARC }));
  });

  it("refuses an arc's top that no ellipse joins to the dots, or that would draw the lower arc", () => {
    for (const sommet of [0.2, 0.9, Number.NaN]) {
      expect(() => ellipseDeLArc(ELEVATION_DES_POINTS, sommet)).toThrow(RangeError);
    }
    for (const sommet of [LOGO_PETIT.sommet ?? SOMMET_DE_L_ARC, SOMMET_DE_L_ARC]) {
      expect(Number.isFinite(ellipseDeLArc(ELEVATION_DES_POINTS, sommet).rx)).toBe(true);
    }
  });

  it("escapes its title completely, quotes included, so that the SVG stays well formed and inert", () => {
    expect(svgLogo({ ...LOGO_PETIT, titre: "A & B <c>" })).toContain("<title>A &amp; B &lt;c&gt;</title>");
    const piege = `"><script>alert(1)</script><x a='`;
    const svg = svgLogo({ ...LOGO_PETIT, titre: piege });
    expect(svg).toContain("<title>&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;x a=&#39;</title>");
    // Nothing of the title can close a tag or an attribute: no raw quote, angle bracket or script tag is left in it.
    const titre = /<title>(.*)<\/title>/.exec(svg)?.[1] ?? "";
    expect(titre).not.toMatch(/["'<>]/);
    expect(svg).not.toContain("<script>");
  });

  it("serves the tab icon exactly as the code draws it (public/icon.svg)", () => {
    const attendu = svgLogo({ ...LOGO_PETIT, claire: ENCRE_CLAIRE, titre: fr.site.name });
    expect(readFileSync("public/icon.svg", "utf8")).toBe(attendu);
  });
});

describe("the site's origin, for the share image", () => {
  it("takes the configured address, else Vercel's production domain, else the local server", () => {
    expect(origineDuSite({ NEXT_PUBLIC_SITE_URL: "https://site.example/" })).toBe("https://site.example");
    expect(origineDuSite({ VERCEL_PROJECT_PRODUCTION_URL: "projet.example" })).toBe("https://projet.example");
    expect(origineDuSite({ NEXT_PUBLIC_SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "projet.example" })).toBe(
      "https://projet.example",
    );
    expect(origineDuSite({})).toBe("http://localhost:3100");
  });

  it("stops the build on a configured address that is not a bare origin, never falling back silently", () => {
    for (const valeur of ["pas une adresse", "https://site.example/fr", "ftp://site.example"]) {
      expect(() =>
        origineDuSite({ NEXT_PUBLIC_SITE_URL: valeur, VERCEL_PROJECT_PRODUCTION_URL: "projet.example" }),
      ).toThrow();
    }
  });
});
