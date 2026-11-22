// Tests of the ministries' pages' data (D.2): made-up index, documentation names (RFC 2606), no network.
import { describe, expect, it } from "vitest";
import { groupesDe, lireMinisteres, parCategorie, slugMinistere } from "@/lib/donnees/ministeres";
import { lireIndexSocietes } from "@/lib/donnees/radiographie";

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe("the ministries' pages (D.2)", () => {
  it("gives a ministry a readable address, without accents, apostrophes or spaces", () => {
    expect(slugMinistere("Ministère de l’Agriculture et de la Souveraineté alimentaire")).toBe(
      "ministere-de-l-agriculture-et-de-la-souverainete-alimentaire",
    );
    expect(slugMinistere("Premier ministre")).toBe("premier-ministre");
    expect(slugMinistere(`Ministère ${"très ".repeat(30)}long`).length).toBeLessThanOrEqual(90);
  });

  it("reads the index in alphabetical order, and keeps two homonyms apart", () => {
    const m = lireMinisteres({
      [ID(1)]: { nom: "Ministère de la Culture", domaines: ["culture.example", "<x>"] },
      [ID(2)]: { nom: "Ministère des Armées", domaines: [] },
      [ID(3)]: { nom: "Ministère de la Culture", domaines: [] },
      "pas-un-id": { nom: "x", domaines: [] },
    });
    expect(m?.map((x) => x.nom)).toEqual([
      "Ministère de la Culture",
      "Ministère de la Culture",
      "Ministère des Armées",
    ]);
    expect(m?.[0]?.domaines).toEqual(["culture.example"]);
    expect(new Set(m?.map((x) => x.slug)).size).toBe(3);
    expect(lireMinisteres([])).toBeNull();
  });

  it("keeps two long homonyms apart within the 100 characters of an address (the review of PR 22)", () => {
    // An address of exactly 90 characters (the longest a name gives), the end of an id then added.
    const long = `${"x".repeat(90)} y`;
    const m = lireMinisteres({ [ID(4)]: { nom: long, domaines: [] }, [ID(5)]: { nom: long, domaines: [] } }) ?? [];
    expect(m).toHaveLength(2);
    expect(new Set(m.map((x) => x.slug)).size).toBe(2);
    for (const x of m) expect(x.slug).toMatch(/^[a-z0-9-]{1,100}$/);
  });

  it("groups the domains by the company that serves them, the unknown last, and counts each category", () => {
    const societes = lireIndexSocietes({
      zeta: { nom: "Zêta", pays: "FR", mere: "zeta", paysMere: "FR", categorie: "France" },
      alpha: { nom: "Alpha", pays: "US", mere: "alpha", paysMere: "US", categorie: "hors d'Europe" },
    });
    const domaines = [
      { domaine: "b.example", societe: "zeta", categorie: "France" as const },
      { domaine: "a.example", societe: "zeta", categorie: "France" as const },
      { domaine: "c.example", societe: "alpha", categorie: "hors d'Europe" as const },
      { domaine: "d.example", societe: null, categorie: "non déterminé" as const },
      { domaine: "e.example", societe: "inconnue", categorie: "non déterminé" as const },
    ];
    const groupes = groupesDe(domaines, societes ?? new Map());
    expect(groupes.map((g) => [g.nom, g.domaines])).toEqual([
      ["Alpha", ["c.example"]],
      ["Zêta", ["a.example", "b.example"]],
      [null, ["d.example", "e.example"]],
    ]);
    expect(parCategorie(domaines)).toEqual([
      ["France", 2],
      ["UE hors France", 0],
      ["Europe hors UE", 0],
      ["hors d'Europe", 1],
      ["non déterminé", 2],
    ]);
  });
});
