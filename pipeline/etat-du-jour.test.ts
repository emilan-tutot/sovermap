// Tests of the day's records, from a whole made-up collection: simulated resolver, made-up context, documentation
// names, addresses and AS numbers only (RFC 2606, RFC 5737, RFC 5398).
import { describe, expect, it } from "vitest";
import { collecter, POLITESSE } from "./collecte";
import { contexteEssai } from "./essai-contexte";
import { accordsDuJour, construireEtat, type ObservationsDuJour, veilleEtAccords } from "./etat-du-jour";
import type { MesureNom, MesureZone } from "./mesure";
import type { ListeReference } from "./perimetre";
import { generateur } from "./politesse";
import { bilan, type EnregistrementNom, type Etat, fragments, jsonStable, signatures } from "./publication";
import { TableIpToAsn } from "./reseau";
import { ResolveurSimule } from "./resolveur-simule";
import { NOM, schemaDe, valider } from "./schemas";

const zoneDe = (nom: string) => nom.split(".").slice(-2).join(".");

const liste: ListeReference = {
  noms: new Map([
    [
      "www.ministere.example",
      {
        nom: "www.ministere.example",
        domaine: "ministere.example",
        provenances: ["dinum:2026-11-19"],
        types: ["Gouvernement"],
        organismes: [],
      },
    ],
  ]),
  domaines: new Map([
    [
      "ministere.example",
      {
        domaine: "ministere.example",
        noms: ["www.ministere.example"],
        nomWeb: "www.ministere.example",
        perimetre: "État",
        raisons: ["gouv.fr"],
        plateforme: false,
        organismes: [],
        ministeres: [],
      },
    ],
  ]),
  exclus: new Map(),
  ecartes: new Map(),
};

const zone = {
  "www.ministere.example": { A: [{ type: "A" as const, adresse: "192.0.2.10" }] },
  "ministere.example": {
    NS: [{ type: "NS" as const, cible: "ns1.nuage.example" }],
    SOA: [{ type: "SOA" as const, mname: "ns1.nuage.example", serial: 1 }],
    MX: [{ type: "MX" as const, preference: 10, hote: "mx.nuage.example" }],
    TXT: [{ type: "TXT" as const, spf: "v=spf1 ip4:203.0.113.0/24 -all" }],
  },
  "ns1.nuage.example": { A: [{ type: "A" as const, adresse: "203.0.113.53" }] },
  "mx.nuage.example": { A: [{ type: "A" as const, adresse: "203.0.113.25" }] },
};

describe("the records of a day", () => {
  it("hold the addresses, the name servers and the mail, and pass their schemas", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      {
        ...POLITESSE,
        zoneDe,
        aleatoire: generateur(1),
        horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) },
      },
    );
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t");
    expect(etat.noms.get("www.ministere.example")).toMatchObject({ etat: "ok", categorie: "France", horsUE: false });
    const d = etat.domaines.get("ministere.example");
    expect(d?.serveursDeNoms).toMatchObject({ categorie: "hors d'Europe", horsUE: true });
    expect(d?.messagerie).toMatchObject({ etat: "ok", horsUE: true, spf: { statut: "lu", reseaux: [{ as: 64501 }] } });
    for (const [chemin, texte] of [...fragments("noms", etat.noms), ...fragments("domaines", etat.domaines)]) {
      const schema = schemaDe(chemin);
      if (schema !== null) expect(valider(JSON.parse(texte), schema), chemin).toEqual([]);
    }
  });

  it("draws no conclusion on a name measured on one family, and never compares it", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe, new Set(["www.ministere.example AAAA"])),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t");
    const web = etat.noms.get("www.ministere.example");
    expect(web).toMatchObject({
      etat: "ok",
      familleEnEchec: "AAAA",
      categorie: "non déterminé",
      horsUE: null,
      niveau: "non déterminé",
    });
    const d = etat.domaines.get("ministere.example");
    if (d === undefined) throw new Error("domaine absent");
    expect(web?.reduit).toBeUndefined();
    expect(signatures(d, web).adresses).toBe("nul");
  });

  it("publishes the SOA's primary only when it reads as a DNS name", async () => {
    let t = 0;
    const piege = {
      ...zone,
      "ministere.example": {
        ...zone["ministere.example"],
        SOA: [{ type: "SOA" as const, mname: "<b>ns1", serial: 1 }],
      },
    };
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(piege, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t");
    expect(etat.domaines.get("ministere.example")?.zone.soa).toBeNull();
    const sain = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const etatSain = construireEtat(liste, sain, { noms: new Map(), mx: new Map() }, contexteEssai(), "t");
    expect(etatSain.domaines.get("ministere.example")?.zone.soa).toBe("ns1.nuage.example");
  });

  it("publishes a failure Quad9 confirmed as the domain's own breakdown, never as « no site »", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe, new Set(["www.ministere.example"])),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const pannes = { noms: new Set(["www.ministere.example"]), zones: new Set<string>(), resolveur: "quad9" };
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t", pannes);
    expect(etat.noms.get("www.ministere.example")).toMatchObject({
      etat: "echec",
      echec: { code: "SERVFAIL", confirmePar: "quad9" },
    });
    for (const [chemin, texte] of fragments("noms", etat.noms)) {
      const schema = schemaDe(chemin);
      if (schema !== null) expect(valider(JSON.parse(texte), schema), chemin).toEqual([]);
    }
  });

  it("says DNSSEC from the resolver's validation of the zone, never from a DS question", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const z = mesures.domaines.get("ministere.example");
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t");
    expect(etat.domaines.get("ministere.example")?.zone.ds).toBe(z?.ad);
    // A zone that does not exist has no DNSSEC; a zone whose questions failed: unknown.
    const autres = new Map(mesures.domaines);
    const base = mesures.domaines.get("ministere.example");
    if (base === undefined) throw new Error("mesure manquante");
    autres.set("ministere.example", { ...base, etat: "nxdomain", ad: true });
    const inexistant = construireEtat(
      liste,
      { ...mesures, domaines: autres },
      { noms: new Map(), mx: new Map() },
      contexteEssai(),
      "t",
    );
    expect(inexistant.domaines.get("ministere.example")?.zone.ds).toBe(false);
    autres.set("ministere.example", { ...base, etat: "echec", echec: "SERVFAIL", ad: null });
    const enEchec = construireEtat(
      liste,
      { ...mesures, domaines: autres },
      { noms: new Map(), mx: new Map() },
      contexteEssai(),
      "t",
    );
    expect(enEchec.domaines.get("ministere.example")?.zone.ds).toBeNull();
  });

  it("reduces a record that fails its schema, counts it, and goes on", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const hostile: ListeReference = {
      ...liste,
      noms: new Map([
        [
          "www.ministere.example",
          {
            ...(liste.noms.get("www.ministere.example") as NonNullable<ReturnType<typeof liste.noms.get>>),
            provenances: [`dila:${"x".repeat(300)}`],
          },
        ],
      ]),
    };
    const rapport = { erreurs: 0, reduits: 0 };
    const etat = construireEtat(
      hostile,
      mesures,
      { noms: new Map(), mx: new Map() },
      contexteEssai(),
      "t",
      undefined,
      rapport,
    );
    expect(rapport).toEqual({ erreurs: 0, reduits: 1 });
    const n = etat.noms.get("www.ministere.example");
    expect(n?.reduit).toBe(true);
    expect(n?.tronque).toBeUndefined();
    expect(valider(n, NOM)).toEqual([]);
    expect(etat.domaines.get("ministere.example")?.tronque).toBeUndefined();
  });

  it("carries the last agreement of the control resolver while what serves the name is the same, 40 days at most (B.6)", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const mesure = mesures.noms.get("www.ministere.example");
    if (mesure === undefined) throw new Error("mesure manquante");
    const web = (e: ReturnType<typeof construireEtat>) => e.noms.get("www.ministere.example");
    // Day 1: the control resolver answers and agrees; the record never holds the day of that control.
    const controles1 = {
      noms: new Map([["www.ministere.example", { resolveur: "quad9", mesure }]]),
      mx: new Map<string, string[] | null>(),
      jour: "2026-11-24",
    };
    const jour1 = construireEtat(liste, mesures, controles1, contexteEssai(), "t");
    expect(web(jour1)?.controle).toEqual({ resolveur: "quad9", accord: true });
    const sans = construireEtat(
      liste,
      mesures,
      { noms: new Map(), mx: new Map(), jour: "2026-11-25" },
      contexteEssai(),
      "t",
    );
    expect(sans.noms.get("www.ministere.example")?.controle).toBeNull();
    // Day 2, not controlled: the agreement of day 1 holds, and the level is the one of an agreement.
    const reportes = accordsDuJour(jour1, controles1, "2026-11-24");
    expect(reportes.get("www.ministere.example")?.le).toBe("2026-11-24");
    const controles2 = (reports: ReturnType<typeof accordsDuJour>, jour = "2026-11-25") => ({
      noms: new Map(),
      mx: new Map<string, string[] | null>(),
      jour,
      reports,
    });
    const jour2 = (reports: ReturnType<typeof accordsDuJour>, jour = "2026-11-25") =>
      construireEtat(liste, mesures, controles2(reports, jour), contexteEssai(), "t");
    expect(web(jour2(reportes))?.controle).toEqual({ resolveur: "quad9", accord: true });
    expect(web(jour2(reportes))?.niveau).toBe(web(jour1)?.niveau);
    // A carried agreement passes on with the day of its control, never the day it was carried.
    expect(accordsDuJour(jour2(reportes), controles2(reportes), "2026-11-25").get("www.ministere.example")?.le).toBe(
      "2026-11-24",
    );
    // The level an agreement gives, which a name without any control never has.
    expect(web(jour1)?.niveau).toBe("confirmé");
    expect(sans.noms.get("www.ministere.example")?.niveau).toBe("probable");
    // 40 days after the control, still; 41 days, no more; and never before its own day.
    expect(web(jour2(reportes, "2027-01-03"))?.controle).toEqual({ resolveur: "quad9", accord: true });
    expect(web(jour2(reportes, "2027-01-04"))?.controle).toBeNull();
    expect(web(jour2(reportes, "2026-11-23"))?.controle).toBeNull();
    // What serves the name changed: the agreement is not carried.
    const autre = new Map([...reportes].map(([n, a]) => [n, { ...a, servi: "|64499" }]));
    expect(web(jour2(autre))?.controle).toBeNull();
    // A disagreement is never passed on, nor an agreement on a failed name or a reduced record.
    const avec = (f: (e: EnregistrementNom) => EnregistrementNom) => ({
      ...jour1,
      noms: new Map([...jour1.noms].map(([n, e]) => [n, f(e)])),
    });
    for (const f of [
      (e: EnregistrementNom) => ({ ...e, controle: { resolveur: "quad9", accord: false } }),
      (e: EnregistrementNom) => ({ ...e, etat: "echec" as const }),
      (e: EnregistrementNom) => ({ ...e, reduit: true as const }),
    ])
      expect(accordsDuJour(avec(f), controles1, "2026-11-24").size).toBe(0);
    // Today's own control always wins over a carried agreement: here it disagrees, and passes nothing on.
    const autreMesure = { ...mesure, a: [{ adresse: "198.51.100.7", ttl: 60 }] };
    const controles3 = {
      noms: new Map([["www.ministere.example", { resolveur: "quad9", mesure: autreMesure }]]),
      mx: new Map<string, string[] | null>(),
      jour: "2026-11-25",
      reports: reportes,
    };
    const controleDuJour = construireEtat(liste, mesures, controles3, contexteEssai(), "t");
    expect(web(controleDuJour)?.controle).toEqual({ resolveur: "quad9", accord: false });
    expect(accordsDuJour(controleDuJour, controles3, "2026-11-25").size).toBe(0);
    for (const e of [jour1, jour2(reportes)])
      for (const [chemin, texte] of fragments("noms", e.noms)) {
        const schema = schemaDe(chemin);
        if (schema !== null) expect(valider(JSON.parse(texte), schema), chemin).toEqual([]);
      }
  });

  it("lets an agreement travel from day to day in the observations, and keeps the records stable (B.6)", async () => {
    // Two names: one of the « État », controlled every day; one outside it, controlled on its turn only (days 5 and 38,
    // a cycle of 33 days). Each day classifies yesterday again with its own day and its own carried agreements, as
    // collecter.ts does, and the hysteresis publishes a record once two days agree.
    const deux: ListeReference = {
      ...liste,
      noms: new Map([
        ...liste.noms,
        [
          "www.commune.example",
          {
            nom: "www.commune.example",
            domaine: "commune.example",
            provenances: ["dinum:2026-11-19"],
            types: ["Commune"],
            organismes: [],
          },
        ],
      ]),
      domaines: new Map([
        ...liste.domaines,
        [
          "commune.example",
          {
            domaine: "commune.example",
            noms: ["www.commune.example"],
            nomWeb: "www.commune.example",
            perimetre: "hors État",
            raisons: [],
            plateforme: false,
            organismes: [],
            ministeres: [],
          },
        ],
      ]),
    };
    const zoneDeux = {
      ...zone,
      "www.commune.example": { A: [{ type: "A" as const, adresse: "192.0.2.11" }] },
      "commune.example": zone["ministere.example"],
    };
    let t = 0;
    const mesures = await collecter(
      new Map([
        ["www.ministere.example", "ministere.example"],
        ["www.commune.example", "commune.example"],
      ]),
      new ResolveurSimule(zoneDeux, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const controle = (nom: string) => {
      const mesure = mesures.noms.get(nom);
      if (mesure === undefined) throw new Error(`${nom} : mesure manquante`);
      return [nom, { resolveur: "quad9", mesure }] as const;
    };
    const TOUR = new Set([5, 38]);
    const jourDe = (d: number) =>
      new Date(Date.parse("2026-12-01T00:00:00Z") + (d - 1) * 86_400_000).toISOString().slice(0, 10);
    const ctx = contexteEssai();
    let veille: ObservationsDuJour | null = null;
    let publie: Etat | null = null;
    const changes = new Map<string, number[]>([
      ["www.ministere.example", []],
      ["www.commune.example", []],
    ]);
    const avecAccord: number[] = [];
    for (let d = 1; d <= 46; d += 1) {
      const date = jourDe(d);
      const heure = `${date}T03:17:00.000Z`;
      const v = veilleEtAccords(deux, veille, ctx, heure);
      const controles = {
        noms: new Map([controle("www.ministere.example"), ...(TOUR.has(d) ? [controle("www.commune.example")] : [])]),
        mx: new Map<string, string[] | null>(),
        jour: date,
        reports: v.accords,
      };
      const jour = construireEtat(deux, mesures, controles, ctx, heure);
      const avant: Etat | null = publie;
      const apres: Etat = bilan(jour, v.etat, avant, false).etat;
      for (const [nom, jours] of changes) {
        const a = avant?.noms.get(nom);
        const p = apres.noms.get(nom);
        if (a !== undefined && p !== undefined && jsonStable(a) !== jsonStable(p)) jours.push(d);
      }
      if (apres.noms.get("www.commune.example")?.controle?.accord === true) avecAccord.push(d);
      publie = apres;
      veille = { date, mesures, controles, pannes: { noms: new Set(), zones: new Set(), resolveur: "quad9" } };
    }
    // The « État » record never changes: the day of its daily control is never in it.
    expect(changes.get("www.ministere.example")).toEqual([]);
    // The other one: published with its agreement the day after its control (two days agree), once; and kept past the
    // 40 days of its first control, since its control of day 38 gave the agreement again.
    expect(changes.get("www.commune.example")).toEqual([6]);
    expect(avecAccord).toEqual(Array.from({ length: 41 }, (_, i) => i + 6));
  });

  it("reads a failed control as a missed one, and compares what serves a name on its whole layer (B.6)", () => {
    // The second review of B.6. A name of 22 networks, its last one in another AS, beyond the 20 a record keeps.
    const WEB = "www.ministere.example";
    const mesure: MesureNom = {
      nom: WEB,
      etat: "ok",
      echec: null,
      cname: [],
      a: [
        ...Array.from({ length: 21 }, (_, i) => ({ adresse: `192.0.2.${i + 1}`, ttl: 60 })),
        { adresse: "203.0.113.7", ttl: 60 },
      ],
      aaaa: [],
      ad: false,
    };
    const lignes = [
      ...Array.from({ length: 21 }, (_, i) => `192.0.2.${i + 1}\t192.0.2.${i + 1}\t64496\tFR\tEXEMPLE-HEBERGEUR`),
      "203.0.113.0\t203.0.113.255\t64501\tUS\tEXEMPLE-CLOUD",
    ];
    const ctx = { ...contexteEssai(), iptoasn: new TableIpToAsn(lignes.join("\n")) };
    const zoneVide: MesureZone = {
      domaine: "ministere.example",
      etat: "ok",
      echec: null,
      ns: [],
      soa: null,
      ad: false,
      caa: [],
      mx: [],
      mxEtat: "aucun",
      spf: null,
      echecs: [],
    };
    const mesures = {
      noms: new Map([[WEB, mesure]]),
      domaines: new Map([["ministere.example", zoneVide]]),
      hotes: new Map(),
      spf: new Map(),
    };
    const sansPanne = { noms: new Set<string>(), zones: new Set<string>(), resolveur: "quad9" };
    // Day 1: its control agrees; the agreements come from the whole layer (veilleEtAccords), not the bounded record.
    const veille: ObservationsDuJour = {
      date: "2026-12-05",
      mesures,
      controles: { noms: new Map([[WEB, { resolveur: "quad9", mesure }]]), mx: new Map() },
      pannes: sansPanne,
    };
    const v = veilleEtAccords(liste, veille, ctx, "2026-12-05T03:17:00.000Z");
    expect(v.etat?.noms.get(WEB)?.reseaux).toHaveLength(20);
    expect(v.accords.get(WEB)).toMatchObject({ le: "2026-12-05", servi: "|64496,64501" });
    // Day 2: Quad9's answer failed (a control missed, not a disagreement): the agreement of day 1 holds, with its day.
    const enEchec: MesureNom = { ...mesure, etat: "echec", echec: "TIMEOUT", a: [] };
    const controles2 = {
      noms: new Map([[WEB, { resolveur: "quad9", mesure: enEchec }]]),
      mx: new Map<string, string[] | null>(),
      jour: "2026-12-06",
      reports: v.accords,
    };
    const jour2 = construireEtat(liste, mesures, controles2, ctx, "2026-12-06T03:17:00.000Z", sansPanne);
    expect(jour2.noms.get(WEB)?.controle).toEqual({ resolveur: "quad9", accord: true });
    expect(jour2.noms.get(WEB)?.niveau).toBe(v.etat?.noms.get(WEB)?.niveau);
    expect(accordsDuJour(jour2, controles2, "2026-12-06").get(WEB)?.le).toBe("2026-12-05");
  });

  it("keeps the networks behind a CDN by their AS only, and the ranges of the others (B.6)", async () => {
    let t = 0;
    const horloge = { maintenant: () => t, dormir: async (ms: number) => void (t += ms) };
    const derriereCdn = {
      ...zone,
      "www.ministere.example": {
        A: [
          { type: "A" as const, adresse: "198.51.100.7" },
          { type: "A" as const, adresse: "198.51.100.8" },
        ],
      },
    };
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(derriereCdn, zoneDe),
      { ...POLITESSE, zoneDe, horloge },
    );
    const web = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t").noms.get(
      "www.ministere.example",
    );
    expect(web?.cdn?.id).toBe("cdn-exemple");
    expect(web?.reseaux).toEqual([{ as: 64500, plage: null }]);
    const direct = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      { ...POLITESSE, zoneDe, horloge },
    );
    expect(
      construireEtat(liste, direct, { noms: new Map(), mx: new Map() }, contexteEssai(), "t").noms.get(
        "www.ministere.example",
      )?.reseaux,
    ).toEqual([{ as: 64496, plage: expect.stringContaining("192.0.2.0") }]);
  });

  it("shows a disagreement of the control resolver on the mail exchangers, never settles it", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      {
        ...POLITESSE,
        zoneDe,
        horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) },
      },
    );
    const controles = { noms: new Map(), mx: new Map([["ministere.example", ["autre.example"]]]) };
    const etat = construireEtat(liste, mesures, controles, contexteEssai(), "t");
    expect(etat.domaines.get("ministere.example")?.messagerie.niveau).toBe("non déterminé");
  });
});
