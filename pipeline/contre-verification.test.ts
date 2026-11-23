// Tests of the cross-check (C.9): the draw by strata on a made-up state (names under .example, RFC 2606; AS numbers
// for documentation, RFC 5398), and the comparisons. No network.
import { describe, expect, it } from "vitest";
import { comparerAs, comparerCategorie, comparerNoms, partConcordante, STRATES, tirer } from "./contre-verification";
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

  it("draws a domain once though two strata take it, a record shortened by its bound too, and the SIG's operators", () => {
    const { domaines, noms } = etat();
    // A State domain behind a CDN, with mail: « État » takes it first, never « CDN » nor « messagerie » again.
    const double = domaine("double.gouv.example", "État", ["gouv.fr"], ["mx.double.gouv.example"]);
    domaines.set(double.domaine, double);
    noms.set("www.double.gouv.example", nom("double.gouv.example", [], "cdn-exemple"));
    // A record too large for its fragment: drawn like the others (its lists are compared by inclusion).
    const long = { ...domaine("long.gouv.example", "État", ["gouv.fr"]), tronque: true as const };
    domaines.set(long.domaine, long);
    noms.set("www.long.gouv.example", nom("long.gouv.example"));
    const vus = new Set<string>();
    for (let graine = 20261101; graine < 20261131; graine += 1) {
      const tires = tirer(domaines, noms, graine);
      expect(new Set(tires.map((t) => t.domaine.domaine)).size).toBe(tires.length);
      for (const t of tires) vus.add(`${t.strate} ${t.domaine.domaine}`);
    }
    // Taken by « État » on some days; on the others, a later stratum may take it, never twice in one draw.
    expect(vus.has("État double.gouv.example")).toBe(true);
    expect(vus.has("État long.gouv.example")).toBe(true);
    // With the SIG's or the MESR's lists in the state, an operator is a State domain they name.
    const sig = domaine("operateur-sig.example", "État", ["sig"]);
    domaines.set(sig.domaine, sig);
    noms.set("www.operateur-sig.example", nom("operateur-sig.example"));
    const operateurs = tirer(domaines, noms, 20261122).filter((t) => t.strate === "opérateur");
    expect(operateurs.map((t) => t.domaine.domaine)).toEqual(["operateur-sig.example"]);
  });

  it("compares names as sets, a shortened list by inclusion, and AS as « every one found elsewhere is published »", () => {
    expect(comparerNoms(["NS1.example.", "ns2.example"], ["ns2.example", "ns1.example"])).toBe("concorde");
    expect(comparerNoms(["ns1.example"], ["ns1.example", "ns3.example"])).toBe("diffère");
    expect(comparerNoms(["ns1.example"], null)).toBe("non vérifiable");
    // A list shortened by the record's bound (« tronque »): each published name found elsewhere is enough.
    expect(comparerNoms(["ns1.example", "ns2.example"], ["ns1.example", "ns2.example", "ns3.example"], true)).toBe(
      "concorde",
    );
    expect(comparerNoms(["ns1.example", "ns9.example"], ["ns1.example", "ns2.example"], true)).toBe("diffère");
    // An empty answer is an answer: a published list that is not empty differs from it.
    expect(comparerNoms(["mx.example"], [])).toBe("diffère");
    expect(comparerNoms([], [])).toBe("concorde");
    expect(comparerAs([64496, 64497], [64496])).toBe("concorde");
    expect(comparerAs([64496], [64511])).toBe("diffère");
    expect(comparerAs([64496], [])).toBe("non vérifiable");
  });

  it("compares the category of an ultimate parent's country with the published one, never a « non déterminé »", () => {
    expect(comparerCategorie("France", "France")).toBe("concorde");
    expect(comparerCategorie("France", "hors d'Europe")).toBe("diffère");
    expect(comparerCategorie("non déterminé", "France")).toBe("non vérifiable");
    expect(comparerCategorie(null, "France")).toBe("non vérifiable");
    expect(comparerCategorie("France", null)).toBe("non vérifiable");
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
