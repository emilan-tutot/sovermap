// Tests of the territories' indexes as the site reads them (D.2): made-up indexes, documentation names (RFC 2606).
import { describe, expect, it } from "vitest";
import { departementsDeLaRegion } from "@/components/carte/CarteFrance";
import {
  adresseCommune,
  adresseDepartement,
  adresseGroupement,
  adresseRegion,
  codeDeAdresse,
  departementDeCommune,
  lireFichierDepartement,
  lireIndexTerritoires,
} from "@/lib/donnees/territoires";

const INDEX = {
  regions: { "53": { nom: "Bretagne", domaines: 3, conseil: ["region.example"] } },
  departements: {
    "35": { nom: "Ille-et-Vilaine", region: "53", domaines: 2, conseil: [] },
    "977": { nom: "Saint-Barthélemy", region: null, domaines: 1, conseil: [] },
  },
  groupements: { "200000001": "35" },
};

describe("the territories' index, read at the border (D.2)", () => {
  it("reads the régions, the départements and each group's département", () => {
    const lu = lireIndexTerritoires(INDEX);
    expect(lu?.regions.get("53")).toEqual({ code: "53", nom: "Bretagne", domaines: 3, conseil: ["region.example"] });
    expect(lu?.departements.get("977")?.region).toBeNull();
    expect(lu?.groupements.get("200000001")).toBe("35");
  });

  it("refuses an index with a wrong code, a domain that is not one, or a group in an unknown département", () => {
    expect(lireIndexTerritoires({ ...INDEX, regions: { "5": INDEX.regions["53"] } })).toBeNull();
    expect(
      lireIndexTerritoires({ ...INDEX, regions: { "53": { ...INDEX.regions["53"], conseil: ["<b>x</b>"] } } }),
    ).toBeNull();
    expect(lireIndexTerritoires({ ...INDEX, groupements: { "200000001": "22" } })).toBeNull();
    expect(lireIndexTerritoires(null)).toBeNull();
  });

  it("reads a département's file, only the one asked for, each domain with a known category", () => {
    const fichier = {
      departement: "35",
      conseil: [{ domaine: "departement.example", categorie: "France", horsUE: false }],
      communes: [
        {
          code: "35238",
          nom: "Rennes",
          domaines: [{ domaine: "rennes.example", categorie: "hors d'Europe", horsUE: true }],
        },
      ],
      groupements: [{ nom: "Métropole Exemple", siren: null, domaines: [] }],
    };
    expect(lireFichierDepartement(fichier, "35")?.communes[0]?.nom).toBe("Rennes");
    expect(lireFichierDepartement(fichier, "22")).toBeNull();
    const autreCategorie = {
      ...fichier,
      conseil: [{ domaine: "departement.example", categorie: "Mars", horsUE: false }],
    };
    expect(lireFichierDepartement(autreCategorie, "35")).toBeNull();
  });
});

describe("the territories' addresses (spec EX-26)", () => {
  it("puts the official code first, then the name without accents nor spaces", () => {
    expect(adresseRegion("53", "Bretagne")).toBe("/regions/53-bretagne");
    expect(adresseDepartement("35", "Ille-et-Vilaine")).toBe("/departements/35-ille-et-vilaine");
    expect(adresseDepartement("2A", "Corse-du-Sud")).toBe("/departements/2a-corse-du-sud");
    expect(adresseCommune("35238", "Rennes")).toBe("/communes/35238-rennes");
    expect(adresseGroupement("200000001", "Métropole d’Exemple")).toBe("/groupements/200000001-metropole-d-exemple");
  });

  it("reads the code an address begins with, of the right kind only", () => {
    expect(codeDeAdresse("35-ille-et-vilaine", "departement")).toBe("35");
    expect(codeDeAdresse("2a-corse-du-sud", "departement")).toBe("2A");
    expect(codeDeAdresse("974-la-reunion", "departement")).toBe("974");
    expect(codeDeAdresse("35238-rennes", "commune")).toBe("35238");
    expect(codeDeAdresse("35238-rennes", "departement")).toBeNull();
    expect(codeDeAdresse("..-x", "region")).toBeNull();
    expect(departementDeCommune("97411")).toBe("974");
    expect(departementDeCommune("2A004")).toBe("2A");
  });

  it("frames a région's map on all its départements, as the base map gives them, with or without data", () => {
    expect([...departementsDeLaRegion("53")].sort()).toEqual(["22", "29", "35", "56"]);
    expect([...departementsDeLaRegion("01")]).toEqual(["971"]);
    expect(departementsDeLaRegion("99").size).toBe(0);
  });
});
