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
  domaineAJour,
  fragments,
  historique,
  historiqueRelu,
  index,
  indexDemarches,
  jsonStable,
  joursDeChangement,
  journal,
  nomAJour,
  seau,
} from "./publication";
import { DOMAINE, NOM, valider } from "./schemas";

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
            maillons: [],
            controle: null,
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
            maillons: [],
            controle: null,
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
            maillons: [],
            controle: null,
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
    // Yesterday, d0 was served by a British company whose parent is unknown: outside the EU by its own seat, but its
    // farther seat, so its category, is not known (classer gives « non déterminé » with horsUE true).
    const n = hier.noms.get("www.d0.example") as EnregistrementNom;
    hier.noms.set(n.nom, {
      ...n,
      exploitants: n.exploitants.map((e) => ({ ...e, societe: "societe-gb" })),
      categorie: "non déterminé",
      horsUE: true,
      niveau: "probable",
    });
    // Today, a French host serves it: that move is a change, counted by the circuit breaker.
    expect(bilan(etat(10, 0), hier, hier, false).disjoncteur).toEqual({ compares: 10, changes: 1, part: 0.1 });
  });

  it("reads a record published before schema 3 with each exploitant's level as its own seat's (never higher)", () => {
    // A record of schema 2: no niveauSociete. Kept as published on a day of failed layers or of new rules without
    // yesterday's cache, it must still be valid in today's schema, or that day would stay red.
    const ancien = { role: "hébergé par", societe: "cloud-us", preuve: "AS64496", niveau: "confirmé" as const };
    const n = { ...nom("www.d0.example", "d0.example", "cloud-us", true), exploitants: [ancien] } as EnregistrementNom;
    expect(valider(n, NOM).length).toBeGreaterThan(0);
    const lu = nomAJour(n);
    expect(lu.exploitants[0]?.niveauSociete).toBe(lu.exploitants[0]?.niveau);
    expect(valider(lu, NOM)).toEqual([]);
    const d = domaine("d0.example");
    const hote = {
      hote: "ns1.d0.example",
      etat: "ok" as const,
      as: [64496],
      exploitants: [ancien],
      categorie: "France" as const,
      horsUE: false,
      niveau: "probable" as const,
    };
    const ancienDomaine = { ...d, serveursDeNoms: { ...d.serveursDeNoms, hotes: [hote] } } as EnregistrementDomaine;
    expect(domaineAJour(ancienDomaine).serveursDeNoms.hotes[0]?.exploitants[0]?.niveauSociete).toBe("confirmé");
    expect(valider(domaineAJour(ancienDomaine), DOMAINE)).toEqual([]);
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

describe("the indexes", () => {
  it("counts a country only for an established seat of an ultimate parent, and names each company's owners", () => {
    const e = etat(3, 1);
    // A third company whose parent is not established: never counted in its own country.
    const web = e.noms.get("www.d2.example");
    if (web === undefined) throw new Error("état d'essai incomplet");
    e.noms.set("www.d2.example", {
      ...web,
      exploitants: [{ ...web.exploitants[0], societe: "filiale-inconnue" } as EnregistrementNom["exploitants"][number]],
    });
    const societe = (nom: string, pays: string, mere: string | null, paysMere: string | null) => ({
      nom,
      pays,
      mere,
      paysMere,
      // The retained seat and its category (method 0.3): the parent's here, or none when the parent is unknown.
      paysRetenu: siegeRetenu(pays, paysMere).pays,
      categorie: siegeRetenu(pays, paysMere).categorie,
      maillons: mere === null || mere === nom ? [] : [{ cle: mere, nom: "Groupe Exemple, Inc.", pays: paysMere ?? "" }],
      controle: null,
    });
    const fichiers = index(e, {
      as: new Map(),
      societes: new Map([
        ["cloud-us", societe("Cloud Exemple Europe", "IE", "groupe-us", "US")],
        ["hebergeur-fr", societe("Hébergeur Exemple", "FR", "hebergeur-fr", "FR")],
        ["filiale-inconnue", societe("Filiale Exemple", "NL", null, null)],
      ]),
      organismes: new Map(),
      organismesDe: new Map(),
    });
    expect(JSON.parse(fichiers.get("index/pays.json") ?? "{}")).toEqual({
      FR: { domaines: 1, domainesEtat: 1 },
      US: { domaines: 1, domainesEtat: 1 },
    });
    const exploitants = JSON.parse(fichiers.get("index/exploitants.json") ?? "{}") as Record<
      string,
      { maillons: unknown[] }
    >;
    expect(exploitants["cloud-us"]?.maillons).toEqual([{ cle: "groupe-us", nom: "Groupe Exemple, Inc.", pays: "US" }]);
    expect(exploitants["filiale-inconnue"]?.maillons).toEqual([]);
    // Every registered domain, sorted, with 1 for the « État » perimeter (the site's search).
    expect(JSON.parse(fichiers.get("index/domaines.json") ?? "{}")).toEqual({
      domaines: [
        ["d0.example", 1],
        ["d1.example", 1],
        ["d2.example", 1],
      ],
    });
  });
});

describe("the day of each domain's last change (D.7)", () => {
  it("is today for a new or changed domain, otherwise yesterday's, and the day of yesterday's state the first time", () => {
    const hier = etat(4, 1);
    const aujourdhui = etat(5, 1);
    aujourdhui.domaines.set("d1.example", { ...domaine("d1.example"), noms: 3 });
    const web = aujourdhui.noms.get("www.d2.example");
    if (web !== undefined) aujourdhui.noms.set("www.d2.example", { ...web, dnssec: true });
    const indexHier = {
      domaines: [
        ["d0.example", 1, "2026-11-20"],
        ["d1.example", 1, "2026-11-20"],
        ["d2.example", 1],
        ["d3.example", 1],
      ],
    };
    expect(Object.fromEntries(joursDeChangement(aujourdhui, hier, "2026-11-22", indexHier, "2026-11-21"))).toEqual({
      "d0.example": "2026-11-20",
      "d1.example": "2026-11-22",
      "d2.example": "2026-11-22",
      "d3.example": "2026-11-21",
      "d4.example": "2026-11-22",
    });
    expect(joursDeChangement(aujourdhui, null, "2026-11-22", null, null).get("d0.example")).toBe("2026-11-22");
  });

  it("is published as the third value of each domain's line, when it is known", () => {
    const fichiers = index(etat(2, 0), {
      as: new Map(),
      societes: new Map(),
      organismes: new Map(),
      organismesDe: new Map(),
      jours: new Map([["d0.example", "2026-11-20"]]),
    });
    expect(JSON.parse(fichiers.get("index/domaines.json") ?? "{}")).toEqual({
      domaines: [
        ["d0.example", 1, "2026-11-20"],
        ["d1.example", 1],
      ],
    });
  });
});

describe("the figures' history", () => {
  const figures = (pourcent: number) => ({
    statut: "preparation",
    methode: "0.2.1",
    chiffreTitre: { perimetre: "État", auMoinsPourcent: pourcent, domaines: 1000 },
    messagerie: { perimetre: "État", auMoinsPourcent: 0.3, domaines: 900 },
  });
  const lire = (texte: string) => JSON.parse(texte) as { jours: Record<string, unknown>[] };

  it("tells a published history that reads again from one that does not (the collection holds the day then)", () => {
    expect(historiqueRelu(lire(historique(null, "2026-11-22", "0.2.3", false, figures(4.9))))).toBe(true);
    expect(historiqueRelu(null)).toBe(false);
    expect(historiqueRelu("pas un objet")).toBe(false);
    expect(historiqueRelu({ jours: [{ date: "pas une date" }] })).toBe(false);
    // Only in full: one unreadable day, or none at all, holds the day.
    const jour = { date: "2026-11-21", methode: "0.2.1", reglesChangees: false };
    expect(historiqueRelu({ jours: [jour, { date: "pas une date" }] })).toBe(false);
    expect(historiqueRelu({ jours: [] })).toBe(false);
    // A history frozen in the format published since 22/11/2026: if the reading ever asks for more, the CI says so
    // before the guard turns red on the day after a merge.
    expect(
      historiqueRelu({
        jours: [
          {
            ...jour,
            chiffreTitre: { perimetre: "État", auMoinsPourcent: 5.3, domaines: 1424, nonDeterminePourcent: 41.4 },
            messagerie: { perimetre: "État", auMoinsPourcent: 0.3, domaines: 1218 },
          },
          { date: "2026-11-22", methode: "0.2.3", reglesChangees: true },
        ],
      }),
    ).toBe(true);
  });

  it("starts from the day before, taken from the published figures, so that two days show from the first run", () => {
    const h = lire(
      historique(
        { historique: null, chiffres: figures(5.3), etat: { date: "2026-11-21", journal: { reglesChangees: false } } },
        "2026-11-22",
        "0.2.2",
        true,
        figures(5.1),
      ),
    );
    expect(h.jours.map((j) => [j["date"], j["methode"], j["reglesChangees"]])).toEqual([
      ["2026-11-21", "0.2.1", false],
      ["2026-11-22", "0.2.2", true],
    ]);
    expect(h.jours[1]?.["chiffreTitre"]).toEqual({ perimetre: "État", auMoinsPourcent: 5.1, domaines: 1000 });
  });

  it("adds a day to the published history, replaces the same day run again, keeps the date order, drops what is not a day", () => {
    const publie = {
      historique: {
        jours: [
          { date: "2026-11-22", methode: "0.2.2", reglesChangees: true, chiffreTitre: { auMoinsPourcent: 5.1 } },
          { date: "2026-11-21", methode: "0.2.1", reglesChangees: false },
          { date: "hier", methode: "x", reglesChangees: false },
        ],
      },
      chiffres: null,
      etat: null,
    };
    const h = lire(historique(publie, "2026-11-22", "0.2.3", false, figures(4.9)));
    expect(h.jours.map((j) => [j["date"], j["methode"]])).toEqual([
      ["2026-11-21", "0.2.1"],
      ["2026-11-22", "0.2.3"],
    ]);
    expect(lire(historique(null, "2026-11-23", "0.2.3", false, figures(4.9))).jours).toHaveLength(1);
  });
});

describe("the index of the démarches (C.8, D.2)", () => {
  it("gives each démarche what the edition says of it and, when its address was measured, what serves it", () => {
    const e: Etat = {
      noms: new Map([["www.service.example", nom("www.service.example", "service.example", "hebergeur-fr", false)]]),
      domaines: new Map(),
    };
    const demarche = (id: string, hote: string | null) => ({
      id,
      nom: `Démarche ${id}`,
      perimetre: "Ministère de l’Exemple",
      administration: null,
      volumeTotal: 100,
      volumeEnLigne: null,
      hote,
      domaine: hote === null ? null : hote.split(".").slice(-2).join("."),
    });
    const lu = JSON.parse(
      indexDemarches(e, {
        edition: 15,
        publiee: "2026-10-20",
        demarches: [
          demarche("115", null),
          demarche("1764", "www.service.example"),
          demarche("2000", "x.autre.example"),
        ],
      }),
    ) as { source: unknown; demarches: { id: string; mesure: unknown }[] };
    expect(lu.source).toEqual({ fiche: 55, edition: 15, publiee: "2026-10-20" });
    expect(lu.demarches.map((d) => d.id)).toEqual(["115", "1764", "2000"]);
    expect(lu.demarches[0]?.mesure).toBeNull();
    expect(lu.demarches[1]?.mesure).toEqual({
      etat: "ok",
      categorie: "France",
      horsUE: false,
      niveau: "confirmé",
      societes: ["hebergeur-fr"],
      cdn: null,
    });
    // An address the day's list does not hold (set aside by a rule, or no record that day): nothing measured.
    expect(lu.demarches[2]?.mesure).toBeNull();
    // Written only when the démarches are given.
    expect(
      index(e, { as: new Map(), societes: new Map(), organismes: new Map(), organismesDe: new Map() }).has(
        "index/demarches.json",
      ),
    ).toBe(false);
  });
});
