// Tests of the publication: fragments, hysteresis, journal, circuit breaker and figures. Made-up records, documentation
// names and AS numbers only (RFC 2606, RFC 5398).
import { describe, expect, it } from "vitest";
import { siegeRetenu } from "./societes";
import {
  bilan,
  chiffres,
  type EnregistrementDomaine,
  type EnregistrementNom,
  type Etat,
  fragments,
  index,
  jsonStable,
  journal,
  seau,
} from "./publication";

const nom = (n: string, domaine: string, societe: string, horsUE: boolean): EnregistrementNom => ({
  nom: n,
  domaine,
  provenances: ["dinum:2026-11-19"],
  types: [],
  etat: "ok",
  echec: null,
  cname: [],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [{ as: horsUE ? 64501 : 64496, plage: null }],
  cdn: null,
  exploitants: [{ role: "hébergé par", societe, preuve: "AS64496", niveau: "confirmé", niveauSociete: "confirmé" }],
  categorie: horsUE ? "hors d'Europe" : "France",
  horsUE,
  niveau: "confirmé",
  controle: { resolveur: "quad9", accord: true },
});

const domaine = (d: string, perimetre: "État" | "hors État" = "État"): EnregistrementDomaine => ({
  domaine: d,
  nomWeb: `www.${d}`,
  perimetre,
  raisons: perimetre === "État" ? ["gouv.fr"] : [],
  plateforme: false,
  organismes: 0,
  ministeres: [],
  noms: 1,
  zone: { etat: "ok", echec: null, ns: [`ns1.${d}`], soa: `ns1.${d}`, ds: false, caa: [] },
  serveursDeNoms: { hotes: [], categorie: "France", horsUE: false, niveau: "probable" },
  messagerie: {
    etat: "aucun",
    mx: [],
    hotes: [],
    categorie: "non déterminé",
    horsUE: null,
    niveau: "non déterminé",
    spf: null,
  },
});

/** A state of `n` domains, the first `horsUE` of them served from outside the EU. */
function etat(n: number, horsUE: number): Etat {
  const noms = new Map<string, EnregistrementNom>();
  const domaines = new Map<string, EnregistrementDomaine>();
  for (let i = 0; i < n; i += 1) {
    const d = `d${i}.example`;
    domaines.set(d, domaine(d));
    noms.set(`www.${d}`, nom(`www.${d}`, d, i < horsUE ? "cloud-us" : "hebergeur-fr", i < horsUE));
  }
  return { noms, domaines };
}

describe("the fragments", () => {
  it("put each record in its own bucket for ever, sorted, with the folder's checksums", () => {
    const e = etat(300, 0);
    const f = fragments("noms", e.noms);
    const [haut, bas] = seau("www.d0.example").split("/");
    const fragment = JSON.parse(f.get(`noms/${haut}/${bas}.json`) ?? "{}") as { noms: EnregistrementNom[] };
    expect(fragment.noms.map((x) => x.nom)).toContain("www.d0.example");
    expect([...f.keys()].filter((k) => k.endsWith("sommes.json")).length).toBeGreaterThan(0);
    for (const [chemin, texte] of f) expect(Buffer.byteLength(texte), chemin).toBeLessThanOrEqual(8 * 1024);
    expect(fragments("noms", [...e.noms.entries()].reverse())).toEqual(f);
  });

  it("cut a heavy bucket into parts of 8 KB at most, the first one saying how many, all in the checksums", () => {
    const lourds = new Map(
      Array.from(
        { length: 6 },
        (_, i) => [`d${i}.example`, { domaine: `d${i}.example`, texte: "x".repeat(1800) }] as const,
      ),
    );
    const f = fragments("domaines", lourds, () => "00/00");
    expect([...f.keys()].filter((k) => k.startsWith("domaines/00/00")).sort()).toEqual([
      "domaines/00/00.1.json",
      "domaines/00/00.json",
    ]);
    for (const [chemin, texte] of f) expect(Buffer.byteLength(texte), chemin).toBeLessThanOrEqual(8 * 1024);
    expect(JSON.parse(f.get("domaines/00/00.json") ?? "{}").parties).toBe(2);
    expect(Object.keys(JSON.parse(f.get("domaines/00/sommes.json") ?? "{}"))).toEqual(["00.1.json", "00.json"]);
    const tous = [...f.entries()]
      .filter(([k]) => !k.endsWith("sommes.json"))
      .flatMap(([, texte]) =>
        (JSON.parse(texte) as { domaines: { domaine: string }[] }).domaines.map((d) => d.domaine),
      );
    expect(tous.sort()).toEqual([...lourds.keys()].sort());
  });

  it("write the same text whatever the order of the keys", () => {
    expect(jsonStable({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
});

describe("the hysteresis, the journal and the circuit breaker", () => {
  it("publishes the initial state on the first day, without changes", () => {
    const b = bilan(etat(10, 2), null, null, false);
    expect(b.etatInitial).toBe(true);
    expect(b.changements).toEqual([]);
    expect(JSON.parse(journal("2026-11-21", b))).toEqual({
      date: "2026-11-21",
      etatInitial: true,
      reglesChangees: false,
      changements: [],
    });
  });

  it("confirms a change only when two collections in a row agree", () => {
    const publie = etat(10, 0);
    const un = etat(10, 1);
    // First day of the move: yesterday did not see it; nothing changes.
    const b1 = bilan(un, publie, publie, false);
    expect(b1.changements).toEqual([]);
    expect(b1.etat.noms.get("www.d0.example")?.horsUE).toBe(false);
    // Second day: today agrees with yesterday; the move is confirmed and enters the journal.
    const b2 = bilan(un, un, publie, false);
    expect(b2.etat.noms.get("www.d0.example")?.horsUE).toBe(true);
    expect(b2.changements).toEqual([
      {
        domaine: "d0.example",
        couche: "adresses",
        avant: "France|false|hebergeur-fr|",
        apres: "hors d'Europe|true|cloud-us|",
      },
    ]);
  });

  it("never journals a change of rules: the state is rebased on yesterday, classified with the new rules", () => {
    const publie = etat(10, 0);
    const nouvellesRegles = etat(10, 3);
    const b = bilan(nouvellesRegles, nouvellesRegles, publie, true);
    expect(b.reglesChangees).toBe(true);
    expect(b.changements).toEqual([]);
    expect(b.etat.noms.get("www.d0.example")?.horsUE).toBe(true);
  });

  it("measures the share of domains whose hosting changed between yesterday and today", () => {
    const b = bilan(etat(100, 3), etat(100, 0), etat(100, 0), false);
    expect(b.disjoncteur).toEqual({ compares: 100, changes: 3, part: 0.03 });
  });

  it("compares layer by layer: a layer that fails on either day is not a change", () => {
    const hier = etat(100, 0);
    const jour = etat(100, 0);
    // Today, the zones of 5 domains fail: their name servers' layer is undetermined, their addresses are compared.
    for (let i = 0; i < 5; i += 1) {
      const d = jour.domaines.get(`d${i}.example`) as EnregistrementDomaine;
      jour.domaines.set(d.domaine, {
        ...d,
        zone: { ...d.zone, etat: "echec", echec: { code: "SERVFAIL", confirmePar: null } },
      });
    }
    expect(bilan(jour, hier, hier, false).disjoncteur).toEqual({ compares: 100, changes: 0, part: 0 });
  });

  it("never compares a layer one of the two days did not determine (a host measured on one family)", () => {
    const hier = etat(10, 0);
    const aujourdhui = etat(10, 0);
    // d0's name servers: a host measured on one family today, its layer « non déterminé ».
    const d = aujourdhui.domaines.get("d0.example") as EnregistrementDomaine;
    aujourdhui.domaines.set(d.domaine, {
      ...d,
      serveursDeNoms: { hotes: [], categorie: "non déterminé", horsUE: null, niveau: "non déterminé" },
    });
    const b = bilan(aujourdhui, hier, hier, false);
    // Its other layer (the addresses) is still compared, and nothing changed: no change, nothing in the journal.
    expect(b.disjoncteur).toEqual({ compares: 10, changes: 0, part: 0 });
    expect(b.changements).toEqual([]);
  });

  it("files a domain under the farther of its serving company's seat and its parent's (ARRÊT 2)", () => {
    // d0 is served by an American subsidiary of a French group, d1 by a French subsidiary of an American group: each
    // thread goes to the farther seat. d2's company has no established parent: no thread at all.
    const e = etat(3, 0);
    for (const [i, societe] of ["filiale-us", "filiale-fr", "relais-il"].entries()) {
      const n = e.noms.get(`www.d${i}.example`) as EnregistrementNom;
      e.noms.set(n.nom, { ...n, exploitants: n.exploitants.map((x) => ({ ...x, societe })) });
    }
    const fichiers = index(e, {
      as: new Map(),
      societes: new Map([
        [
          "filiale-us",
          {
            nom: "Filiale, Inc.",
            pays: "US",
            mere: "groupe-fr",
            paysMere: "FR",
            paysRetenu: siegeRetenu("US", "FR").pays,
            categorie: "hors d'Europe",
          },
        ],
        [
          "filiale-fr",
          {
            nom: "Filiale SAS",
            pays: "FR",
            mere: "groupe-us",
            paysMere: "US",
            paysRetenu: siegeRetenu("FR", "US").pays,
            categorie: "hors d'Europe",
          },
        ],
        [
          "relais-il",
          {
            nom: "Relais Ltd",
            pays: "IL",
            mere: null,
            paysMere: null,
            paysRetenu: siegeRetenu("IL", null).pays,
            categorie: "hors d'Europe",
          },
        ],
      ]),
      organismes: new Map(),
      organismesDe: new Map(),
    });
    expect(JSON.parse(fichiers.get("index/pays.json") ?? "{}")).toEqual({ US: { domaines: 2, domainesEtat: 2 } });
  });

  it("compares a layer whose category is not determined but which depends on a seat outside the EU (rule C2-4)", () => {
    const hier = etat(10, 0);
    // Yesterday, d0 was served by a company outside the EU whose parent is unknown: no category, but outside the EU.
    const n = hier.noms.get("www.d0.example") as EnregistrementNom;
    hier.noms.set(n.nom, {
      ...n,
      exploitants: n.exploitants.map((e) => ({ ...e, societe: "relais-il" })),
      categorie: "non déterminé",
      horsUE: true,
      niveau: "probable",
    });
    // Today, a French host serves it: that move is a change, counted by the circuit breaker.
    expect(bilan(etat(10, 0), hier, hier, false).disjoncteur).toEqual({ compares: 10, changes: 1, part: 0.1 });
  });

  it("never compares a reduced record, and never publishes it in place of the published one", () => {
    const publie = etat(10, 0);
    const reduire = (e: Etat) => {
      const d = e.domaines.get("d0.example") as EnregistrementDomaine;
      const n = e.noms.get("www.d0.example") as EnregistrementNom;
      e.domaines.set(d.domaine, { ...d, reduit: true });
      e.noms.set(n.nom, {
        ...n,
        exploitants: [],
        categorie: "non déterminé",
        horsUE: null,
        niveau: "non déterminé",
        reduit: true,
      });
      return e;
    };
    // Two days in a row reduced: the published records stay, no change enters the journal, the breaker sees nothing.
    const b = bilan(reduire(etat(10, 0)), reduire(etat(10, 0)), publie, false);
    expect(b.etat.noms.get("www.d0.example")).toEqual(publie.noms.get("www.d0.example"));
    expect(b.etat.domaines.get("d0.example")).toEqual(publie.domaines.get("d0.example"));
    expect(b.changements).toEqual([]);
    expect(b.disjoncteur).toEqual({ compares: 9, changes: 0, part: 0 });
    // On a day of new rules, the base is yesterday reclassified: a record of yesterday that was reduced is replaced by
    // today's (the new rules), never by the published one (the old rules), and nothing enters the journal.
    const nouvelles = etat(10, 1);
    const regles = bilan(nouvelles, reduire(etat(10, 0)), publie, true);
    expect(regles.etat.noms.get("www.d0.example")).toEqual(nouvelles.noms.get("www.d0.example"));
    expect(regles.changements).toEqual([]);
  });
});

describe("the figures", () => {
  it("say « at least » the confirmed share, over the « État » domains that answer, marked « en préparation »", () => {
    const e = etat(10, 2);
    e.domaines.set("autre.example", domaine("autre.example", "hors État"));
    e.noms.set("www.autre.example", nom("www.autre.example", "autre.example", "cloud-us", true));
    const c = chiffres(e, "0.2") as { statut: string; chiffreTitre: { domaines: number; auMoinsPourcent: number } };
    expect(c.statut).toBe("preparation");
    expect(c.chiffreTitre).toMatchObject({ domaines: 10, auMoinsPourcent: 20 });
  });
});
