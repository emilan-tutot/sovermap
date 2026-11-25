// Tests of the DILA reader: a made-up Référentiel, documentation names only (RFC 2606).
import { describe, expect, it } from "vitest";
import { hoteDuSite, lireDila, nomNeutre } from "./dila";

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
  it("makes a name plain text for a spreadsheet, counts it, and keeps its service (open CSV files)", () => {
    const noms = [
      "=Exemple",
      "+Exemple",
      "-Exemple",
      " @=Exemple",
      "Nom\tExemple",
      "Nom\r\nExemple",
      "Nom; =Exemple",
      "Service; Exemple",
      'A;"=1+1;',
      "=",
    ];
    const json = JSON.stringify({ service: noms.map((n, i) => service(`s${i}`, n, [`https://s${i}.example`])) });
    const ref = lireDila(json, "f");
    expect([...ref.services.values()].map((s) => [s.nom, s.hotes])).toEqual([
      ["Exemple", ["s0.example"]],
      ["Exemple", ["s1.example"]],
      ["Exemple", ["s2.example"]],
      ["Exemple", ["s3.example"]],
      ["Nom Exemple", ["s4.example"]],
      ["Nom Exemple", ["s5.example"]],
      ["Nom; Exemple", ["s6.example"]],
      ["Service; Exemple", ["s7.example"]],
      ["A; 1+1;", ["s8.example"]],
      // A name of signs only is no name: the service keeps its place, named by its identifier (it has no acronym).
      ["s9", ["s9.example"]],
    ]);
    expect(ref.neutralises).toBe(9);
    expect(nomNeutre("A; -B; C")).toBe("A; B; C");
  });

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

  it("never keeps a name or an acronym that holds a person's name or a phone, and counts it (P13)", () => {
    const json = JSON.stringify({
      service: [
        service("s1", "Secrétariat de Mme Exemple", ["https://s1.example"], [], { sigle: "SME" }),
        service("s2", "Accueil 01 23 45 67 89", ["https://s2.example"], [], { sigle: "Cabinet de M. Exemple" }),
        service("s3", "Service Exemple", ["https://s3.example"]),
      ],
    });
    const ref = lireDila(json, "f");
    // Its acronym names the first; the second has none left, so its identifier does.
    expect([...ref.services.values()].map((s) => [s.id, s.nom, s.sigle])).toEqual([
      ["s1", "SME", "SME"],
      ["s2", "s2", null],
      ["s3", "Service Exemple", null],
    ]);
    expect(ref.ecarts).toEqual({ dila: { "nom de personne": 2, téléphone: 1 } });
  });

  it("controls a name whole, before its cut to 300 characters, and never counts a service left out for its identifier", () => {
    // A phone across the 300th character: cut first, « 01 23 4 » would pass the control (the review of PR 19).
    const long = `Service ${"x".repeat(284)} 01 23 45 67 89`;
    expect(long.indexOf("01 23")).toBe(293);
    const json = JSON.stringify({
      service: [
        service("s1", long, ["https://s1.example"]),
        service("identifiant invalide", "Secrétariat de Mme Exemple", ["https://s2.example"]),
      ],
    });
    const ref = lireDila(json, "f");
    expect([...ref.services.values()].map((s) => [s.id, s.nom])).toEqual([["s1", "s1"]]);
    expect(ref.ecarts).toEqual({ dila: { téléphone: 1 } });
  });

  it("keeps of the type column its one known value, the ministry's; any other is never copied (P13)", () => {
    const json = JSON.stringify({
      service: [
        service("m", "Ministère de l’Exemple", ["https://m.example"], ["d"]),
        service("d", "Direction de l’Exemple", ["https://d.example"], [], { type_organisme: "Direction, Exemple" }),
      ],
    });
    const services = lireDila(json, "f").services;
    expect(services.get("m")?.type).toBe("Administration centrale (ou Ministère)");
    expect(services.get("d")?.type).toBeNull();
    expect(services.get("d")?.ministere).toBe("m");
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
