// Tests of the territory of a domain (C.6): made-up communes in a made-up copy of the COG (départements 96 and 99 do
// not exist).
import { describe, expect, it } from "vitest";
import type { Guichet } from "./annuaire-local";
import type { Ecarts } from "./personnelles";
import { DOMAINE, valider } from "./schemas";
import {
  communeDe,
  departementsDuCodePostal,
  indexCommunes,
  lireGuichetsPublies,
  normaliserCommune,
  territoireDe,
  territoiresDesDomaines,
} from "./territoires";

const guichet = (
  type: string,
  hote: string,
  commune: string,
  codePostal: string,
  nom = "Guichet",
  siren: string | null = type === "epci" ? "200000001" : null,
): Guichet => ({ nom, type, hotes: [hote], siren, siret: null, commune, codePostal, modification: null });

const COG = [
  "typecom,com,dep,reg,ctcd,libelle,comparent",
  "COM,99001,99,98,99D,Exemple-sur-Mer,",
  "COM,96002,96,97,96D,Saint-Exemple,",
  "COM,97101,971,01,971D,Saint-Exemple,",
  "COM,2A001,2A,94,20R,Exemple-Haut,",
  "COM,99003,99,98,99D,Œuvre-la-Ville,",
  // The commune nouvelle's main delegated commune bears its name and code; another one, its former name.
  "COMD,99001,99,98,99D,Exemple-sur-Mer,99001",
  "COMD,99099,99,98,99D,Exemple-Bas,99001",
  // An associated commune of département 96 shares its name with a Corsican commune.
  "COMA,96098,96,97,96D,Exemple-Haut,96002",
  "ARM,99101,99,98,99D,Exemple-sur-Mer 1er Arrondissement,99001",
].join("\n");

describe("the territory of a domain (C.6)", () => {
  const index = indexCommunes(COG);

  it("compares commune names without accents, case, ligatures, hyphens or abbreviations", () => {
    expect(normaliserCommune("Saint-Étienne-de-l’Exemple")).toBe("saint etienne de l exemple");
    expect(normaliserCommune("St Exemple")).toBe(normaliserCommune("Saint-Exemple"));
    expect(normaliserCommune("Ste-Exemple")).toBe("sainte exemple");
    expect(normaliserCommune("Œuvre-la-Ville")).toBe("oeuvre la ville");
    expect(normaliserCommune("Exemple-sur-Mer Cedex 2")).toBe("exemple sur mer");
    expect(normaliserCommune("Cedexville")).toBe("cedexville");
  });

  it("narrows a postcode to its département, Corsica and overseas included", () => {
    expect(departementsDuCodePostal("99100")).toEqual(["99"]);
    expect(departementsDuCodePostal("20137")).toEqual(["2A"]);
    expect(departementsDuCodePostal("20200")).toEqual(["2B"]);
    expect(departementsDuCodePostal("97110")).toEqual(["971"]);
    expect(departementsDuCodePostal("97133")).toEqual(["977"]);
    expect(departementsDuCodePostal("97150")).toEqual(["978"]);
    expect(departementsDuCodePostal("98714")).toEqual(["987"]);
    expect(departementsDuCodePostal("98000")).toEqual([]);
    expect(departementsDuCodePostal("9910")).toEqual([]);
  });

  it("finds a commune by its name within its postcode's département, and only there", () => {
    expect(communeDe("Exemple sur Mer", "99100", index)).toEqual({
      code: "99001",
      nom: "Exemple-sur-Mer",
      dep: "99",
      reg: "98",
    });
    expect(communeDe("Oeuvre la Ville", "99100", index)?.code).toBe("99003");
    // Two communes share a name: the postcode tells them apart.
    expect(communeDe("St-Exemple", "97110", index)?.code).toBe("97101");
    expect(communeDe("Saint-Exemple", "96000", index)?.code).toBe("96002");
    // A delegated or associated commune, or a municipal district, designates its commune.
    expect(communeDe("Exemple-Bas", "99100", index)?.code).toBe("99001");
    expect(communeDe("Exemple-Haut", "96200", index)?.code).toBe("96002");
    expect(communeDe("Exemple-sur-Mer 1er Arrondissement", "99101", index)?.code).toBe("99001");
    // Never a commune of the same name in another département (even a name unique in France), an overseas
    // collectivity, or no postcode: none.
    expect(communeDe("Exemple-sur-Mer", "96000", index)).toBeNull();
    expect(communeDe("Exemple-Haut", "99200", index)).toBeNull();
    expect(communeDe("Saint-Exemple", "98714", index)).toBeNull();
    expect(communeDe("Saint-Exemple", null, index)).toBeNull();
    expect(communeDe("Nulle-Part", "99100", index)).toBeNull();
  });

  it("gives a domain the territory of the widest authority among the offices whose websites it holds", () => {
    const parHote = new Map<string, Guichet[]>([
      ["www.mairie.example", [guichet("mairie", "www.mairie.example", "Exemple-sur-Mer", "99100")]],
      [
        "commun.example",
        [
          guichet("mairie", "commun.example", "Exemple-sur-Mer", "99100"),
          guichet("mairie", "commun.example", "Saint-Exemple", "96000"),
        ],
      ],
      ["cc.example", [guichet("epci", "cc.example", "Saint-Exemple", "96000", "Communauté de communes Exemple")]],
      [
        "deux-cc.example",
        [
          guichet("epci", "deux-cc.example", "Saint-Exemple", "96000", "CC Une", "200000001"),
          guichet("epci", "deux-cc.example", "Saint-Exemple", "96000", "CC Deux", "200000002"),
        ],
      ],
      [
        "cc-et-mairie.example",
        [
          guichet("mairie", "cc-et-mairie.example", "Exemple-sur-Mer", "99100"),
          guichet("epci", "cc-et-mairie.example", "Exemple-sur-Mer", "99100", "Communauté Exemple"),
        ],
      ],
      [
        "dep.example",
        [
          guichet("cg (Collectivité locale)", "dep.example", "Exemple-Haut", "20137"),
          // A town hall that lists its département's site.
          guichet("mairie", "dep.example", "Saint-Exemple", "96000"),
        ],
      ],
      ["region.example", [guichet("cr (Collectivité locale)", "region.example", "Saint-Exemple", "96000")]],
      ["siege-inconnu.example", [guichet("cr (Collectivité locale)", "siege-inconnu.example", "Nulle-Part", "96000")]],
    ]);
    // A town hall: its commune, département and région; one source, « probable ».
    expect(territoireDe(["mairie.example", "www.mairie.example"], parHote, index)).toEqual({
      commune: { code: "99001", nom: "Exemple-sur-Mer" },
      groupement: null,
      departement: "99",
      region: "98",
      niveau: "probable",
    });
    // Two town halls of different communes on one site, or two groups: nothing.
    expect(territoireDe(["commun.example"], parHote, index)).toBeNull();
    expect(territoireDe(["deux-cc.example"], parHote, index)).toBeNull();
    // A group of communes: its name and SIREN, its seat's département and région; it outranks a town hall.
    expect(territoireDe(["cc.example"], parHote, index)).toMatchObject({
      commune: null,
      groupement: { nom: "Communauté de communes Exemple", siren: "200000001" },
      departement: "96",
      region: "97",
    });
    expect(territoireDe(["cc-et-mairie.example"], parHote, index)).toMatchObject({
      commune: null,
      groupement: { nom: "Communauté Exemple" },
    });
    // A départemental council outranks the town hall that lists its site: the département of its seat.
    expect(territoireDe(["dep.example"], parHote, index)).toEqual({
      commune: null,
      groupement: null,
      departement: "2A",
      region: "94",
      niveau: "probable",
    });
    // A régional council: its région only; a council whose seat is not found: nothing.
    expect(territoireDe(["region.example"], parHote, index)).toMatchObject({ departement: null, region: "97" });
    expect(territoireDe(["siege-inconnu.example"], parHote, index)).toBeNull();
    expect(territoireDe(["ailleurs.example"], parHote, index)).toBeNull();
  });
});

describe("the territories of the day's domains, in the collection (C.6)", () => {
  const index = indexCommunes(COG);
  const ligne = (g: Record<string, unknown>) => JSON.stringify(g);
  const mairie = {
    nom: "Mairie - Exemple-sur-Mer",
    type: "mairie",
    hotes: ["www.mairie-exemple.example"],
    siren: "219900011",
    siret: null,
    commune: "Exemple-sur-Mer",
    codePostal: "99000",
    modification: "2026-11-01",
  };

  it("reads the published offices, line by line, and leaves out what is not one", () => {
    const { guichets, ecartees } = lireGuichetsPublies(
      [
        ligne(mairie),
        "",
        "pas du JSON",
        ligne({ ...mairie, siren: "12" }),
        ligne({ ...mairie, codePostal: "990" }),
        ligne({ ...mairie, nom: "" }),
        // A host that is not a name (an address) is left out; the office stays.
        ligne({ ...mairie, hotes: ["192.0.2.1", "mairie-exemple.example"] }),
      ].join("\n"),
    );
    expect(ecartees).toBe(4);
    expect(guichets.map((g) => g.hotes)).toEqual([["www.mairie-exemple.example"], ["mairie-exemple.example"]]);
  });

  it("controls the published offices' free text again (P13): a copy read under older rules never reaches the day's state", () => {
    const ecarts: Ecarts = {};
    const { guichets, ecartees } = lireGuichetsPublies(
      [
        ligne({ ...mairie, nom: "Permanence de M. Exemple" }),
        ligne({ ...mairie, nom: "Mairie", commune: "Chez Mme Exemple" }),
        ligne(mairie),
      ].join("\n"),
      ecarts,
    );
    expect(ecartees).toBe(0);
    expect(guichets.map((g) => [g.nom, g.commune])).toEqual([
      ["Mairie d'Exemple-sur-Mer", "Exemple-sur-Mer"],
      ["Mairie", null],
      ["Mairie - Exemple-sur-Mer", "Exemple-sur-Mer"],
    ]);
    expect(ecarts).toEqual({ "annuaire-local": { "nom de personne": 2 } });
  });

  it("gives each domain the territory of the offices whose websites are among its names, and none otherwise", () => {
    const { guichets } = lireGuichetsPublies(ligne(mairie));
    const territoires = territoiresDesDomaines(
      new Map([
        ["mairie-exemple.example", ["mairie-exemple.example", "www.mairie-exemple.example"]],
        ["autre.example", ["autre.example", "www.autre.example"]],
      ]),
      guichets,
      index,
    );
    expect([...territoires.keys()]).toEqual(["mairie-exemple.example"]);
    expect(territoires.get("mairie-exemple.example")).toEqual({
      commune: { code: "99001", nom: "Exemple-sur-Mer" },
      groupement: null,
      departement: "99",
      region: "98",
      niveau: "probable",
    });
  });

  it("publishes a territory only in its shape: the published schema refuses anything else", () => {
    const schema = DOMAINE.properties?.["territoire"];
    expect(schema).toBeDefined();
    if (schema === undefined) return;
    const bon = {
      commune: null,
      groupement: { nom: "Communauté de communes de l’Exemple", siren: "200000001" },
      departement: "2A",
      region: "94",
      niveau: "probable",
    };
    expect(valider(bon, schema)).toEqual([]);
    expect(valider({ ...bon, departement: "Corse" }, schema)).not.toEqual([]);
    expect(valider({ ...bon, niveau: "confirmé" }, schema)).not.toEqual([]);
    expect(valider({ ...bon, maire: "un nom" }, schema)).not.toEqual([]);
    // A domain without a territory has none: the property is optional.
    expect(DOMAINE.required ?? []).not.toContain("territoire");
  });
});
