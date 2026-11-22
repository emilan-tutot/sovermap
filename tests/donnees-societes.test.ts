// Tests of the companies' pages' data (D.2): made-up indexes, documentation names (RFC 2606), no network.
import { describe, expect, it } from "vitest";
import { lireIndexSocietes } from "@/lib/donnees/radiographie";
import { estCleSociete, lireDomainesSociete, PAR_PAGE, pageDe, societesTriees } from "@/lib/donnees/societes";

describe("the companies' pages (D.2)", () => {
  it("accepts a referential key only, as the address of a company", () => {
    expect(estCleSociete("ovh-sas")).toBe(true);
    expect(estCleSociete("OVH")).toBe(false);
    expect(estCleSociete("../etat")).toBe(false);
    expect(estCleSociete("")).toBe(false);
  });

  it("reads a company's domains, checked: the file must be that company's", () => {
    expect(
      lireDomainesSociete({ exploitant: "hebergeur", domaines: ["b.example", "a.example", 3, "<b>"] }, "hebergeur"),
    ).toEqual(["b.example", "a.example"]);
    expect(lireDomainesSociete({ exploitant: "autre", domaines: [] }, "hebergeur")).toBeNull();
    expect(lireDomainesSociete([], "hebergeur")).toBeNull();
  });

  it("lists the companies in alphabetical order of their names, never by their number of sites", () => {
    const index = lireIndexSocietes({
      zeta: {
        nom: "Zêta Hébergement",
        pays: "FR",
        mere: null,
        paysMere: null,
        categorie: "non déterminé",
        domaines: 900,
      },
      alpha: { nom: "Étoile Réseau", pays: "FR", mere: "alpha", paysMere: "FR", categorie: "France", domaines: 2 },
      beta: { nom: "Bêta Cloud", pays: "US", mere: "beta", paysMere: "US", categorie: "hors d'Europe", domaines: 50 },
    });
    expect(societesTriees(index ?? new Map()).map(([cle]) => cle)).toEqual(["beta", "alpha", "zeta"]);
  });

  it("cuts a long list into pages, and falls back to the first page on an odd page number", () => {
    const liste = Array.from({ length: PAR_PAGE * 2 + 5 }, (_, i) => `d${i}.example`);
    expect(pageDe(liste, 3)).toMatchObject({ page: 3, pages: 3, elements: liste.slice(PAR_PAGE * 2) });
    expect(pageDe(liste, 9).page).toBe(1);
    expect(pageDe(liste, Number.NaN).page).toBe(1);
    expect(pageDe([], 1)).toEqual({ elements: [], page: 1, pages: 1 });
  });
});
