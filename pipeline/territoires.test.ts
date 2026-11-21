// Tests of the territory of a domain (C.6): made-up communes in a made-up copy of the COG.
import { describe, expect, it } from "vitest";
import type { Guichet } from "./annuaire-local";
import { communeDe, departementsDuCodePostal, indexCommunes, normaliserCommune, territoireDe } from "./territoires";

const guichet = (type: string, hote: string, commune: string, codePostal: string, nom = "Guichet"): Guichet => ({
  nom,
  type,
  hotes: [hote],
  siren: type === "epci" ? "200000001" : null,
  siret: null,
  commune,
  codePostal,
  modification: null,
});

const COG = [
  "typecom,com,dep,reg,ctcd,libelle,comparent",
  "COM,99001,99,98,99D,Exemple-sur-Mer,",
  "COM,98002,98,98,98D,Saint-Exemple,",
  "COM,97101,971,01,971D,Saint-Exemple,",
  "COM,2A001,2A,94,20R,Exemple-Haut,",
  "COMD,99099,99,98,99D,Exemple-Bas,99001",
].join("\n");

describe("the territory of a domain (C.6)", () => {
  const index = indexCommunes(COG);

  it("compares commune names without accents, case, hyphens or abbreviations", () => {
    expect(normaliserCommune("Saint-Étienne-de-l’Exemple")).toBe("saint etienne de l exemple");
    expect(normaliserCommune("St Exemple")).toBe(normaliserCommune("Saint-Exemple"));
    expect(normaliserCommune("Ste-Exemple")).toBe("sainte exemple");
  });

  it("narrows a postcode to its département, Corsica and overseas included", () => {
    expect(departementsDuCodePostal("99100")).toEqual(["99"]);
    expect(departementsDuCodePostal("20137")).toEqual(["2A"]);
    expect(departementsDuCodePostal("20200")).toEqual(["2B"]);
    expect(departementsDuCodePostal("97110")).toEqual(["971"]);
    expect(departementsDuCodePostal("9910")).toEqual([]);
  });

  it("finds a commune by its name within its postcode's département, never a delegated one", () => {
    expect(communeDe("Exemple sur Mer", "99100", index)).toEqual({
      commune: { code: "99001", nom: "Exemple-sur-Mer", dep: "99", reg: "98" },
      niveau: "confirmé",
    });
    // Two communes share a name: the postcode tells them apart.
    expect(communeDe("St-Exemple", "97110", index)?.commune.code).toBe("97101");
    expect(communeDe("Saint-Exemple", "98000", index)?.commune.code).toBe("98002");
    // A neighbour's postcode: the name alone, if it is unique, gives a probable commune.
    expect(communeDe("Exemple-Haut", "99200", index)).toMatchObject({ niveau: "probable", commune: { code: "2A001" } });
    // A shared name without a postcode that tells, a delegated commune, an unknown name: none.
    expect(communeDe("Saint-Exemple", null, index)).toBeNull();
    expect(communeDe("Exemple-Bas", "99100", index)).toBeNull();
  });

  it("gives a domain the territory of the offices whose websites it holds", () => {
    const parHote = new Map<string, Guichet[]>([
      ["www.mairie.example", [guichet("mairie", "www.mairie.example", "Exemple-sur-Mer", "99100")]],
      [
        "commun.example",
        [
          guichet("mairie", "commun.example", "Exemple-sur-Mer", "99100"),
          guichet("mairie", "commun.example", "Saint-Exemple", "98000"),
        ],
      ],
      ["cc.example", [guichet("epci", "cc.example", "Saint-Exemple", "98000", "Communauté de communes Exemple")]],
      ["dep.example", [guichet("cg (Collectivité locale)", "dep.example", "Exemple-Haut", "20137")]],
    ]);
    // A town hall: its commune, département and région.
    expect(territoireDe(["mairie.example", "www.mairie.example"], parHote, index)).toEqual({
      commune: { code: "99001", nom: "Exemple-sur-Mer" },
      groupement: null,
      departement: "99",
      region: "98",
      niveau: "confirmé",
    });
    // Two town halls of different communes on one site: no commune.
    expect(territoireDe(["commun.example"], parHote, index)).toBeNull();
    // A group of communes: its name and SIREN, its seat's département and région.
    expect(territoireDe(["cc.example"], parHote, index)).toMatchObject({
      commune: null,
      groupement: { nom: "Communauté de communes Exemple", siren: "200000001" },
      departement: "98",
    });
    // A départemental council: the département of its seat.
    expect(territoireDe(["dep.example"], parHote, index)).toMatchObject({ departement: "2A", region: "94" });
    expect(territoireDe(["ailleurs.example"], parHote, index)).toBeNull();
    expect(communeDe("Nulle-Part", "99100", index)).toBeNull();
  });
});
