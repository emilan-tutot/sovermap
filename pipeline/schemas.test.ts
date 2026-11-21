// Tests of the schemas and of their small validator: made-up records, documentation names only (RFC 2606).
import { describe, expect, it } from "vitest";
import { fichiersSchemas, NOM, schemaDe, valider } from "./schemas";

const nomValide = {
  nom: "www.mairie.example",
  domaine: "mairie.example",
  provenances: ["dinum:2026-11-19"],
  types: ["Commune"],
  etat: "ok",
  echec: null,
  cname: [],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [{ as: 64496, plage: "192.0.2.0-192.0.2.255" }],
  cdn: null,
  exploitants: [{ role: "hébergé par", societe: "hebergeur-fr", preuve: "AS64496", niveau: "confirmé" }],
  categorie: "France",
  horsUE: false,
  niveau: "confirmé",
  controle: null,
};

describe("the schemas", () => {
  it("accept a valid record", () => {
    expect(valider(nomValide, NOM)).toEqual([]);
  });

  it("refuse a missing key, an unknown key, a wrong value and a name that is not a DNS name", () => {
    const sansEtat: Record<string, unknown> = { ...nomValide };
    delete sansEtat.etat;
    expect(valider(sansEtat, NOM)).toEqual([{ chemin: "$.etat", attendu: "présent" }]);
    expect(valider({ ...nomValide, ttl: 60 }, NOM)).toEqual([{ chemin: "$.ttl", attendu: "aucune autre clé" }]);
    expect(valider({ ...nomValide, niveau: "certain" }, NOM)[0]?.chemin).toBe("$.niveau");
    expect(valider({ ...nomValide, nom: "<script>.example" }, NOM)[0]?.chemin).toBe("$.nom");
  });

  it("know which file each schema checks, and are published", () => {
    expect(schemaDe("noms/ab/cd.json")).not.toBeNull();
    expect(schemaDe("domaines/00/ff.json")).not.toBeNull();
    expect(schemaDe("journal/2026/11/2026-11-21.json")).not.toBeNull();
    expect(schemaDe("README.md")).toBeNull();
    expect([...fichiersSchemas().keys()]).toEqual([
      "schemas/fragment-noms.schema.json",
      "schemas/fragment-domaines.schema.json",
      "schemas/journal.schema.json",
    ]);
  });
});
