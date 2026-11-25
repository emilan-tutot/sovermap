// Tests of the Atlas' data (D.2): made-up figures and countries, the map and the countries' table of the repository.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { filsDe, lireChiffres, origineDe } = await import("@/lib/donnees/atlas");

const chiffre = { auMoinsPourcent: 5.3, domaines: 1424, probablePourcent: 2.1, nonDeterminePourcent: 41.4 };

describe("the Atlas (D.2)", () => {
  it("reads the day's figures, checked: no headline figure, no figures", () => {
    expect(
      lireChiffres({ avertissement: "Provisoire.", chiffreTitre: chiffre, messagerie: { ...chiffre, domaines: -1 } }),
    ).toEqual({
      avertissement: "Provisoire.",
      chiffreTitre: chiffre,
      sousChiffreGouvFr: null,
      serveursDeNoms: null,
      messagerie: null,
    });
    expect(lireChiffres({ chiffreTitre: { ...chiffre, auMoinsPourcent: 140 } })).toBeNull();
    expect(lireChiffres([])).toBeNull();
  });

  it("draws a thread to each country of a seat, thicker with more domains, never to France or an unknown code", () => {
    const index = new Map([
      ["FR", { domainesEtat: 1287 }],
      ["US", { domainesEtat: 113 }],
      ["LU", { domainesEtat: 238 }],
      ["GB", { domainesEtat: 0 }],
      ["ZZ", { domainesEtat: 5 }],
    ]);
    const fils = filsDe(index);
    expect(fils.map((f) => [f.code, f.sites, f.horsUE])).toEqual([
      ["LU", 238, false],
      ["US", 113, true],
    ]);
    expect(fils[1]?.nom).toBe("États-Unis");
    expect(origineDe(index)).toMatchObject({ code: "FR", sites: 1287, horsUE: false });
  });
});
