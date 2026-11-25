// Tests of the figures' history (D.2, the time slider): made-up days, no network.
import { describe, expect, it } from "vitest";
import { lireHistorique } from "@/lib/donnees/historique";

const figure = {
  auMoinsPourcent: 5.3,
  probablePourcent: 2.1,
  nonDeterminePourcent: 41.4,
  domaines: 1424,
  perimetre: "État",
};

describe("the figures' history (D.2)", () => {
  it("reads the published days in date order, leaving out what is not a day", () => {
    const jours = lireHistorique({
      jours: [
        {
          date: "2026-11-22",
          methode: "0.2.2",
          reglesChangees: true,
          chiffreTitre: { ...figure, auMoinsPourcent: 5.1 },
        },
        { date: "2026-11-21", methode: "0.2.1", reglesChangees: false, chiffreTitre: figure },
        {
          date: "2026-11-23",
          methode: "0.2.3",
          reglesChangees: false,
          chiffreTitre: { ...figure, auMoinsPourcent: 140 },
        },
        { date: "hier", methode: "x", chiffreTitre: figure },
      ],
    });
    expect(jours.map((j) => [j.date, j.reglesChangees, j.chiffreTitre.auMoinsPourcent])).toEqual([
      ["2026-11-21", false, 5.3],
      ["2026-11-22", true, 5.1],
    ]);
    expect(lireHistorique(null)).toEqual([]);
    expect(lireHistorique({ jours: "beaucoup" })).toEqual([]);
  });
});
