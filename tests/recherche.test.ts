// Tests of the search (D.2, R4): a made-up index, documentation names (RFC 2606), no network.
import { describe, expect, it } from "vitest";
import { natureDe } from "@/lib/donnees/nature";
import { chercher, comparable, type Entree, lireIndexRecherche } from "@/lib/recherche";

const INDEX: Entree[] = [
  ["m", "Ministère de la Culture", "ministere-de-la-culture"],
  ["m", "Ministère de l’Action et des Comptes publics", "ministere-de-l-action-et-des-comptes-publics"],
  ["s", "Météo Exemple", "meteo-exemple"],
  ["s", "Bretagne Exemple", "bretagne-exemple"],
  ["p", "États-Unis", "etats-unis"],
  ["d", "etat-civil.example", 1],
  ["d", "culture.example", 1],
  ["d", "agriculture.example", 0],
  ["d", "culture-pop.example", 0],
];

describe("the search (D.2)", () => {
  it("compares without accents or case", () => {
    expect(comparable("Ministère de l’Œuvre")).toBe("ministere de l’oeuvre");
  });

  it("takes only the beginnings of words below 3 characters, never a small word: « Ét » finds neither Météo, Bretagne nor « … et des Comptes »", () => {
    expect(chercher(INDEX, "Ét").map((r) => r.libelle)).toEqual(["États-Unis", "etat-civil.example"]);
  });

  it("from 3 characters, adds what contains the query, after the beginnings of words", () => {
    expect(chercher(INDEX, "cult").map((r) => r.libelle)).toEqual([
      "Ministère de la Culture",
      "culture.example",
      "culture-pop.example",
      "agriculture.example",
    ]);
    expect(chercher(INDEX, "ul").map((r) => r.libelle)).toEqual([]);
  });

  it("gives each result its address and says when a domain is of the « État » perimeter", () => {
    expect(chercher(INDEX, "culture.ex")).toEqual([
      { type: "d", libelle: "culture.example", adresse: "/radiographie/culture.example", etat: true, nature: null },
      {
        type: "d",
        libelle: "agriculture.example",
        adresse: "/radiographie/agriculture.example",
        etat: false,
        nature: null,
      },
    ]);
    expect(chercher(INDEX, "États")[0]).toMatchObject({ adresse: "/pays/etats-unis", etat: false });
    expect(chercher(INDEX, "   ")).toEqual([]);
  });

  it("reads the index sent by the server, leaving out what is not an entry", () => {
    expect(
      lireIndexRecherche({
        entrees: [["d", "a.example", 1], ["d", "<b>", 1], ["s", "X", "../etat"], ["m", "M", "m"], ["x", "y", "z"], "z"],
      }),
    ).toEqual([
      ["d", "a.example", 1],
      ["m", "M", "m"],
    ]);
    expect(lireIndexRecherche(null)).toEqual([]);
  });

  it("gives a public body its nature, never « Exploitant » alone (D.3, correction 1)", () => {
    // The referential's own words (referentiels/societes.json, « controle »).
    expect(
      [
        "administration centrale de l'État, rattachée au Premier ministre",
        "groupement d'intérêt public, opérateur de l'État",
        "établissement public de santé",
        "Établissement public national",
        "organisme du régime général de la sécurité sociale",
      ].map(natureDe),
    ).toEqual(["administration", "gip", "etablissement", "etablissement", "securiteSociale"]);
    for (const societe of ["société cotée", "personnes physiques, selon GLEIF", "fondation : …", null]) {
      expect(natureDe(societe)).toBeNull();
    }
    const index: Entree[] = [
      ["s", "Réseau Exemple (groupement d’intérêt public)", "reseau-exemple", "gip"],
      ["s", "Réseau Privé Exemple", "reseau-prive-exemple"],
    ];
    expect(chercher(index, "Réseau").map((r) => [r.libelle, r.nature])).toEqual([
      ["Réseau Exemple (groupement d’intérêt public)", "gip"],
      ["Réseau Privé Exemple", null],
    ]);
  });

  it("reads a nature in the index only for an operator, and only a known one", () => {
    expect(
      lireIndexRecherche({
        entrees: [
          ["s", "A", "a", "gip"],
          ["s", "B", "b", "societe"],
          ["m", "C", "c", "gip"],
          ["d", "d.example", 1, "gip"],
        ],
      }),
    ).toEqual([["s", "A", "a", "gip"]]);
  });
});
