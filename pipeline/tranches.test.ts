// Tests of the collection's split into halves (brief B.8): made-up names (RFC 2606), no network.
import { describe, expect, it } from "vitest";
import type { DebitServeurs } from "./debit-serveurs";
import type { MesureNom, MesureZone } from "./mesure";
import {
  fusionnerDebits,
  fusionnerTranches,
  lireTranche,
  type ResultatTranche,
  type Tranche,
  trancheDe,
} from "./tranches";

const nom = (n: string, etat: MesureNom["etat"] = "ok"): MesureNom => ({
  nom: n,
  etat,
  echec: etat === "echec" ? "SERVFAIL" : null,
  cname: [],
  a: etat === "ok" ? [{ adresse: "192.0.2.1", ttl: 300 }] : [],
  aaaa: [],
  ad: false,
});
const zone = (d: string): MesureZone => ({
  domaine: d,
  etat: "ok",
  echec: null,
  ns: [`ns1.${d}`],
  soa: null,
  ad: null,
  caa: [],
  mx: [],
  mxEtat: "aucun",
  spf: null,
  echecs: [],
});
const vide = (tranche: Tranche): ResultatTranche => ({
  tranche,
  date: "2026-11-24",
  noms: [],
  domaines: [],
  hotes: [],
  spf: [],
  controleNoms: [],
  controleMx: [],
  pannes: { noms: [], zones: [] },
  pannesMx: [],
  demandes: [],
  aConfirmer: 0,
  arret: null,
  inacheves: [],
  premierePasseCoupee: 0,
  temoinsKnot: [],
  temoinsCloudflare: [],
  controle: { noms: 0, mx: 0, hotes: 0 },
  debit: null,
  attentes: { ouvertures: 0, questions: 0, secondes: 0 },
  urgence: { pauses: 0, depassements: 0 },
  minutes: 0,
});
const debit = (d: Partial<DebitServeurs>): DebitServeurs => ({
  questions: 0,
  depassements: 0,
  secondes: 0,
  secondesAuDela: 0,
  auDela: [],
  max: 0,
  adresse: null,
  seconde: null,
  tldsMax: [],
  coupesChaudes: [],
  adressesChargees: [],
  amplifications: [],
  ...d,
});

describe("the halves of the collection (B.8)", () => {
  it("puts each domain in one half, always the same, and splits a list about evenly", () => {
    const domaines = Array.from({ length: 10_000 }, (_, i) => `d${i}.exemple.example`);
    const halves = domaines.map(trancheDe);
    expect(domaines.map(trancheDe)).toEqual(halves);
    const premiere = halves.filter((t) => t === 1).length;
    expect(premiere).toBeGreaterThan(4_700);
    expect(premiere).toBeLessThan(5_300);
    expect(new Set(halves)).toEqual(new Set([1, 2]));
  });

  it("reads a half's file back, and refuses another half, another day or a file cut short", () => {
    const t = { ...vide(2), noms: [["www.a.example", nom("www.a.example")]] as [string, MesureNom][] };
    expect(lireTranche(JSON.stringify(t), 2, "2026-11-24")).toEqual(t);
    expect(() => lireTranche(JSON.stringify(t), 1, "2026-11-24")).toThrow(/tranche 1 attendue/);
    expect(() => lireTranche(JSON.stringify(t), 2, "2026-11-25")).toThrow(/jour/);
    const coupe: Partial<ResultatTranche> = { ...t };
    delete coupe.domaines;
    expect(() => lireTranche(JSON.stringify(coupe), 2, "2026-11-24")).toThrow(/incomplet/);
    expect(() => lireTranche(JSON.stringify({ ...t, aConfirmer: -1 }), 2, "2026-11-24")).toThrow(/compte/);
    // The emergency stop's counts, which the second half starts from: never missing nor negative.
    const sansUrgence: Partial<ResultatTranche> = { ...t };
    delete sansUrgence.urgence;
    expect(() => lireTranche(JSON.stringify(sansUrgence), 2, "2026-11-24")).toThrow(/compte/);
    expect(() =>
      lireTranche(JSON.stringify({ ...t, urgence: { pauses: -1, depassements: 0 } }), 2, "2026-11-24"),
    ).toThrow(/compte/);
  });

  it("merges the two halves: names and domains side by side, a shared host measured once, the stop of either", () => {
    const a: ResultatTranche = {
      ...vide(1),
      noms: [["www.a.example", nom("www.a.example")]],
      domaines: [["a.example", zone("a.example")]],
      hotes: [
        ["ns1.hebergeur.example", nom("ns1.hebergeur.example", "echec")],
        ["ns2.hebergeur.example", nom("ns2.hebergeur.example")],
      ],
      controleNoms: [["www.a.example", { resolveur: "quad9", mesure: nom("www.a.example") }]],
      pannes: { noms: [], zones: ["z.example"] },
      temoinsKnot: [["temoin.example", nom("temoin.example")]],
      controle: { noms: 3, mx: 1, hotes: 2 },
      aConfirmer: 2,
      minutes: 90,
    };
    const b: ResultatTranche = {
      ...vide(2),
      noms: [["www.b.example", nom("www.b.example")]],
      domaines: [["b.example", zone("b.example")]],
      hotes: [
        ["ns1.hebergeur.example", nom("ns1.hebergeur.example")],
        ["ns2.hebergeur.example", nom("ns2.hebergeur.example", "echec")],
      ],
      // A host of the « État » that both halves gave to Quad9 (it serves a domain of each).
      controleNoms: [
        ["ns1.hebergeur.example", { resolveur: "quad9", mesure: nom("ns1.hebergeur.example") }],
        ["www.b.example", { resolveur: "quad9", mesure: nom("www.b.example") }],
      ],
      pannes: { noms: ["www.y.example"], zones: ["z.example"] },
      arret: "15 % de domaines en échec, trois fenêtres de suite",
      // The witness, asked by this half too (its own resolver is checked): in its plan, so 3 names.
      temoinsKnot: [["temoin.example", nom("temoin.example")]],
      controle: { noms: 3, mx: 1, hotes: 2 },
      aConfirmer: 1,
      urgence: { pauses: 2, depassements: 1 },
      minutes: 80,
    };
    a.controleNoms.push(["ns1.hebergeur.example", { resolveur: "quad9", mesure: nom("ns1.hebergeur.example") }]);
    for (const t of [a, b])
      t.controleNoms.push(["temoin.example", { resolveur: "quad9", mesure: nom("temoin.example") }]);
    const jour = fusionnerTranches(a, b);
    expect(jour.noms.map(([n]) => n)).toEqual(["www.a.example", "www.b.example"]);
    expect(jour.domaines.map(([d]) => d)).toEqual(["a.example", "b.example"]);
    // A host failed in one half and answered in the other: the answer is kept, whichever half had it.
    expect(new Map(jour.hotes).get("ns1.hebergeur.example")?.etat).toBe("ok");
    expect(new Map(jour.hotes).get("ns2.hebergeur.example")?.etat).toBe("ok");
    expect(jour.pannes).toEqual({ noms: ["www.y.example"], zones: ["z.example"] });
    expect(jour.arret).toBe("15 % de domaines en échec, trois fenêtres de suite");
    // The witness, asked by both halves, kept once; the shared host and the witness counted once (the reviews of B.8):
    // names 3 + 3 - 1, hosts 2 + 2 - 1.
    expect(jour.temoinsKnot.map(([n]) => n)).toEqual(["temoin.example"]);
    expect(jour.controle).toEqual({ noms: 5, mx: 2, hotes: 3 });
    expect(jour.controleNoms.filter(([n]) => n === "ns1.hebergeur.example")).toHaveLength(1);
    expect(jour.aConfirmer).toBe(3);
    // The second half started from the first's emergency counts: its own are the day's.
    expect(jour.urgence).toEqual({ pauses: 2, depassements: 1 });
    expect(jour.minutes).toBe(170);
  });

  it("refuses a name or a domain measured in both halves, two days, or the halves in the wrong order", () => {
    const a = { ...vide(1), domaines: [["a.example", zone("a.example")]] as [string, MesureZone][] };
    expect(() => fusionnerTranches(a, { ...vide(2), domaines: a.domaines })).toThrow(/le domaine « a.example »/);
    const n = { ...vide(1), noms: [["www.a.example", nom("www.a.example")]] as [string, MesureNom][] };
    expect(() => fusionnerTranches(n, { ...vide(2), noms: n.noms })).toThrow(/le nom/);
    expect(() => fusionnerTranches(vide(1), { ...vide(2), date: "2026-11-25" })).toThrow(/deux jours/);
    expect(() => fusionnerTranches(vide(2), vide(1))).toThrow(/la tranche 1, puis la tranche 2/);
  });

  it("adds up the pace of the two halves, keeps the higher second, and merges the busiest by key", () => {
    const a = debit({
      questions: 100,
      depassements: 2,
      secondes: 50,
      secondesAuDela: 1,
      max: 12,
      adresse: "192.0.2.53",
      seconde: "10:00:01",
      tldsMax: ["fr"],
      coupesChaudes: [{ coupe: "fr", secondes: 3 }],
      adressesChargees: [{ adresse: "192.0.2.53", questions: 40, parType: { NS: 30, DS: 10 }, tlds: ["fr"] }],
      amplifications: [{ zone: "a.example", envois: 20, amont: 40, parType: { NS: 40 } }],
    });
    const b = debit({
      questions: 50,
      secondes: 40,
      max: 11,
      adresse: "198.51.100.53",
      seconde: "12:00:00",
      tldsMax: ["com"],
      coupesChaudes: [
        { coupe: "fr", secondes: 2 },
        { coupe: "com", secondes: 4 },
      ],
      adressesChargees: [{ adresse: "192.0.2.53", questions: 20, parType: { NS: 20 }, tlds: ["gouv.fr"] }],
      amplifications: [{ zone: "a.example", envois: 20, amont: 10, parType: { DS: 10 } }],
    });
    const jour = fusionnerDebits(a, b);
    expect(jour).toMatchObject({ questions: 150, depassements: 2, secondes: 90, secondesAuDela: 1, max: 12 });
    expect(jour?.seconde).toBe("10:00:01");
    expect(jour?.coupesChaudes).toEqual([
      { coupe: "fr", secondes: 5 },
      { coupe: "com", secondes: 4 },
    ]);
    expect(jour?.adressesChargees).toEqual([
      { adresse: "192.0.2.53", questions: 60, parType: { NS: 50, DS: 10 }, tlds: ["fr", "gouv.fr"] },
    ]);
    expect(jour?.amplifications).toEqual([{ zone: "a.example", envois: 40, amont: 50, parType: { NS: 40, DS: 10 } }]);
    expect(fusionnerDebits(null, b)).toBe(b);
    expect(fusionnerDebits(a, null)).toBe(a);
  });
});
