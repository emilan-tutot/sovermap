// Tests of a country's page's data (D.2): the countries' table of the repository and made-up indexes, no network.
import { describe, expect, it } from "vitest";
import { lireIndexPays, paysDuSlug, slugDuCode, slugPays, societesDuPays } from "@/lib/donnees/pays";
import { lireIndexSocietes } from "@/lib/donnees/radiographie";

describe("a country's page (D.2)", () => {
  it("gives a country a readable address from its French name, both ways", () => {
    expect(slugPays("États-Unis")).toBe("etats-unis");
    expect(paysDuSlug("etats-unis")).toEqual({ code: "US", nom: "États-Unis" });
    expect(slugDuCode("FR")).toBe("france");
    expect(paysDuSlug("atlantide")).toBeNull();
  });

  it("reads the countries' index, checked, and lists a country's companies alphabetically", () => {
    expect(
      lireIndexPays({
        US: { domaines: 10, domainesEtat: 2 },
        us: { domaines: 1, domainesEtat: 0 },
        FR: { domaines: -1, domainesEtat: 0 },
      }),
    ).toEqual(new Map([["US", { domaines: 10, domainesEtat: 2 }]]));
    const societes = lireIndexSocietes({
      b: { nom: "Bêta, Inc.", pays: "US", mere: "b", paysMere: "US", categorie: "hors d'Europe" },
      a: { nom: "Alpha Europe B.V.", pays: "NL", mere: "b", paysMere: "US", categorie: "hors d'Europe" },
      c: { nom: "Gamma SAS", pays: "FR", mere: "c", paysMere: "FR", categorie: "France" },
    });
    expect(societesDuPays("US", societes ?? new Map()).map(([cle]) => cle)).toEqual(["a", "b"]);
  });
});
