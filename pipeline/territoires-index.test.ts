// Tests of the territories' index (brief C.6 and D.2): made-up domains (RFC 2606) and made-up COG lines; no network.
import { describe, expect, it } from "vitest";
import type { EnregistrementDomaine, EnregistrementNom, Etat } from "./publication";
import type { Territoire } from "./territoires";
import { indexTerritoires, lireNomsCog } from "./territoires-index";

const NOMS = lireNomsCog(
  "reg,cheflieu,libelle\n84,69123,Auvergne-Rhône-Alpes\n",
  "dep,reg,cheflieu,libelle\n01,84,01053,Ain\n69,84,69123,Rhône\n",
  "comer,libelle\n977,Saint-Barthélemy\n",
);

const territoire = (t: Partial<Territoire>): Territoire => ({
  commune: null,
  groupement: null,
  departement: null,
  region: null,
  niveau: "probable",
  ...t,
});

/** A made-up day: each domain with its territory, its web name classified. */
function jour(domaines: [string, Territoire | undefined, EnregistrementNom["categorie"], boolean | null][]): Etat {
  return {
    domaines: new Map(
      domaines.map(([d, t]) => [
        d,
        {
          domaine: d,
          nomWeb: `www.${d}`,
          ...(t === undefined ? {} : { territoire: t }),
        } as unknown as EnregistrementDomaine,
      ]),
    ),
    noms: new Map(
      domaines.map(([d, , categorie, horsUE]) => [
        `www.${d}`,
        { nom: `www.${d}`, domaine: d, categorie, horsUE } as unknown as EnregistrementNom,
      ]),
    ),
  };
}

describe("the territories' index (C.6, D.2)", () => {
  const etat = jour([
    [
      "mairie-b.example",
      territoire({ commune: { code: "01053", nom: "Bourg" }, departement: "01", region: "84" }),
      "France",
      false,
    ],
    [
      "mairie-a.example",
      territoire({ commune: { code: "01004", nom: "Ambérieu" }, departement: "01", region: "84" }),
      "hors d'Europe",
      true,
    ],
    [
      "agglo.example",
      territoire({ groupement: { nom: "Agglo Exemple", siren: "200000001" }, departement: "01", region: "84" }),
      "France",
      false,
    ],
    ["departement.example", territoire({ departement: "01", region: "84" }), "UE hors France", false],
    ["region.example", territoire({ region: "84" }), "non déterminé", null],
    [
      "lyon.example",
      territoire({ commune: { code: "69123", nom: "Lyon" }, departement: "69", region: "84" }),
      "France",
      false,
    ],
    [
      "ile.example",
      territoire({ commune: { code: "97701", nom: "Saint-Barthélemy" }, departement: "977" }),
      "France",
      false,
    ],
    ["ministere.example", undefined, "France", false],
  ]);
  const fichiers = indexTerritoires(etat, NOMS);
  const lire = (chemin: string) => JSON.parse(fichiers.get(chemin) ?? "null") as Record<string, unknown>;

  it("counts each région's and département's domains, and gives their councils' domains, with the COG's names", () => {
    expect(lire("index/territoires.json")).toEqual({
      regions: { "84": { nom: "Auvergne-Rhône-Alpes", domaines: 6, conseil: ["region.example"] } },
      departements: {
        "01": { nom: "Ain", region: "84", domaines: 4, conseil: ["departement.example"] },
        "69": { nom: "Rhône", region: "84", domaines: 1, conseil: [] },
        "977": { nom: "Saint-Barthélemy", region: null, domaines: 1, conseil: [] },
      },
    });
  });

  it("lists a département's communes and groups by their codes, never by a share, each domain with its category", () => {
    expect(lire("index/territoires/01.json")).toEqual({
      departement: "01",
      conseil: [{ domaine: "departement.example", categorie: "UE hors France", horsUE: false }],
      communes: [
        {
          code: "01004",
          nom: "Ambérieu",
          domaines: [{ domaine: "mairie-a.example", categorie: "hors d'Europe", horsUE: true }],
        },
        {
          code: "01053",
          nom: "Bourg",
          domaines: [{ domaine: "mairie-b.example", categorie: "France", horsUE: false }],
        },
      ],
      groupements: [
        {
          nom: "Agglo Exemple",
          siren: "200000001",
          domaines: [{ domaine: "agglo.example", categorie: "France", horsUE: false }],
        },
      ],
    });
    expect([...fichiers.keys()].sort()).toEqual([
      "index/territoires.json",
      "index/territoires/01.json",
      "index/territoires/69.json",
      "index/territoires/977.json",
    ]);
  });

  it("keeps a code the COG does not name, and says so", () => {
    const inconnu = indexTerritoires(
      jour([["x.example", territoire({ departement: "99", region: "99" }), "France", false]]),
      NOMS,
    );
    expect(JSON.parse(inconnu.get("index/territoires.json") ?? "null")).toEqual({
      regions: { "99": { nom: "99", nomInconnu: true, domaines: 1, conseil: [] } },
      departements: { "99": { nom: "99", nomInconnu: true, region: null, domaines: 1, conseil: ["x.example"] } },
    });
  });

  it("refuses a COG file whose columns changed", () => {
    expect(() => lireNomsCog("code,nom\n84,X\n", "dep,reg,libelle\n", "comer,libelle\n")).toThrow(
      /colonnes attendues absentes/,
    );
  });
});
