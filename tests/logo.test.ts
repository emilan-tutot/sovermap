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

  it("serves the tab icon exactly as the code draws it (public/icon.svg)", () => {
    const attendu = svgLogo({ ...LOGO_PETIT, claire: ENCRE_CLAIRE, titre: fr.site.name });
    expect(readFileSync("public/icon.svg", "utf8")).toBe(attendu);
  });
});

describe("the site's origin, for the share image", () => {
  it("takes the configured address, else Vercel's production domain, else the local server", () => {
    expect(origineDuSite({ NEXT_PUBLIC_SITE_URL: "https://site.example/" })).toBe("https://site.example");
    expect(origineDuSite({ VERCEL_PROJECT_PRODUCTION_URL: "projet.example" })).toBe("https://projet.example");
    expect(
      origineDuSite({ NEXT_PUBLIC_SITE_URL: "pas une adresse", VERCEL_PROJECT_PRODUCTION_URL: "projet.example" }),
    ).toBe("https://projet.example");
    expect(origineDuSite({})).toBe("http://localhost:3100");
  });
});
