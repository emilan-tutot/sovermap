// Tests of the journal's pages' data (D.2): a made-up state and days, documentation names (RFC 2606), no network.
import { describe, expect, it } from "vitest";
import { cheminJour, estJour, joursPublies, lireJour, parCouche } from "@/lib/donnees/journal";
import type { EtatPublie } from "@/lib/donnees/lecture";

const SOMME = "a".repeat(64);

describe("the journal (D.2)", () => {
  it("lists the published days, the latest first, and only real journal files", () => {
    const etat: EtatPublie = {
      date: "2026-11-23",
      statut: "preparation",
      jours: 3,
      sommes: {
        "journal/2026/11/2026-11-21.json": SOMME,
        "journal/2026/11/2026-11-23.json": SOMME,
        "journal/2026/11/2026-12-01.json": SOMME,
        "journal/2026/11/x.json": SOMME,
        "index/as.json": SOMME,
      },
      brut: {},
    };
    expect(joursPublies(etat)).toEqual(["2026-11-23", "2026-11-21"]);
    expect(cheminJour("2026-11-21")).toBe("journal/2026/11/2026-11-21.json");
    expect(estJour("2026-11-21")).toBe(true);
    expect(estJour("2026-13-45")).toBe(false);
    expect(estJour("../etat")).toBe(false);
  });

  it("reads a day checked against its schema, and sorts its changes by layer then domain", () => {
    const jour = lireJour({
      date: "2026-11-23",
      etatInitial: false,
      reglesChangees: false,
      changements: [
        { domaine: "b.example", couche: "messagerie", avant: "A", apres: "B" },
        { domaine: "z.example", couche: "adresses", avant: "A", apres: "B" },
        { domaine: "a.example", couche: "adresses", avant: "A", apres: "C" },
      ],
    });
    expect(parCouche(jour?.changements ?? []).map(([c, l]) => [c, l.map((x) => x.domaine)])).toEqual([
      ["adresses", ["a.example", "z.example"]],
      ["messagerie", ["b.example"]],
    ]);
    expect(lireJour({ date: "2026-11-23", changements: "beaucoup" })).toBeNull();
  });
});
