// Tests of the guards of the Quality page (proposals B and C): limits, verdicts, and no verdict without a value.
import { describe, expect, it } from "vitest";
import { gardeFous } from "@/components/qualite/garde-fous";
import { lireEtatPublie } from "@/lib/donnees/lecture";
import { qualiteDe } from "@/lib/donnees/qualite";

const etat = (qualite: Record<string, unknown>) =>
  qualiteDe(lireEtatPublie({ statut: "preparation", date: "2026-11-21", sommes: {}, qualite })!);

describe("the guards of the Quality page", () => {
  it("compares each published value with its limit, the day-1 figures included", () => {
    const q = etat({
      tauxEchecNonConfirmesPourcent: 0.07,
      pannesConfirmeesPourcent: 0.61,
      debitMaxParServeur: { secondes: 9204, secondesAuDela: 5, partAuDelaPourcent: 0.054, max: 19 },
    });
    const g = gardeFous(q, { derniereCollecte: "2026-11-21T21:18:08.728Z", ageHeures: 3.5, enRetard: false });
    expect(g.map((x) => [x.cle, x.tenu])).toEqual([
      ["echecs", true],
      ["pannes", true],
      ["debitPart", true],
      ["debitMax", false],
      ["fraicheur", true],
    ]);
    expect(g.find((x) => x.cle === "debitMax")).toMatchObject({ texte: "19", texteLimite: "15" });
    // The pace's limits judge a trial of a new version; a day beyond them is still published (methode § 7).
    expect(g.map((x) => [x.cle, x.juge])).toEqual([
      ["echecs", "jour"],
      ["pannes", "jour"],
      ["debitPart", "essai"],
      ["debitMax", "essai"],
      ["fraicheur", "jour"],
    ]);
  });

  it("gives no verdict when a value is not published, and holds the limit itself as within it where the rule says « at most »", () => {
    const q = etat({ debitMaxParServeur: { secondes: 1000, secondesAuDela: 1, partAuDelaPourcent: 0.1, max: 15 } });
    const g = gardeFous(q, { derniereCollecte: "2026-11-21T00:00:00.000Z", ageHeures: 36, enRetard: false });
    expect(g.find((x) => x.cle === "echecs")).toMatchObject({ valeur: null, texte: null, tenu: null });
    expect(g.find((x) => x.cle === "debitPart")?.tenu).toBe(true);
    expect(g.find((x) => x.cle === "debitMax")?.tenu).toBe(true);
    expect(g.find((x) => x.cle === "fraicheur")?.tenu).toBe(true);
  });
});
