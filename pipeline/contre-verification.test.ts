// Tests of the cross-check (C.9): the draw by strata on a made-up state (names under .example, RFC 2606; AS numbers
// for documentation, RFC 5398), and the comparisons. No network.
import { describe, expect, it } from "vitest";
import { comparerAs, comparerNoms, partConcordante, STRATES, tirer } from "./contre-verification";
import type { EnregistrementDomaine, EnregistrementNom } from "./publication";

const domaine = (
  d: string,
  perimetre: "État" | "hors État",
  raisons: string[] = [],
  mx: string[] = [],
): EnregistrementDomaine => ({
  domaine: d,
  nomWeb: `www.${d}`,
  perimetre,
  raisons,
  plateforme: false,
  organismes: 0,
  ministeres: [],
  noms: 1,
  zone: { etat: "ok", echec: null, ns: [`ns1.${d}`], soa: `ns1.${d}`, ds: false, caa: [] },
  serveursDeNoms: { hotes: [], categorie: "France", horsUE: false, niveau: "probable" },
  messagerie: {
    etat: mx.length > 0 ? "ok" : "aucun",
    mx: mx.map((hote) => ({ preference: 10, hote })),
    hotes: [],
    categorie: "non déterminé",
    horsUE: null,
    niveau: "non déterminé",
    spf: null,
  },
});

const nom = (d: string, types: string[] = [], cdn: string | null = null, etat = "ok"): EnregistrementNom => ({
  nom: `www.${d}`,
  domaine: d,
  provenances: ["dinum:2026-11-19"],
  types,
  etat: etat as EnregistrementNom["etat"],
  echec: null,
  cname: [],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [{ as: 64496, plage: "192.0.2.0-192.0.2.255" }],
  cdn: cdn === null ? null : { id: cdn, methode: "cname" },
  exploitants: [],
  categorie: "France",
  horsUE: false,
  niveau: "probable",
  controle: null,
});

/** A made-up state: 15 State domains (5 of them operators outside gouv.fr), 8 local authorities, 8 behind a CDN, 8 with MX. */
function etat() {
  const domaines = new Map<string, EnregistrementDomaine>();
  const noms = new Map<string, EnregistrementNom>();
  const ajouter = (d: EnregistrementDomaine, n: EnregistrementNom) => {
    domaines.set(d.domaine, d);
    noms.set(n.nom, n);
  };
  for (let i = 0; i < 10; i += 1)
    ajouter(domaine(`etat${i}.gouv.example`, "État", ["gouv.fr"]), nom(`etat${i}.gouv.example`));
  for (let i = 0; i < 5; i += 1)
    ajouter(domaine(`operateur${i}.example`, "État", ["dila"]), nom(`operateur${i}.example`));
  for (let i = 0; i < 8; i += 1)
    ajouter(domaine(`mairie${i}.example`, "hors État"), nom(`mairie${i}.example`, ["Commune"]));
  for (let i = 0; i < 8; i += 1)
    ajouter(domaine(`cdn${i}.example`, "hors État"), nom(`cdn${i}.example`, [], "cdn-exemple"));
  for (let i = 0; i < 8; i += 1) {
    ajouter(domaine(`courrier${i}.example`, "hors État", [], [`mx.courrier${i}.example`]), nom(`courrier${i}.example`));
  }
  // Never drawn: its web name did not answer.
  ajouter(domaine("panne.gouv.example", "État", ["gouv.fr"]), nom("panne.gouv.example", [], null, "echec"));
  return { domaines, noms };
}

describe("the cross-check (C.9)", () => {
  it("draws 30 domains by strata, each once, the same for the same seed", () => {
    const { domaines, noms } = etat();
    const tires = tirer(domaines, noms, 20261122);
    expect(tires).toHaveLength(30);
    for (const { strate, nombre } of STRATES) expect(tires.filter((t) => t.strate === strate)).toHaveLength(nombre);
    expect(new Set(tires.map((t) => t.domaine.domaine)).size).toBe(30);
    expect(tires.map((t) => t.domaine.domaine)).not.toContain("panne.gouv.example");
    // Without the SIG's or the MESR's lists, an operator is a State domain of the DILA's Référentiel outside gouv.fr.
    for (const t of tires.filter((x) => x.strate === "opérateur")) expect(t.domaine.domaine).toMatch(/^operateur/);
    expect(tirer(domaines, noms, 20261122).map((t) => t.domaine.domaine)).toEqual(tires.map((t) => t.domaine.domaine));
    expect(tirer(domaines, noms, 20261123).map((t) => t.domaine.domaine)).not.toEqual(
      tires.map((t) => t.domaine.domaine),
    );
  });

  it("compares names as sets, and AS as « every one found elsewhere is published »", () => {
    expect(comparerNoms(["NS1.example.", "ns2.example"], ["ns2.example", "ns1.example"])).toBe("concorde");
    expect(comparerNoms(["ns1.example"], ["ns1.example", "ns3.example"])).toBe("diffère");
    expect(comparerNoms(["ns1.example"], null)).toBe("non vérifiable");
    expect(comparerAs([64496, 64497], [64496])).toBe("concorde");
    expect(comparerAs([64496], [64511])).toBe("diffère");
    expect(comparerAs([64496], [])).toBe("non vérifiable");
  });

  it("counts the share of the layers that agree, among those checked", () => {
    const c = (verdict: "concorde" | "diffère" | "non vérifiable") => ({
      couche: "x",
      verdict,
      publie: "",
      independant: "",
      source: "",
    });
    expect(partConcordante([c("concorde"), c("concorde"), c("diffère"), c("non vérifiable")])).toEqual({
      concordent: 2,
      verifies: 3,
      part: 2 / 3,
    });
    expect(partConcordante([c("non vérifiable")]).part).toBeNull();
  });
});
