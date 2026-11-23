// Tests of the measurement point's pilot: made-up records, documentation addresses (RFC 5737), AS (RFC 5398) and names
// (RFC 2606) only.
import { describe, expect, it } from "vitest";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import { TableIpToAsn } from "@/pipeline/reseau";
import type { ReferentielAs } from "@/pipeline/societes";
import {
  bilanDuPilote,
  domainesDuPilote,
  type ResultatDomaine,
  societesDesAdresses,
  SOUS_RESEAUX,
} from "@/scripts/lib/pilote-ecs";

const domaine = (d: string, perimetre: "État" | "hors État"): EnregistrementDomaine =>
  ({ domaine: d, nomWeb: `www.${d}`, perimetre }) as unknown as EnregistrementDomaine;
const nom = (d: string, cdn: boolean, societe: string | null = "cdn-exemple"): EnregistrementNom =>
  ({
    nom: `www.${d}`,
    domaine: d,
    etat: "ok",
    cdn: cdn ? { id: "cdn-exemple", methode: "cname" } : null,
    exploitants: [{ role: "diffusé par", societe, preuve: "AS64496", niveau: "confirmé" }],
  }) as unknown as EnregistrementNom;

describe("the measurement point's pilot", () => {
  it("passes an explicit subnet for France and for the United States, never none", () => {
    expect(SOUS_RESEAUX.map((s) => [s.pays, s.prefixe])).toEqual([
      ["France", "90.0.0.0/24"],
      ["États-Unis", "24.0.0.0/24"],
    ]);
    for (const s of SOUS_RESEAUX) expect(s.prefixe).toMatch(/^[0-9.]+[/]24$/);
  });

  it("draws the domains behind a CDN, « État » ones first, the same for a seed, at most n", () => {
    const domaines = [
      domaine("a.example", "hors État"),
      domaine("b.example", "État"),
      domaine("c.example", "État"),
      domaine("d.example", "État"),
      domaine("e.example", "hors État"),
    ];
    const noms = new Map(
      [nom("a.example", true), nom("b.example", true), nom("c.example", false), nom("d.example", true), nom("e.example", true)].map(
        (n) => [n.nom, n],
      ),
    );
    const tirage = domainesDuPilote(domaines, noms, 20261123, 3);
    expect(tirage).toHaveLength(3);
    // c.example is not behind a CDN; the two « État » ones come first, then one « hors État ».
    expect(tirage.slice(0, 2).map((d) => d.domaine).sort()).toEqual(["b.example", "d.example"]);
    expect(tirage[2]?.perimetre).toBe("hors État");
    expect(domainesDuPilote(domaines, noms, 20261123, 3)).toEqual(tirage);
    expect(tirage[0]?.publiees).toEqual(["cdn-exemple"]);
  });

  it("names the company behind each address, or its AS when the referential has none", () => {
    const iptoasn = new TableIpToAsn(
      ["192.0.2.0\t192.0.2.255\t64496\tFR\tEXEMPLE-UN", "198.51.100.0\t198.51.100.255\t64497\tUS\tEXEMPLE-DEUX"].join("\n"),
    );
    const tableAs = { version: "essai", as: { "64496": { societe: "hebergeur-fr" } } } as unknown as ReferentielAs;
    expect(societesDesAdresses(["192.0.2.10", "198.51.100.7", "192.0.2.11", "203.0.113.1"], iptoasn, tableAs)).toEqual([
      "AS64497",
      "hebergeur-fr",
    ]);
  });

  it("counts the domains whose companies change with the subnet, over those every subnet got an answer for", () => {
    const r = (d: string, fr: string[] | null, us: string[] | null): ResultatDomaine => ({
      domaine: d,
      nomWeb: `www.${d}`,
      perimetre: "État",
      publiees: ["cdn-exemple"],
      parSousReseau: { France: fr, "États-Unis": us },
    });
    const bilan = bilanDuPilote([
      r("a.example", ["cdn-exemple"], ["cdn-exemple"]),
      r("b.example", ["cdn-exemple"], ["autre-cdn"]),
      r("c.example", ["cdn-exemple"], null),
      ...Array.from({ length: 97 }, (_, i) => r(`s${i}.example`, ["cdn-exemple"], ["cdn-exemple"])),
    ]);
    expect(bilan).toMatchObject({ domaines: 100, compares: 99, changent: 1, partPourcent: 1, auDelaDuSeuil: false });
    expect(bilan.exemples.map((e) => e.domaine)).toEqual(["b.example"]);
    const au = bilanDuPilote([r("a.example", ["x"], ["y"]), r("b.example", ["x"], ["x"])]);
    expect(au).toMatchObject({ changent: 1, partPourcent: 50, auDelaDuSeuil: true });
  });
});
