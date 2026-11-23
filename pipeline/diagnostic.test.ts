// Tests of the failures' diagnosis: made-up records, documentation names and AS numbers only (RFC 2606, RFC 5398).
import { describe, expect, it } from "vitest";
import { diagnosticDesEchecs } from "./diagnostic";
import type { EnregistrementDomaine, EnregistrementNom, Etat, Hote } from "./publication";

const nom = (n: string, d: string, code: string | null): EnregistrementNom => ({
  nom: n,
  domaine: d,
  provenances: ["dinum:2026-11-19"],
  types: [],
  etat: code === null ? "ok" : "echec",
  echec: code === null ? null : { code, confirmePar: null },
  cname: [],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [],
  cdn: null,
  exploitants: [],
  categorie: "non déterminé",
  horsUE: null,
  niveau: "non déterminé",
  controle: null,
});

const hote = (h: string, societe: string | null, preuve: string): Hote => ({
  hote: h,
  etat: "ok",
  as: [64496],
  exploitants: [
    { role: "hébergé par", societe, preuve, niveau: "probable" },
    { role: "hébergé par", societe, preuve, niveau: "probable" },
  ],
  categorie: "France",
  horsUE: false,
  niveau: "probable",
});

const domaine = (
  d: string,
  o: { zone?: string; mx?: boolean; hotes?: Hote[] } = {},
): EnregistrementDomaine => ({
  domaine: d,
  nomWeb: `www.${d}`,
  perimetre: "État",
  raisons: [],
  plateforme: false,
  organismes: 0,
  ministeres: [],
  noms: 1,
  zone: {
    etat: o.zone === undefined ? "ok" : "echec",
    echec: o.zone === undefined ? null : { code: o.zone, confirmePar: null },
    ns: [],
    soa: null,
    ds: null,
    caa: [],
  },
  serveursDeNoms: { hotes: o.hotes ?? [], categorie: "France", horsUE: false, niveau: "probable" },
  messagerie: {
    etat: o.mx === true ? "echec" : "aucun",
    mx: [],
    hotes: [],
    categorie: "non déterminé",
    horsUE: null,
    niveau: "non déterminé",
    spf: null,
  },
});

function etat(domaines: EnregistrementDomaine[], noms: EnregistrementNom[]): Etat {
  return {
    domaines: new Map(domaines.map((d) => [d.domaine, d])),
    noms: new Map(noms.map((n) => [n.nom, n])),
  };
}

describe("diagnosticDesEchecs", () => {
  it("lists each failing domain once, with the layers that failed, in the order of their names", () => {
    const jour = etat(
      [
        domaine("c.example", { hotes: [hote("ns1.host.example", "hebergeur", "AS64496")] }),
        domaine("a.example", { zone: "TIMEOUT" }),
        domaine("b.example", { mx: true }),
        domaine("sain.example"),
      ],
      [
        nom("www.c.example", "c.example", "SERVFAIL"),
        nom("www.a.example", "a.example", null),
        nom("www.b.example", "b.example", null),
        nom("www.sain.example", "sain.example", null),
      ],
    );
    expect(diagnosticDesEchecs(jour)).toEqual([
      { domaine: "a.example", zone: "TIMEOUT", messagerie: false, nomWeb: "www.a.example", web: null, serveursDeNoms: [] },
      { domaine: "b.example", zone: null, messagerie: true, nomWeb: "www.b.example", web: null, serveursDeNoms: [] },
      {
        domaine: "c.example",
        zone: null,
        messagerie: false,
        nomWeb: "www.c.example",
        web: "SERVFAIL",
        // One line per server; its operators without repeats.
        serveursDeNoms: [{ hote: "ns1.host.example", exploitants: ["hebergeur"] }],
      },
    ]);
  });

  it("names an operator by its proof when no company is established", () => {
    const jour = etat(
      [domaine("d.example", { hotes: [hote("ns.d.example", null, "AS64497")] })],
      [nom("www.d.example", "d.example", "TIMEOUT")],
    );
    expect(diagnosticDesEchecs(jour)[0]?.serveursDeNoms).toEqual([{ hote: "ns.d.example", exploitants: ["AS64497"] }]);
  });

  it("is empty on a day without failures", () => {
    expect(diagnosticDesEchecs(etat([domaine("e.example")], [nom("www.e.example", "e.example", null)]))).toEqual([]);
  });
});
