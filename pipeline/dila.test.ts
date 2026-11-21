// Tests of the DILA reader: a made-up Référentiel, documentation names only (RFC 2606).
import { describe, expect, it } from "vitest";
import { hoteDuSite, lireDila } from "./dila";

const service = (id: string, nom: string, sites: string[], enfants: string[] = [], extra: object = {}) => ({
  id,
  nom,
  sigle: null,
  type_organisme: "Administration centrale (ou Ministère)",
  site_internet: sites.map((valeur) => ({ libelle: "", valeur })),
  hierarchie: enfants.map((service) => ({ type_hierarchie: "Service Fils", service })),
  ...extra,
});

describe("the DILA Référentiel", () => {
  it("keeps the hosts of the websites and finds each service's ministry", () => {
    const json = JSON.stringify({
      service: [
        service("g", "Gouvernement (Premier ministre et ministères)", [], ["m1"], { type_organisme: "" }),
        service("a1", "Autorité Exemple", ["https://autorite.example"], [], {
          type_organisme: "Autorité administrative indépendante",
        }),
        service("m1", "Ministère Exemple", ["https://www.ministere.example/"], ["d1"]),
        service("d1", "Direction Exemple", ["direction.example/page", "mailto:x@y.example"], ["b1"]),
        service("b1", "Bureau Exemple", ["https://Bureau.Example"]),
      ],
    });
    const ref = lireDila(json, "dila_refOrga_admin_Etat_fr_20260101.zip");
    expect(ref.services.get("d1")).toEqual({
      id: "d1",
      nom: "Direction Exemple",
      sigle: null,
      type: "Administration centrale (ou Ministère)",
      parent: "m1",
      ministere: "m1",
      hotes: ["direction.example"],
    });
    expect(ref.services.get("b1")?.ministere).toBe("m1");
    expect(ref.services.get("m1")?.ministere).toBe("m1");
    expect(ref.services.get("g")?.ministere).toBeNull();
    expect(ref.services.get("a1")?.ministere).toBeNull();
    expect(ref.services.get("b1")?.hotes).toEqual(["bureau.example"]);
  });

  it("never keeps a person, an e-mail address or a phone", () => {
    const json = JSON.stringify({
      service: [
        service("s1", "Service Exemple", ["https://service.example"], [], {
          affectation_personne: [{ personne: { nom: "Personne Exemple" } }],
          adresse_courriel: ["contact@service.example"],
          telephone: [{ valeur: "01 00 00 00 00" }],
        }),
      ],
    });
    expect(JSON.stringify([...lireDila(json, "f").services.values()])).not.toMatch(/Personne|contact@|01 00/);
  });

  it("reads a host only from a web address", () => {
    expect(hoteDuSite("https://www.site.example/a?b")).toBe("www.site.example");
    expect(hoteDuSite("site.example")).toBe("site.example");
    expect(hoteDuSite("ftp://site.example")).toBeNull();
    expect(hoteDuSite("mailto:contact@site.example")).toBeNull();
    expect(hoteDuSite("https://nom:secret@site.example/")).toBeNull();
    expect(hoteDuSite("site.example:8080/page")).toBe("site.example");
    expect(hoteDuSite("")).toBeNull();
  });
});
