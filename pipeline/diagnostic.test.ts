// Tests of the failures' diagnosis: made-up records, documentation names and AS numbers only (RFC 2606, RFC 5398).
import { describe, expect, it } from "vitest";
import { diagnosticDesEchecs, FICHIER_DIAGNOSTIC } from "./diagnostic";
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
    const sans = { confirme: false, inacheve: false };
    expect(diagnosticDesEchecs(jour)).toEqual([
      { domaine: "a.example", zone: "TIMEOUT", messagerie: false, nomWeb: "www.a.example", web: null, ...sans, serveursDeNoms: [] },
      { domaine: "b.example", zone: null, messagerie: true, nomWeb: "www.b.example", web: null, ...sans, serveursDeNoms: [] },
      {
        domaine: "c.example",
        zone: null,
        messagerie: false,
        nomWeb: "www.c.example",
        web: "SERVFAIL",
        ...sans,
        // One line per server; its operators without repeats.
        serveursDeNoms: [{ hote: "ns1.host.example", exploitants: ["hebergeur"] }],
      },
    ]);
  });

  it("says which failures Quad9 shared, as the guard counts them, and which domains a stop left unfinished", () => {
    const confirme = (n: EnregistrementNom): EnregistrementNom => ({ ...n, echec: { code: "SERVFAIL", confirmePar: "quad9" } });
    const zoneConfirmee = domaine("z.example", { zone: "SERVFAIL" });
    zoneConfirmee.zone.echec = { code: "SERVFAIL", confirmePar: "quad9" };
    const jour = etat(
      [zoneConfirmee, domaine("w.example"), domaine("m.example", { mx: true }), domaine("i.example"), domaine("n.example")],
      [
        nom("www.z.example", "z.example", null),
        confirme(nom("www.w.example", "w.example", "SERVFAIL")),
        nom("www.m.example", "m.example", null),
        nom("www.i.example", "i.example", "ERREUR"),
        nom("www.n.example", "n.example", "SERVFAIL"),
      ],
    );
    const lignes = diagnosticDesEchecs(jour, { pannesMx: new Set(["m.example"]), inacheves: new Set(["i.example"]) });
    expect(lignes.map((l) => [l.domaine, l.confirme, l.inacheve])).toEqual([
      ["i.example", false, true],
      ["m.example", true, false],
      ["n.example", false, false],
      ["w.example", true, false],
      ["z.example", true, false],
    ]);
  });

  it("is written beside the output, never inside it (the release takes the whole published folder)", () => {
    expect(FICHIER_DIAGNOSTIC).toBe("diagnostic.json");
    expect(FICHIER_DIAGNOSTIC).not.toContain("/");
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
