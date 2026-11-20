// Tests of the reference list: made-up lists and Référentiel, documentation names only (RFC 2606), and a small
// made-up suffix list in which « gouv.example » plays .gouv.fr's part.
import { describe, expect, it } from "vitest";
import type { ReferentielDila } from "./dila";
import { construireListe, uniteDe } from "./perimetre";
import { lireListeSuffixes } from "./psl";

const suffixes = lireListeSuffixes(
  ["// VERSION: essai", "example", "gouv.example", ...Array.from({ length: 1000 }, (_, i) => `rempli${i}.test`)].join(
    "\n",
  ),
);
const plateformes = new Set(["createur.example"]);

const dila: ReferentielDila = {
  fichier: "dila_refOrga_admin_Etat_fr_20260101.zip",
  services: new Map([
    [
      "s1",
      {
        id: "s1",
        nom: "Service Exemple",
        sigle: null,
        type: null,
        parent: "m1",
        ministere: "m1",
        hotes: ["www.service.example", "page.createur.example"],
      },
    ],
  ]),
};

describe("the reference list", () => {
  const liste = construireListe(
    [
      {
        date: "2024-12-11",
        csv: "name,type\nwww.mairie.example,Commune\nmairie.example,Commune\nrecette.mairie.example,Commune\n",
      },
      {
        date: "2026-11-19",
        csv: "name,type\nwww.mairie.example,Commune\nportail.ministere.gouv.example,Gouvernement\nclub.createur.example,\n",
      },
    ],
    dila,
    suffixes,
    plateformes,
    ".gouv.example",
  );

  it("keeps each name's provenances and types, and leaves internal names out", () => {
    expect(liste.noms.get("www.mairie.example")).toEqual({
      nom: "www.mairie.example",
      domaine: "mairie.example",
      provenances: ["dinum:2024-12-11", "dinum:2026-11-19"],
      types: ["Commune"],
      organismes: [],
    });
    expect(liste.noms.has("recette.mairie.example")).toBe(false);
    expect(liste.exclus.get("environnement")).toBe(1);
  });

  it("gives each unit its web name, adding the apex when no www. is listed", () => {
    expect(liste.domaines.get("mairie.example")?.nomWeb).toBe("www.mairie.example");
    const ministere = liste.domaines.get("ministere.gouv.example");
    expect(ministere?.nomWeb).toBe("ministere.gouv.example");
    expect(liste.noms.get("ministere.gouv.example")?.provenances).toEqual(["domaine"]);
  });

  it("puts .gouv and the DILA's websites in the « État » perimeter, never a platform's page", () => {
    expect(liste.domaines.get("ministere.gouv.example")?.perimetre).toBe("État");
    expect(liste.domaines.get("ministere.gouv.example")?.raisons).toEqual(["gouv.fr"]);
    expect(liste.domaines.get("service.example")).toMatchObject({
      perimetre: "État",
      raisons: ["dila"],
      organismes: ["s1"],
      ministeres: ["m1"],
    });
    expect(liste.domaines.get("mairie.example")?.perimetre).toBe("hors État");
    expect(liste.domaines.get("page.createur.example")).toMatchObject({ perimetre: "hors État", plateforme: true });
  });

  it("makes each name on a third-party platform its own unit", () => {
    expect(uniteDe("club.createur.example", suffixes, plateformes)).toBe("club.createur.example");
    expect(uniteDe("www.mairie.example", suffixes, plateformes)).toBe("mairie.example");
    expect(liste.domaines.get("club.createur.example")?.nomWeb).toBe("club.createur.example");
  });
});
