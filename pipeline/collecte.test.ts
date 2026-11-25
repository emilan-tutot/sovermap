// Tests of the measurement and of its scheduling: a simulated resolver, a fake clock, documentation names and
// addresses only (RFC 2606, RFC 5737, RFC 3849).
import { describe, expect, it, vi } from "vitest";
import { ClientParZone, collecter, PARENT_EN_VOL, POLITESSE } from "./collecte";
import type { ClientDns, Reponse } from "./dns-bas";
import type { Horloge } from "./politesse";
import { Cadence, generateur } from "./politesse";
import { mesurerNom, mesurerZone } from "./mesure";
import { ResolveurSimule, type ZoneSimulee } from "./resolveur-simule";

const zoneDe = (nom: string) => nom.split(".").slice(-2).join(".");

const ZONE: ZoneSimulee = {
  "www.mairie.example": { CNAME: [{ type: "CNAME", cible: "mairie.cdn.example" }] },
  "mairie.cdn.example": {
    A: [{ type: "A", adresse: "198.51.100.7" }],
    AAAA: [{ type: "AAAA", adresse: "2001:db8::7" }],
  },
  "mairie.example": {
    A: [{ type: "A", adresse: "192.0.2.10" }],
    NS: [
      { type: "NS", cible: "ns1.hebergeur.example" },
      { type: "NS", cible: "ns2.hebergeur.example" },
    ],
    SOA: [{ type: "SOA", mname: "ns1.hebergeur.example", serial: 2026112001 }],
    MX: [{ type: "MX", preference: 10, hote: "mx.hebergeur.example" }],
    TXT: [{ type: "TXT", spf: "v=spf1 ip4:192.0.2.0/24 include:spf.hebergeur.example -all" }],
    CAA: [{ type: "CAA", propriete: "issue", valeur: "ac.example" }],
  },
  "boucle.example": { CNAME: [{ type: "CNAME", cible: "boucle.example" }] },
  "sansmail.example": {
    A: [{ type: "A", adresse: "192.0.2.20" }],
    NS: [{ type: "NS", cible: "ns1.hebergeur.example" }],
    MX: [{ type: "MX", preference: 0, hote: "" }],
  },
  "www.sansmail.example": { A: [{ type: "A", adresse: "192.0.2.20" }] },
  "ns1.hebergeur.example": { A: [{ type: "A", adresse: "192.0.2.53" }] },
  "ns2.hebergeur.example": { A: [{ type: "A", adresse: "192.0.2.54" }] },
  "mx.hebergeur.example": { A: [{ type: "A", adresse: "192.0.2.25" }] },
  "spf.hebergeur.example": { TXT: [{ type: "TXT", spf: "v=spf1 ip4:203.0.113.0/24 -all" }] },
};

/** A clock that never waits: it records the waits and moves its own time forward. */
function fausseHorloge(): Horloge & { attentes: number[] } {
  let t = 0;
  const attentes: number[] = [];
  return {
    attentes,
    maintenant: () => t,
    dormir: async (ms) => {
      attentes.push(ms);
      t += ms;
    },
  };
}

describe("the measurement of one name and one domain", () => {
  it("keeps a name whose AAAA failed « ok » with its A, its DNSSEC read on the A, and the AAAA's failure noted", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(["www.mairie.example AAAA"]));
    const m = await mesurerNom("www.mairie.example", r);
    expect(m).toMatchObject({
      etat: "ok",
      echec: null,
      echecFamille: { famille: "AAAA", code: "SERVFAIL" },
      aaaa: [],
      ad: true,
    });
    expect(m.a.length).toBeGreaterThan(0);
    // A, then AAAA: one after the other.
    expect(r.questions.slice(-2)).toEqual(["www.mairie.example A", "www.mairie.example AAAA"]);
  });

  it("follows the CNAME chain to the addresses, and tells a loop from a failure", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe);
    expect(await mesurerNom("www.mairie.example", r)).toMatchObject({
      etat: "ok",
      cname: ["mairie.cdn.example"],
      a: [{ adresse: "198.51.100.7", ttl: 300 }],
      aaaa: [{ adresse: "2001:db8::7", ttl: 300 }],
    });
    expect((await mesurerNom("inconnu.example", r)).etat).toBe("nxdomain");
    expect((await mesurerNom("boucle.example", r)).etat).toBe("echec");
    const enPanne = new ResolveurSimule(ZONE, zoneDe, new Set(["www.mairie.example"]));
    expect(await mesurerNom("www.mairie.example", enPanne)).toMatchObject({ etat: "echec", echec: "SERVFAIL" });
  });

  it("reads a domain's NS, SOA, CAA, MX and SPF, and the null MX", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe);
    expect(await mesurerZone("mairie.example", r)).toMatchObject({
      etat: "ok",
      ns: ["ns1.hebergeur.example", "ns2.hebergeur.example"],
      soa: { mname: "ns1.hebergeur.example" },
      caa: [{ propriete: "issue", valeur: "ac.example" }],
      mx: [{ preference: 10, hote: "mx.hebergeur.example" }],
      mxEtat: "ok",
      spf: "v=spf1 ip4:192.0.2.0/24 include:spf.hebergeur.example -all",
    });
    expect(await mesurerZone("sansmail.example", r)).toMatchObject({ mx: [], mxEtat: "nul" });
  });
});

describe("the scheduling of a collection", () => {
  const noms = new Map([
    ["www.mairie.example", "mairie.example"],
    ["mairie.example", "mairie.example"],
    ["www.sansmail.example", "sansmail.example"],
    ["sansmail.example", "sansmail.example"],
  ]);

  it("announces each domain as soon as its zone is measured, before the first pass ends", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe);
    const annonces: string[] = [];
    let finPremierePasse = -1;
    await collecter(noms, r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
      aleatoire: generateur(1),
      apresDomaine: (domaine, zone) => annonces.push(`${domaine} ${zone.ns.length > 0 ? "ns" : "sans ns"}`),
      apresPremierePasse: () => {
        finPremierePasse = annonces.length;
      },
    });
    expect([...annonces].sort()).toEqual(["mairie.example ns", "sansmail.example ns"]);
    // Both domains were announced while the first pass was still running.
    expect(finPremierePasse).toBe(2);
  });

  it("measures every name, opens each domain once, asks each host once, and expands SPF", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe);
    const resultat = await collecter(noms, r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
      aleatoire: generateur(1),
    });
    expect([...resultat.noms.keys()].sort()).toEqual([...noms.keys()].sort());
    expect([...resultat.domaines.keys()].sort()).toEqual(["mairie.example", "sansmail.example"]);
    expect(r.questions.filter((q) => q === "mairie.example NS")).toHaveLength(1);
    // The zone's first question is its NS: its names then know whether it is delegated.
    expect(r.questions.find((q) => / [^ ]*$/.test(q) && zoneDe(q.split(" ")[0] ?? "") === "mairie.example")).toBe(
      "mairie.example NS",
    );
    expect(r.questions.filter((q) => q === "ns1.hebergeur.example A")).toHaveLength(1);
    expect(resultat.hotes.get("mx.hebergeur.example")?.a).toEqual([{ adresse: "192.0.2.25", ttl: 300 }]);
    expect(resultat.spf.get("mairie.example")?.reseaux.map((x) => x.reseau)).toEqual([
      "192.0.2.0/24",
      "203.0.113.0/24",
    ]);
  });

  it("never asks more than two questions at once to one zone", async () => {
    const beaucoup = new Map(Array.from({ length: 40 }, (_, i) => [`n${i}.mairie.example`, "mairie.example"] as const));
    const r = new ResolveurSimule(ZONE, zoneDe);
    await collecter(beaucoup, r, { ...POLITESSE, zoneDe, horloge: fausseHorloge(), aleatoire: generateur(2) });
    expect(Math.max(...r.maxEnVol.values())).toBeLessThanOrEqual(2);
  });

  it("asks a failure again twice, 10 minutes apart, and keeps it a failure", async () => {
    const horloge = fausseHorloge();
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(["www.sansmail.example"]));
    const resultat = await collecter(noms, r, { ...POLITESSE, zoneDe, horloge, aleatoire: generateur(3) });
    expect(resultat.noms.get("www.sansmail.example")).toMatchObject({ etat: "echec", echec: "SERVFAIL" });
    expect(resultat.essais.get("www.sansmail.example")).toBe(3);
    expect(resultat.essais.get("www.mairie.example")).toBe(1);
    expect(horloge.attentes.filter((ms) => ms === 10 * 60 * 1000)).toHaveLength(2);
  });

  it("takes no task of a retry pass after its end time, a date of the wall clock: what is left keeps its failure", async () => {
    // The fake measuring clock starts at 0: a rule that mixed it with the date would fail one of these two runs.
    const mesurer = async (finReprises: number) => {
      const suivis: string[] = [];
      const r = new ResolveurSimule(ZONE, zoneDe, new Set(["www.sansmail.example"]));
      const resultat = await collecter(noms, r, {
        ...POLITESSE,
        zoneDe,
        horloge: fausseHorloge(),
        aleatoire: generateur(3),
        finReprises,
        suivi: (ligne) => suivis.push(ligne),
      });
      return { resultat, suivis };
    };
    const passee = await mesurer(Date.now());
    expect(passee.resultat.noms.get("www.sansmail.example")).toMatchObject({ etat: "echec", echec: "SERVFAIL" });
    expect(passee.resultat.essais.get("www.sansmail.example")).toBe(1);
    expect(passee.suivis.some((l) => /^reprise 1 arrêtée à l'heure limite : \d+ tâches laissées$/.test(l))).toBe(true);
    const lointaine = await mesurer(Date.now() + 3_600_000);
    expect(lointaine.resultat.essais.get("www.sansmail.example")).toBe(3);
    expect(lointaine.suivis.some((l) => l.includes("arrêtée à l'heure limite"))).toBe(false);
  });

  it("opens no domain of the first pass after its end time, when one is given (a trial's): what is left is not measured", async () => {
    const mesurer = async (finPremierePasse?: number) => {
      const suivis: string[] = [];
      const r = new ResolveurSimule(ZONE, zoneDe);
      const resultat = await collecter(noms, r, {
        ...POLITESSE,
        zoneDe,
        horloge: fausseHorloge(),
        aleatoire: generateur(3),
        ...(finPremierePasse === undefined ? {} : { finPremierePasse }),
        suivi: (ligne) => suivis.push(ligne),
      });
      return { resultat, suivis };
    };
    const passee = await mesurer(Date.now());
    expect(passee.resultat.domaines.size).toBe(0);
    expect(passee.suivis.some((l) => /^première passe arrêtée à l'heure limite : \d+ tâches laissées$/.test(l))).toBe(
      true,
    );
    for (const fin of [Date.now() + 3_600_000, undefined]) {
      const entiere = await mesurer(fin);
      expect(entiere.resultat.domaines.size).toBeGreaterThan(0);
      expect(entiere.suivis.some((l) => l.includes("arrêtée à l'heure limite"))).toBe(false);
    }
  });

  it("waits for the brake before every question, and before opening each domain", async () => {
    const questions: string[] = [];
    const ouvertures: string[] = [];
    const r = new ResolveurSimule(ZONE, zoneDe);
    await collecter(noms, r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
      frein: async (nom, zone, ouverture) => {
        (ouverture ? ouvertures : questions).push(`${nom} ${zone}`);
      },
    });
    // Every name asked was first held by the brake, and every domain's opening too.
    const domaines = [...new Set(noms.values())];
    const freines = new Set([...questions, ...ouvertures].map((q) => q.split(" ")[0]));
    for (const q of r.questions) expect(freines).toContain(q.split(" ")[0]);
    expect(questions).toContain("www.mairie.example mairie.example");
    for (const d of domaines) expect(ouvertures).toContain(`${d} ${zoneDe(d)}`);
    // The opening, and the zone's first question (before and after its slot), go to the parents; no DS question.
    expect(ouvertures.filter((o) => o === "mairie.example mairie.example")).toHaveLength(3);
    expect(r.questions).not.toContain("mairie.example DS");
  });

  it("opens the domains slowly at first: one per second, then faster", async () => {
    const horloge = fausseHorloge();
    const debuts: number[] = [];
    const cadence = new Cadence(8, horloge, { depart: 1, dureeMs: 10_000 });
    for (let i = 0; i < 100; i += 1) {
      await cadence.attendre();
      debuts.push(horloge.maintenant());
    }
    const ecarts = debuts.slice(1).map((d, i) => d - (debuts[i] ?? 0));
    expect(ecarts[0]).toBe(1000);
    expect(ecarts.every((e, i) => i === 0 || e <= (ecarts[i - 1] ?? Infinity) + 1e-6)).toBe(true);
    expect(ecarts.at(-1)).toBeCloseTo(125, 6);
  });

  it("opens every new zone with its own NS question, alone: the zone's other questions wait for its answer", async () => {
    const journal: string[] = [];
    let repondre: () => void = () => {};
    const lent: ClientDns = {
      id: "lent",
      demander: async (nom, type) => {
        journal.push(`début ${nom} ${type}`);
        if (journal.length === 1) await new Promise<void>((resolve) => (repondre = resolve));
        journal.push(`fin ${nom} ${type}`);
        return { code: "NOERROR", ad: false, reponses: [], duree: 1 };
      },
      fermer: () => {},
    };
    const client = new ClientParZone(lent, zoneDe, 2);
    const a = client.demander("www.nouveau.example", "A");
    const aaaa = client.demander("www.nouveau.example", "AAAA");
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(journal).toEqual(["début nouveau.example NS"]);
    repondre();
    await Promise.all([a, aaaa]);
    expect(journal.slice(0, 2)).toEqual(["début nouveau.example NS", "fin nouveau.example NS"]);
    expect(journal).toContain("début www.nouveau.example A");
    expect(journal).toContain("début www.nouveau.example AAAA");
  });

  it("measures domain by domain: each domain's names right after its opening", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe);
    const debuts: string[] = [];
    await collecter(
      new Map([
        ["www.mairie.example", "mairie.example"],
        ["mairie.example", "mairie.example"],
        ["www.sansmail.example", "sansmail.example"],
      ]),
      r,
      {
        ...POLITESSE,
        zoneDe,
        enVol: 1,
        horloge: fausseHorloge(),
        aleatoire: generateur(3),
        frein: async (nom, zone, ouverture) => {
          if (ouverture) debuts.push(zone);
        },
      },
    );
    // One domain at a time (one task in flight): every question of the first domain comes before the second's.
    const zones = r.questions
      .map((q) => zoneDe(q.split(" ")[0] ?? ""))
      .filter((z) => z.endsWith(".example") && !z.startsWith("hebergeur"));
    const premier = zones[0];
    const fin = zones.lastIndexOf(premier ?? "");
    expect(zones.slice(0, fin + 1).every((z) => z === premier)).toBe(true);
  });

  it("asks a domain that does not exist its NS and SOA only, and publishes a failed NS as a failure", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe);
    const absent = await mesurerZone("absent.example", r);
    expect(absent.etat).toBe("nxdomain");
    expect(r.questions.filter((q) => q.startsWith("absent.example "))).toEqual([
      "absent.example NS",
      "absent.example SOA",
    ]);
    const sansNs = new ResolveurSimule(ZONE, zoneDe, new Set(["mairie.example NS"]));
    const z = await mesurerZone("mairie.example", sansNs);
    // The SOA answered but the NS question failed: never « no name servers ».
    expect(z).toMatchObject({ etat: "echec", echec: "SERVFAIL", ns: [] });
  });

  it("asks again a domain whose CAA question failed, and keeps the CAA unknown, never « no CAA »", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(["mairie.example CAA"]));
    const resultat = await collecter(new Map([["www.mairie.example", "mairie.example"]]), r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
    });
    // The first pass and its two attempts.
    expect(r.questions.filter((q) => q === "mairie.example CAA")).toHaveLength(3);
    expect(resultat.domaines.get("mairie.example")).toMatchObject({ etat: "ok", echecs: ["CAA"] });
  });

  it("opens the zones of one parent at its own pace, and those of another parent alongside", async () => {
    const horloge = fausseHorloge();
    const debuts = new Map<string, number>();
    // Every zone is delegated: its apex answers its NS records.
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (!debuts.has(nom)) debuts.set(nom, horloge.maintenant());
        const reponses: Reponse["reponses"] =
          type === "NS" ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: `ns.${nom}` } }] : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, 2, horloge);
    for (const z of ["a.fr", "b.fr", "c.fr"]) await client.demander(z, "NS");
    // Two new zones per second under « fr »: half a second apart.
    const t = (z: string) => debuts.get(z) ?? -1;
    expect([t("a.fr"), t("b.fr"), t("c.fr")]).toEqual([0, 500, 1000]);
    // Another parent keeps its own pace: its first zone goes at once.
    const avant = horloge.maintenant();
    await client.demander("a.example", "NS");
    expect(t("a.example")).toBe(avant);
    // A delegated zone already open does not wait for its parent again.
    const ensuite = horloge.maintenant();
    await client.demander("www.c.fr", "A");
    expect(t("www.c.fr")).toBe(ensuite);
  });

  it("paces every question of a zone that is not delegated, and never asks under a zone that does not exist", async () => {
    const horloge = fausseHorloge();
    const debuts: number[] = [];
    // No NS at the apex: a zone its parent serves itself (NODATA), or one that does not exist (NXDOMAIN).
    const base: ClientDns = {
      id: "base",
      demander: async (nom) => {
        debuts.push(horloge.maintenant());
        return { code: nom.endsWith("absent.fr") ? "NXDOMAIN" : "NOERROR", ad: false, reponses: [], duree: 1 };
      },
      fermer: () => {},
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, 2, horloge);
    for (const [nom, type] of [
      ["servi.fr", "NS"],
      ["servi.fr", "SOA"],
      ["www.servi.fr", "A"],
    ] as const) {
      await client.demander(nom, type);
    }
    expect(debuts).toEqual([0, 500, 1000]);
    // Nothing exists under a name that does not exist (RFC 8020): its opening alone is asked, at the parent's pace.
    const codes: string[] = [];
    for (const [nom, type] of [
      ["absent.fr", "NS"],
      ["absent.fr", "SOA"],
      ["www.absent.fr", "A"],
    ] as const) {
      codes.push((await client.demander(nom, type)).code);
    }
    expect(codes).toEqual(["NXDOMAIN", "NXDOMAIN", "NXDOMAIN"]);
    expect(debuts).toEqual([0, 500, 1000, 1500]);
  });

  it("stops asking a zone whose apex failed three times in a row, until the next attempt", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(["morte.example", "www.morte.example"]));
    const client = new ClientParZone(r, zoneDe, 2);
    // The opening (NS) fails and is asked once more, then the SOA fails: three failures of the apex in a row.
    for (const type of ["NS", "SOA"] as const) {
      expect((await client.demander("morte.example", type)).code).toBe("SERVFAIL");
    }
    // The zone is down for this attempt: its questions fail at once, without being sent, and say so.
    expect((await client.demander("morte.example", "MX")).code).toBe("ZONE_MUETTE");
    expect((await client.demander("www.morte.example", "A")).code).toBe("ZONE_MUETTE");
    expect(r.questions).toEqual(["morte.example NS", "morte.example NS", "morte.example SOA"]);
    client.oublierZonesMortes();
    await client.demander("www.morte.example", "A");
    expect(r.questions).toContain("www.morte.example A");
  });

  it("takes a sub-zone for down after eight failures of its names, never one that ever answered", async () => {
    const morts = Array.from({ length: 10 }, (_, i) => `n${i}.x.in.phm.mairie.example`);
    const r = new ResolveurSimule(
      { ...ZONE, "a.phm.mairie.example": { A: [{ type: "A", adresse: "192.0.2.80" }] } },
      zoneDe,
      new Set([...morts, "y.in.phm.mairie.example"]),
    );
    const client = new ClientParZone(r, zoneDe, 2);
    expect((await client.demander("a.phm.mairie.example", "A")).code).toBe("NOERROR");
    for (const n of morts.slice(0, 8)) await client.demander(n, "A");
    // The deepest sub-zone that failed enough (x.in.phm…) is down: its next name fails at once, without a question.
    expect((await client.demander(morts[8] ?? "", "A")).code).toBe("SOUS_ZONE_MUETTE");
    expect(r.questions).not.toContain(`${morts[8]} A`);
    // Another part of the same zone is still asked, and one more failure there never takes in.phm… for down (the names
    // of x.in.phm… no longer count above it); phm.mairie.example, which answered, is never down.
    await client.demander("y.in.phm.mairie.example", "A");
    expect(r.questions).toContain("y.in.phm.mairie.example A");
    await client.demander("z.in.phm.mairie.example", "A");
    expect(r.questions).toContain("z.in.phm.mairie.example A");
    expect((await client.demander("a.phm.mairie.example", "A")).code).toBe("NOERROR");
    // The next attempt asks the sub-zone again.
    client.oublierZonesMortes();
    await client.demander(morts[9] ?? "", "A");
    expect(r.questions).toContain(`${morts[9]} A`);
    expect(ClientParZone.sousZones("a.b.mairie.example", "mairie.example")).toEqual([
      "a.b.mairie.example",
      "b.mairie.example",
    ]);
  });

  it("never takes a zone for down when only names below its apex fail (a lame sub-zone)", async () => {
    const r = new ResolveurSimule(
      ZONE,
      zoneDe,
      new Set(["a.sous.mairie.example", "b.sous.mairie.example", "c.sous.mairie.example"]),
    );
    const client = new ClientParZone(r, zoneDe, 2);
    for (const n of ["a", "b", "c"]) await client.demander(`${n}.sous.mairie.example`, "A");
    expect((await client.demander("www.mairie.example", "A")).code).toBe("NOERROR");
    expect(r.questions).toContain("www.mairie.example A");
  });

  it("takes one instant at every name server of a zone, a pace shared by every zone they serve", async () => {
    const horloge = fausseHorloge();
    const envois: { question: string; t: number }[] = [];
    const ns = (zone: string, cibles: string[]): Reponse["reponses"] =>
      cibles.map((cible) => ({ proprietaire: zone, ttl: 1, donnee: { type: "NS", cible } }));
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        envois.push({ question: `${nom} ${type}`, t: horloge.maintenant() });
        const reponses =
          type !== "NS"
            ? []
            : nom === "a.example"
              ? ns("a.example", ["ns1.hebergeur.example", "ns2.hebergeur.example"])
              : nom === "b.example"
                ? ns("b.example", ["NS2.hebergeur.example."])
                : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // Two questions per second to one name server: a and b share ns2 (written in capitals, with its dot, by b).
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2);
    await client.demander("a.example", "NS");
    await client.demander("b.example", "NS");
    const debut = horloge.maintenant();
    for (const nom of ["www.a.example", "www.b.example", "mail.a.example"]) await client.demander(nom, "A");
    const apres = envois.filter((e) => e.question.endsWith(" A")).map((e) => e.t - debut);
    // Each opening took an instant of its own zone (its NS question goes to the zone's servers too); then b waits for
    // ns2's next instant, and a's second question waits for ns2, although ns1 is free.
    expect(apres).toEqual([500, 1000, 1500]);
  });

  it("opens a zone again at each attempt at its parent's pace, delegated or not", async () => {
    const horloge = fausseHorloge();
    const ouvertures: number[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (type === "NS") ouvertures.push(horloge.maintenant());
        const reponses: Reponse["reponses"] =
          type === "NS" && nom !== "servi.example"
            ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: `ns.${nom}` } }]
            : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // Two new zones per second under one parent; an attempt asks the parent for the delegations again.
    const client = new ClientParZone(base, zoneDe, 2, undefined, 2, horloge);
    for (const zone of ["a.example", "b.example", "servi.example"]) await client.demander(zone, "NS");
    client.oublierZonesMortes();
    for (const zone of ["a.example", "b.example", "servi.example"]) await client.demander(zone, "NS");
    // servi.example is served by its parent (no NS records): it reopens at the parent's pace too.
    expect(ouvertures).toEqual([0, 500, 1000, 1500, 2000, 2500]);
  });

  it("gives two names of one server one pace, from the addresses the resolver's logs tell", async () => {
    const horloge = fausseHorloge();
    const envois: number[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (type === "A") envois.push(horloge.maintenant());
        const cible = nom === "a.example" ? "ns3.hebergeur.example" : "ns4.hebergeur.example";
        const reponses: Reponse["reponses"] =
          type === "NS" ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible } }] : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // ns3 and ns4 are one server: one address in the logs.
    const journal = {
      cout: () => 1,
      envoi: () => {},
      adresses: (hote: string) => (hote.endsWith(".hebergeur.example") ? ["192.0.2.34"] : []),
      adressesDeCoupe: () => [],
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2, journal);
    await client.demander("a.example", "NS");
    await client.demander("b.example", "NS");
    const debut = horloge.maintenant();
    await client.demander("www.a.example", "A");
    await client.demander("www.b.example", "A");
    // After the openings' own instants: b's question waits for the shared address, half a second after a's.
    expect(envois.map((t) => t - debut)).toEqual([500, 1000]);
  });

  it("weighs a question by what it costs the servers, and by four where a question failed", async () => {
    const horloge = fausseHorloge();
    const envois: string[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (type === "A") envois.push(`${nom} ${horloge.maintenant()}`);
        const reponses: Reponse["reponses"] =
          type === "NS" ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: `ns.${nom}` } }] : [];
        return { code: nom === "x.sous.panne.example" ? "SERVFAIL" : "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // lourd.example's questions cost its servers 3.2 questions each (1.6 allowed at full pace): two instants each.
    const journal = {
      cout: (zone: string) => (zone === "lourd.example" ? 3.2 : 1),
      envoi: () => {},
      adresses: () => [],
      adressesDeCoupe: () => [],
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2, journal);
    await client.demander("lourd.example", "NS");
    await client.demander("panne.example", "NS");
    const debut = horloge.maintenant();
    for (const n of ["a", "b", "c"]) await client.demander(`${n}.lourd.example`, "A");
    // The opening took two instants of the zone already (0 and 500): then two each, a second apart.
    expect(envois.map((e) => Number(e.split(" ")[1]) - debut)).toEqual([1000, 2000, 3000]);
    // A name fails in sous.panne.example: the resolver tries the other servers, and again. The sub-zone's next question
    // takes four instants; the rest of the zone keeps one (x took two: sous.panne.example was new to the resolver).
    envois.length = 0;
    const apres = horloge.maintenant();
    for (const nom of ["x.sous.panne.example", "y.sous.panne.example", "www.panne.example", "mail.panne.example"]) {
      await client.demander(nom, "A");
    }
    expect(envois.map((e) => Number(e.split(" ")[1]) - apres)).toEqual([0, 1000, 3000, 3500]);
  });

  it("weighs a question by what the zones its CNAMEs lead to cost the servers", async () => {
    const horloge = fausseHorloge();
    const envois: string[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (type === "A") envois.push(`${nom} ${horloge.maintenant()}`);
        const reponses: Reponse["reponses"] =
          type === "NS"
            ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: `ns.${nom}` } }]
            : type === "A"
              ? [{ proprietaire: nom, ttl: 1, donnee: { type: "CNAME", cible: "site.plateforme.example." } }]
              : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // A question that leads to plateforme.example costs its servers 3.2 questions (what proves its answers, fetched
    // again and again): two instants each, once the zone's first answer tells where its CNAMEs lead.
    const journal = {
      cout: (zone: string) => (zone === "plateforme.example" ? 3.2 : 1),
      envoi: () => {},
      adresses: () => [],
      adressesDeCoupe: () => [],
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2, journal);
    await client.demander("alias.example", "NS");
    const debut = horloge.maintenant();
    for (const n of ["a", "b", "c"]) await client.demander(`${n}.alias.example`, "A");
    // a went before anyone knew (one instant); b and c take two each.
    expect(envois.map((e) => Number(e.split(" ")[1]) - debut)).toEqual([500, 1000, 2000]);
  });

  it("paces a zone whose NS do not answer by the servers the resolver used for it, and its CNAMEs' zones", async () => {
    const horloge = fausseHorloge();
    const envois: string[] = [];
    const notes: string[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (type === "A") envois.push(`${nom} ${horloge.maintenant()}`);
        const reponses: Reponse["reponses"] =
          type === "NS" && nom === "partage.example"
            ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: "ns1.hebergeur.example" } }]
            : type === "A" && nom === "www.alias.example"
              ? [{ proprietaire: nom, ttl: 1, donnee: { type: "CNAME", cible: "site.plateforme.example." } }]
              : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // soa.example answers no NS, but the logs show the resolver asking its cut at the shared server's address.
    const journal = {
      cout: () => 1,
      envoi: (zone: string) => void notes.push(zone),
      adresses: (hote: string) => (hote === "ns1.hebergeur.example" ? ["192.0.2.9"] : []),
      adressesDeCoupe: (coupe: string) => (coupe === "soa.example" ? ["192.0.2.9"] : []),
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2, journal);
    for (const zone of ["partage.example", "soa.example", "alias.example", "plateforme.example"]) {
      await client.demander(zone, "NS");
    }
    const debut = horloge.maintenant();
    await client.demander("www.partage.example", "A");
    await client.demander("www.soa.example", "A");
    const temps = () => envois.map((e) => Number(e.split(" ")[1]) - debut);
    expect(temps()).toEqual([500, 1000]);
    // A CNAME to another zone: the question counts for that zone too, and the zone's next ones keep its pace.
    envois.length = 0;
    const apres = horloge.maintenant();
    await client.demander("www.alias.example", "A");
    await client.demander("mail.alias.example", "A");
    await client.demander("x.plateforme.example", "A");
    expect(envois.map((e) => Number(e.split(" ")[1]) - apres)).toEqual([0, 500, 1000]);
    expect(notes.filter((z) => z === "plateforme.example")).toHaveLength(3);
  });

  it("takes a SOA's primary as a key only for a zone whose NS records did not answer", async () => {
    const horloge = fausseHorloge();
    const envois: string[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (type === "A") envois.push(`${nom} ${horloge.maintenant()}`);
        const reponses: Reponse["reponses"] =
          type === "NS"
            ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: `ns.${nom}` } }]
            : type === "SOA"
              ? [{ proprietaire: nom, ttl: 1, donnee: { type: "SOA", mname: "ns1.primaire.example", serial: 1 } }]
              : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // Two zones on servers of their own, whose SOA names one same primary (a registrar's default): no shared pace.
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2);
    for (const zone of ["a.example", "b.example"]) await client.demander(zone, "NS");
    for (const zone of ["a.example", "b.example"]) await client.demander(zone, "SOA");
    const debut = horloge.maintenant();
    await client.demander("www.a.example", "A");
    await client.demander("www.b.example", "A");
    expect(envois.map((e) => Number(e.split(" ")[1]) - debut)).toEqual([500, 500]);
  });

  it("weighs a name's first question by the names the resolver asks before it (QNAME minimisation)", async () => {
    const horloge = fausseHorloge();
    const envois: number[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (_nom, type) => {
        if (type === "A") envois.push(horloge.maintenant());
        return { code: "NOERROR", ad: false, reponses: [], duree: 1 };
      },
      fermer: () => {},
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2);
    await client.demander("profond.example", "NS");
    const debut = horloge.maintenant();
    // b.c.profond.example and c.profond.example are new: three instants; the second name shares them: one.
    await client.demander("a.b.c.profond.example", "A");
    await client.demander("d.b.c.profond.example", "A");
    await client.demander("e.b.c.profond.example", "A");
    expect(envois.map((t) => t - debut)).toEqual([500, 2000, 2500]);
  });

  it("keeps a zone's own pace when its name servers are not known (a delegation proved by its SOA)", async () => {
    const horloge = fausseHorloge();
    const debuts: number[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        debuts.push(horloge.maintenant());
        const reponses: Reponse["reponses"] =
          type === "SOA" ? [{ proprietaire: nom, ttl: 1, donnee: { type: "SOA", mname: `ns.${nom}`, serial: 1 } }] : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2);
    await client.demander("soa.example", "NS");
    await client.demander("soa.example", "SOA");
    for (const n of ["www1", "www2"]) await client.demander(`${n}.soa.example`, "A");
    expect(debuts).toEqual([0, 500, 1000, 1500]);
  });

  it("measures a domain's names a few at a time", async () => {
    let enVol = 0;
    let max = 0;
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (nom.startsWith("n") && type === "A") {
          enVol += 1;
          max = Math.max(max, enVol);
          await new Promise((resolve) => setTimeout(resolve, 5));
          enVol -= 1;
        }
        return { code: "NOERROR", ad: false, reponses: [], duree: 1 };
      },
      fermer: () => {},
    };
    const noms = new Map<string, string>([["grand.example", "grand.example"]]);
    for (let i = 0; i < 12; i += 1) noms.set(`n${i}.grand.example`, "grand.example");
    await collecter(noms, base, { ...POLITESSE, zoneDe, horloge: fausseHorloge(), parZone: 50, nomsParDomaine: 3 });
    expect(max).toBe(3);
  });

  it("keeps each zone's own pace, and asks each SPF lookup once in a run", async () => {
    const horloge = fausseHorloge();
    const debuts: number[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (nom.startsWith("www")) debuts.push(horloge.maintenant());
        const reponses: Reponse["reponses"] =
          type === "NS" ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: `ns.${nom}` } }] : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // Two questions per second to one zone's servers: half a second apart, after its opening.
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 2);
    for (const n of ["www1", "www2", "www3"]) await client.demander(`${n}.mairie.example`, "A");
    expect(debuts.map((t) => t - (debuts[0] ?? 0))).toEqual([0, 500, 1000]);
    // Two domains that include the same SPF record: one TXT question for it in the run.
    const zone: ZoneSimulee = {
      ...ZONE,
      "a.example": {
        NS: [{ type: "NS", cible: "ns1.hebergeur.example" }],
        TXT: [{ type: "TXT", spf: "v=spf1 include:spf.hebergeur.example -all" }],
      },
      "b.example": {
        NS: [{ type: "NS", cible: "ns1.hebergeur.example" }],
        TXT: [{ type: "TXT", spf: "v=spf1 include:spf.hebergeur.example -all" }],
      },
    };
    const r = new ResolveurSimule(zone, zoneDe);
    await collecter(
      new Map([
        ["a.example", "a.example"],
        ["b.example", "b.example"],
      ]),
      r,
      { ...POLITESSE, zoneDe, horloge: fausseHorloge() },
    );
    expect(r.questions.filter((q) => q === "spf.hebergeur.example TXT")).toHaveLength(1);
  });

  it("takes a zone whose apex answered its SOA for delegated, and measures the largest domains first", async () => {
    const horloge = fausseHorloge();
    const parents: number[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        parents.push(horloge.maintenant());
        const reponses: Reponse["reponses"] =
          type === "SOA" ? [{ proprietaire: nom, ttl: 1, donnee: { type: "SOA", mname: `ns.${nom}`, serial: 1 } }] : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    // NODATA to NS, but its SOA: a zone of its own; its later questions keep only the zone's pace (none here).
    const client = new ClientParZone(base, zoneDe, 2, undefined, 2, horloge);
    await client.demander("soa.example", "NS");
    await client.demander("soa.example", "SOA");
    const avant = horloge.maintenant();
    await client.demander("www.soa.example", "A");
    expect(parents.at(-1)).toBe(avant);
    // The domain with the most names opens first.
    const r = new ResolveurSimule(ZONE, zoneDe);
    const noms = new Map<string, string>([["www.sansmail.example", "sansmail.example"]]);
    for (let i = 0; i < 60; i += 1) noms.set(`n${i}.mairie.example`, "mairie.example");
    await collecter(noms, r, { ...POLITESSE, zoneDe, horloge: fausseHorloge(), enVol: 1 });
    expect(r.questions[0]).toBe("mairie.example NS");
  });

  it("counts names, not questions: four names asked twice each never take a sub-zone for down", async () => {
    const morts = Array.from({ length: 4 }, (_, i) => `n${i}.services.mairie.example`);
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(morts));
    const client = new ClientParZone(r, zoneDe, 2);
    for (const n of morts) for (const type of ["A", "AAAA"] as const) await client.demander(n, type);
    await client.demander("www.services.mairie.example", "A");
    expect(r.questions).toContain("www.services.mairie.example A");
  });

  it("never takes for down a sub-zone that answered itself, and brings back one that answers late", async () => {
    // A name that is itself a sub-zone answered: names below it that fail never take it for down.
    const r = new ResolveurSimule(
      { ...ZONE, "ent.mairie.example": { A: [{ type: "A", adresse: "192.0.2.81" }] } },
      zoneDe,
      new Set(Array.from({ length: 9 }, (_, i) => `n${i}.ent.mairie.example`)),
    );
    const client = new ClientParZone(r, zoneDe, 2);
    await client.demander("ent.mairie.example", "A");
    for (let i = 0; i < 9; i += 1) await client.demander(`n${i}.ent.mairie.example`, "A");
    expect(r.questions).toContain("n8.ent.mairie.example A");
    // A sub-zone down for the attempt, then an answer that was already on its way: it is alive again.
    let repondre: (r: Reponse) => void = () => {};
    const lent: ClientDns = {
      id: "lent",
      demander: (nom) =>
        nom === "tard.x.mairie.example"
          ? new Promise<Reponse>((resolve) => (repondre = resolve))
          : Promise.resolve({ code: "SERVFAIL", ad: false, reponses: [], duree: 1 }),
      fermer: () => {},
    };
    const c2 = new ClientParZone(lent, zoneDe, 20);
    await c2.demander("mairie.example", "NS");
    const tard = c2.demander("tard.x.mairie.example", "A");
    for (let i = 0; i < 8; i += 1) await c2.demander(`m${i}.x.mairie.example`, "A");
    expect((await c2.demander("m8.x.mairie.example", "A")).code).toBe("SOUS_ZONE_MUETTE");
    repondre({ code: "NOERROR", ad: false, reponses: [], duree: 1 });
    await tard;
    expect((await c2.demander("m9.x.mairie.example", "A")).code).toBe("SERVFAIL");
  });

  it("reads the brake again after the parent's slot, and takes a new slot when held", async () => {
    const horloge = fausseHorloge();
    let lectures = 0;
    const base: ClientDns = {
      id: "base",
      demander: async () => ({ code: "NOERROR", ad: false, reponses: [], duree: 1 }),
      fermer: () => {},
    };
    // The brake lets the question through before its slot, holds it right after its first slot, then lets it go.
    const frein = async () => {
      lectures += 1;
      return lectures === 2;
    };
    const client = new ClientParZone(base, zoneDe, 2, frein, 2, horloge);
    await client.demander("a.fr", "NS");
    await client.demander("b.fr", "NS");
    // a.fr took two slots (0 and 500 ms): b.fr waits for the third one, at one second.
    expect(horloge.maintenant()).toBe(1000);
  });

  it("paces the parents by registry (fr and re share their servers)", async () => {
    const horloge = fausseHorloge();
    const debuts: [string, number][] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        debuts.push([nom, horloge.maintenant()]);
        const reponses: Reponse["reponses"] =
          type === "NS" ? [{ proprietaire: nom, ttl: 1, donnee: { type: "NS", cible: `ns.${nom}` } }] : [];
        return { code: "NOERROR", ad: false, reponses, duree: 1 };
      },
      fermer: () => {},
    };
    const client = new ClientParZone(base, zoneDe, 2, undefined, 2, horloge);
    for (const z of ["a.fr", "b.re", "c.fr", "d.bzh"]) await client.demander(z, "NS");
    expect(debuts.map(([, t]) => t)).toEqual([0, 500, 1000, 1500]);
    // A zone already open never waits for its parent again.
    const avant = horloge.maintenant();
    await client.demander("www.a.fr", "A");
    expect(debuts.at(-1)?.[1]).toBe(avant);
  });

  it("gives the collection the parents' pace and its clock", async () => {
    const horloge = fausseHorloge();
    const r = new ResolveurSimule(ZONE, zoneDe);
    await collecter(noms, r, { ...POLITESSE, zoneDe, horloge, parentParSeconde: 0.25 });
    // Four seconds between two new zones under « example »: the collection's own pace.
    expect(horloge.attentes).toContain(4000);
  });

  it("holds at most eight questions in flight through one registry's servers in the first pass (22/11/2026)", async () => {
    // The parent's servers answer late: each question waits until the test lets it go, then ends in a TIMEOUT a second
    // later (so its opening is asked once more, as at the trial of 17:11).
    const enVol = new Map<string, number>();
    const maxEnVol = new Map<string, number>();
    const enAttente: (() => void)[] = [];
    const registre = (nom: string) => (nom.endsWith(".fr") || nom.endsWith(".re") ? "afnic" : "autre");
    const base: ClientDns = {
      id: "base",
      demander: async (nom) => {
        const g = registre(nom);
        enVol.set(g, (enVol.get(g) ?? 0) + 1);
        maxEnVol.set(g, Math.max(maxEnVol.get(g) ?? 0, enVol.get(g) ?? 0));
        await new Promise<void>((resolve) => enAttente.push(resolve));
        await horloge.dormir(1000);
        enVol.set(g, (enVol.get(g) ?? 1) - 1);
        return { code: "TIMEOUT", ad: false, reponses: [], duree: 1000 };
      },
      fermer: () => {},
    };
    const horloge = fausseHorloge();
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge);
    const zones = [...Array.from({ length: 12 }, (_, i) => `z${i}.fr`), "a.re", "b.example", "c.example"];
    const fini = Promise.all(zones.map((z) => client.demander(z, "NS")));
    await new Promise((resolve) => setTimeout(resolve, 5));
    // Eight of AFNIC's thirteen openings left (fr and re share its servers); another registry's went at once.
    expect(enVol.get("afnic")).toBe(PARENT_EN_VOL);
    expect(enVol.get("autre")).toBe(2);
    // Each answer lets one more go: never more than eight at once, until every opening and its second try ended.
    let reponses = 0;
    while (enAttente.length > 0) {
      enAttente.shift()?.();
      reponses += 1;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    const resultats = await fini;
    expect(resultats.every((r) => r.code === "TIMEOUT")).toBe(true);
    expect(reponses).toBe(2 * zones.length);
    expect(maxEnVol.get("afnic")).toBe(PARENT_EN_VOL);
    expect(client.attenteParents.questions).toBeGreaterThanOrEqual(5);
    // The waits are measured on the clock: each answer took one second of it.
    expect(client.attenteParents.ms).toBeGreaterThanOrEqual(1000);

    // The retries go without the cap: thirteen new openings of AFNIC's zones leave at once.
    client.leverPlafondParents();
    enVol.clear();
    const reprise = Promise.all(zones.slice(0, 13).map((z) => client.demander(`r${z}`, "NS")));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(enVol.get("afnic")).toBe(13);
    while (enAttente.length > 0) {
      enAttente.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    await reprise;

    // A collection says, after its first pass, how its questions to parents went (none waited, when the answers come
    // in time).
    const lignes: string[] = [];
    await collecter(noms, new ResolveurSimule(ZONE, zoneDe), {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
      suivi: (ligne) => lignes.push(ligne),
    });
    expect(lignes.find((l) => l.startsWith("questions par les serveurs parents"))).toMatch(
      /^questions par les serveurs parents, première passe : [1-9][0-9]*, dont [0-9]+ en échec ; 0 ont attendu une place \(0 s en tout ; 8 au plus en attente par registre\) ; reprises sans plafond$/,
    );
  });

  /**
   * A collection of zones under AFNIC: `mortes` zones whose questions fail (m0.fr, m1.fr…), and `vivantes` zones that
   * answer at once, without records (v0.fr…), each with one name; one retry pass right after the first.
   * `retenir(reprise)` tells, for the first pass (false) and the retry (true), whether the failing zones' answers are
   * held, the test letting them go one by one. Returns the most questions of the failing zones in flight at once in
   * each pass, and the log line about the parents.
   */
  async function collecteRetenue(mortes: number, vivantes: number, retenir: (reprise: boolean) => boolean) {
    let reprise = false;
    let enVol = 0;
    const max = { premiere: 0, reprise: 0 };
    const enAttente: (() => void)[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom) => {
        if (!/(^|\.)m[0-9]+\.fr$/.test(nom)) return { code: "NOERROR", ad: false, reponses: [], duree: 1 };
        const passe = reprise ? "reprise" : "premiere";
        enVol += 1;
        max[passe] = Math.max(max[passe], enVol);
        if (retenir(reprise)) await new Promise<void>((resolve) => enAttente.push(resolve));
        enVol -= 1;
        return { code: "SERVFAIL", ad: false, reponses: [], duree: 1 };
      },
      fermer: () => {},
    };
    const liste = new Map([
      ...Array.from({ length: mortes }, (_, i) => [`www.m${i}.fr`, `m${i}.fr`] as const),
      ...Array.from({ length: vivantes }, (_, i) => [`www.v${i}.fr`, `v${i}.fr`] as const),
    ]);
    const lignes: string[] = [];
    let fini = false;
    const collecte = collecter(liste, base, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
      reprises: 1,
      delaiRepriseMs: 0,
      apresPremierePasse: () => {
        reprise = true;
      },
      suivi: (ligne) => lignes.push(ligne),
    }).then(() => {
      fini = true;
    });
    while (!fini) {
      enAttente.shift()?.();
      await new Promise((resolve) => setImmediate(resolve));
    }
    await collecte;
    return { max, ligne: lignes.find((l) => l.startsWith("questions par les serveurs parents")) ?? "" };
  }

  it("caps a whole collection's first pass, and lifts the cap for its retries (mostly dead zones)", async () => {
    // Twenty zones under AFNIC whose servers answer late, then fail, in both passes: eight in flight at most in the
    // first pass; their retry leaves together, beyond the cap. The log line counts the first pass's questions.
    const { max, ligne } = await collecteRetenue(20, 3, () => true);
    expect(max.premiere).toBe(PARENT_EN_VOL);
    expect(max.reprise).toBeGreaterThan(PARENT_EN_VOL);
    const [, total = "0", echecs = "0", attendu = "0"] =
      /première passe : ([0-9]+), dont ([0-9]+) en échec ; ([0-9]+) ont attendu/.exec(ligne) ?? [];
    expect(Number(echecs)).toBeGreaterThan(0);
    expect(Number(echecs)).toBeLessThan(Number(total));
    expect(Number(attendu)).toBeGreaterThan(0);
    expect(ligne).toMatch(/reprises sans plafond$/);
  });

  /** `n` domains « pN.example », each with its web name « www.pN.example ». */
  const domainesP = (n: number) =>
    new Map(Array.from({ length: n }, (_, i) => [`www.p${i}.example`, `p${i}.example`] as const));
  const numero = (nom: string) => Number(/p([0-9]+)[.]example$/.exec(nom)?.[1] ?? "-1");
  /** One task at a time and the list's order kept: the window holds exactly the last domains measured. */
  const enOrdre = { enVol: 1, aleatoire: () => 0.999_999 };

  /**
   * A collection whose resolver fails each question for which `enPanne` says so (it sees the name, the type and the
   * log so far), with a window of 10 domains, a threshold of 50 %, pauses of one minute and a stop at the third breach
   * in a row; it counts the questions asked after the stop, and those asked during a pause.
   */
  async function collecteEnPanne(
    liste: ReadonlyMap<string, string>,
    enPanne: (nom: string, type: string, lignes: readonly string[]) => boolean,
    autres: Partial<Parameters<typeof collecter>[2]> = {},
  ) {
    const lignes: string[] = [];
    const arrets: string[] = [];
    const horloge = fausseHorloge();
    let apresArret = 0;
    /** The clock's instant of each pause's start, and of each question asked to the resolver. */
    const pauses: number[] = [];
    const instants: number[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        if (arrets.length > 0) apresArret += 1;
        instants.push(horloge.maintenant());
        return { code: enPanne(nom, type, lignes) ? "SERVFAIL" : "NOERROR", ad: false, reponses: [], duree: 1 };
      },
      fermer: () => {},
    };
    const r = await collecter(liste, base, {
      ...POLITESSE,
      zoneDe,
      horloge,
      arret: { fenetre: 10, part: 0.5, pauseMs: 60_000, depassements: 3, pausesMax: 3 },
      nomWebDe: (domaine) => `www.${domaine}`,
      surArret: (raison) => arrets.push(raison),
      suivi: (ligne) => {
        if (ligne.startsWith("pause d'urgence")) pauses.push(horloge.maintenant());
        lignes.push(ligne);
      },
      ...autres,
    });
    const pendantPause = instants.filter((t) => pauses.some((d) => t > d && t < d + 60_000)).length;
    // The most questions asked in the first second after a pause's end (the names' pace allows 25).
    const rafaleApresPause = Math.max(
      0,
      ...pauses.map((d) => instants.filter((t) => t >= d + 60_000 && t < d + 61_000).length),
    );
    return { r, lignes, arrets, apresArret, pendantPause, rafaleApresPause };
  }

  it("pauses at each breach and stops at the third in a row, asking nothing after it (22/11/2026)", async () => {
    // Every question fails, with the 512 tasks of production in flight: two pauses, then the stop, and from that
    // instant not one question reaches the resolver; none during a pause either; the retries are skipped.
    const { r, lignes, arrets, apresArret, pendantPause } = await collecteEnPanne(domainesP(2_000), () => true);
    const pauses = lignes.filter((l) => l.startsWith("pause d'urgence de 1 min après "));
    expect(pauses).toHaveLength(2);
    expect(pauses[0]).toMatch(
      /\(dépassement 1 sur 3\) : 10 des 10 derniers domaines en échec \(seuil : 50 %\) ; la mesure reprend ensuite, et recompte$/,
    );
    expect(pauses[1]).toMatch(/\(dépassement 2 sur 3\)/);
    expect(r.arret).toMatch(
      /^arrêt d'urgence après [0-9]+ domaines : 10 des 10 derniers domaines en échec \(seuil : 50 %\), au dépassement 3 de suite \(une pause de 1 min après chacun des précédents\)$/,
    );
    expect(lignes.indexOf(pauses[1] ?? "")).toBeLessThan(
      lignes.indexOf(`${r.arret} ; plus aucune question, le jour ne sera pas publié`),
    );
    expect(arrets).toEqual([r.arret]);
    expect(apresArret).toBe(0);
    expect(pendantPause).toBe(0);
    expect(lignes).toContain("reprise 1 sautée : arrêt d'urgence");
    expect(r.domaines.size).toBeLessThan(2_000);
    // The domains under way at the stop are marked unfinished (the diagnosis and Quad9 leave them aside); each was
    // opened (its zone's measurement ends, answered « ERREUR » without being asked).
    expect(r.inacheves.size).toBeGreaterThan(0);
    expect(r.inacheves.size).toBeLessThan(r.domaines.size);
    for (const u of r.inacheves) expect(r.domaines.has(u)).toBe(true);
  });

  it("starts no pause after a trial's deadline, though the domains in flight end in failure past it", async () => {
    // The wall clock jumps past the deadline at the first question of p3, with 24 domains in flight; every question
    // fails after it, so that a count of breaches would bring a pause (the review of PR 25).
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const fin = Date.now() + 3_600_000;
      let saute = false;
      const { r, lignes } = await collecteEnPanne(
        domainesP(200),
        (nom) => {
          if (!saute && numero(nom) === 3) {
            saute = true;
            vi.setSystemTime(fin + 1);
          }
          return saute;
        },
        { enVol: 24, aleatoire: () => 0.999_999, finPremierePasse: fin },
      );
      expect(saute).toBe(true);
      expect(r.arret).toBeNull();
      expect(lignes.some((l) => l.startsWith("pause d'urgence"))).toBe(false);
      expect(lignes.some((l) => /^première passe arrêtée à l'heure limite : [0-9]+ tâches laissées$/.test(l))).toBe(
        true,
      );
      expect(r.domaines.size).toBeLessThanOrEqual(24);
      expect(r.domaines.size + r.premierePasseCoupee).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens no domain after a trial's deadline, though its task was taken before it", async () => {
    // The wall clock jumps past the deadline as p5's task, taken with 23 others, is about to open its domain (the brake
    // is asked just before): p5 and the tasks after it never open (the review of PR 25: 507 domains opened past it).
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const fin = Date.now() + 3_600_000;
      /** The domains whose task asked the brake before the jump: the only ones that may open. */
      const avant = new Set<string>();
      let saute = false;
      const { r } = await collecteEnPanne(domainesP(200), () => false, {
        enVol: 24,
        aleatoire: () => 0.999_999,
        finPremierePasse: fin,
        frein: async (nom, _zone, ouverture) => {
          if (!ouverture || saute) return;
          if (nom === "p5.example") {
            saute = true;
            vi.setSystemTime(fin + 1);
          } else avant.add(nom);
        },
      });
      expect(saute).toBe(true);
      expect(r.domaines.size).toBeGreaterThan(0);
      for (const d of r.domaines.keys()) expect(avant.has(d)).toBe(true);
      expect(r.domaines.size + r.premierePasseCoupee).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks unfinished only the domains under way at the stop, never the one whose count brought it", async () => {
    // One task at a time: at the stop, the only domain under way is the one that brought it, so none is unfinished
    // (marking it, or every failing domain, would leave Quad9 nothing to confirm on a stopped day).
    const { r } = await collecteEnPanne(domainesP(200), () => true, enOrdre);
    expect(r.arret).not.toBeNull();
    expect(r.domaines.size).toBeGreaterThan(0);
    expect(r.inacheves.size).toBe(0);
  });

  it("only pauses for a short outage: the alert is lifted, and the collection goes to its end, retries included", async () => {
    // The servers fail until the first pause starts, then answer: a full count under the threshold lifts the alert,
    // no stop, every domain measured, and the failed ones asked again by the retries.
    const { r, lignes, pendantPause, rafaleApresPause } = await collecteEnPanne(
      domainesP(2_000),
      (_nom, _type, lignes) => lignes.every((l) => !l.startsWith("pause d'urgence")),
    );
    // The questions held go out again at the names' pace, never in one burst.
    expect(rafaleApresPause).toBeGreaterThan(0);
    expect(rafaleApresPause).toBeLessThanOrEqual(25);
    expect(lignes.filter((l) => l.startsWith("pause d'urgence"))).toHaveLength(1);
    expect(lignes.filter((l) => l.startsWith("alerte levée après "))).toHaveLength(1);
    // The pause holds every question, those of the domains already open included.
    expect(pendantPause).toBe(0);
    expect(r.arret).toBeNull();
    expect(r.inacheves.size).toBe(0);
    expect(r.domaines.size).toBe(2_000);
    expect([...r.noms.values()].filter((m) => m.etat === "echec")).toEqual([]);
  });

  it("counts a domain as the guard does: its web name, its zone or its MX, never its CAA (one domain at a time)", async () => {
    const pauseA = (lignes: readonly string[]) => lignes.find((l) => l.startsWith("pause d'urgence"));
    // Four domains in ten fail by their web name: 40 %, under the threshold of 50 %, never a pause.
    const sous = await collecteEnPanne(domainesP(60), (nom) => nom.startsWith("www.") && numero(nom) % 10 < 4, enOrdre);
    expect(pauseA(sous.lignes)).toBeUndefined();
    expect(sous.r.arret).toBeNull();
    // Five in ten, by their zone or their web name: 50 %, pauses at the 10th and 20th domains, the stop at the 30th.
    const au = await collecteEnPanne(
      domainesP(60),
      (nom, type) => numero(nom) % 10 < 5 && (nom.startsWith("www.") || (numero(nom) % 2 === 0 && type === "NS")),
      enOrdre,
    );
    expect(pauseA(au.lignes)).toMatch(/^pause d'urgence de 1 min après 10 domaines \(dépassement 1 sur 3\) : 5 des 10/);
    expect(au.r.arret).toMatch(/^arrêt d'urgence après 30 domaines : 5 des 10 derniers domaines en échec/);
    // Five in ten by their zone's NS question alone (an outage of the zones only, their web names answered): they count.
    const zones = await collecteEnPanne(
      domainesP(20),
      (nom, type) => type === "NS" && !nom.startsWith("www.") && numero(nom) % 10 < 5,
      enOrdre,
    );
    expect(pauseA(zones.lignes)).toMatch(/^pause d'urgence de 1 min après 10 domaines/);
    // Five in ten by their MX question alone: they count.
    const mx = await collecteEnPanne(domainesP(20), (nom, type) => type === "MX" && numero(nom) % 10 < 5, enOrdre);
    expect(pauseA(mx.lignes)).toMatch(/^pause d'urgence de 1 min après 10 domaines/);
    // Five in ten by their CAA question alone (or their TXT): the guard does not count them, nor does the stop.
    const caa = await collecteEnPanne(
      domainesP(20),
      (nom, type) => (type === "CAA" || type === "TXT") && numero(nom) % 10 < 5,
      enOrdre,
    );
    expect(pauseA(caa.lignes)).toBeUndefined();
  });

  /** A clock moved by hand: a sleep ends only when `avancer` passes its instant. */
  function horlogeManuelle() {
    let t = 0;
    let reveils: { a: number; reveil: () => void }[] = [];
    const horloge: Horloge = {
      maintenant: () => t,
      dormir: (ms) =>
        new Promise<void>((reveil) => {
          if (ms <= 0) reveil();
          else reveils.push({ a: t + ms, reveil });
        }),
    };
    const avancer = async (ms: number) => {
      t += ms;
      const prets = reveils.filter((r) => r.a <= t);
      reveils = reveils.filter((r) => r.a > t);
      for (const r of prets) r.reveil();
      for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setImmediate(resolve));
    };
    return { horloge, avancer };
  }

  /** A resolver that answers at once, and notes each question with the clock's instant. */
  const baseNotee = (horloge: Horloge) => {
    const envois: string[] = [];
    const base: ClientDns = {
      id: "base",
      demander: async (nom, type) => {
        envois.push(`${horloge.maintenant()} ${nom} ${type}`);
        return { code: "NOERROR", ad: false, reponses: [], duree: 1 };
      },
      fermer: () => {},
    };
    return { base, envois };
  };

  it("never sends during a pause a question that was waiting for its instant: it waits for the end", async () => {
    const { horloge, avancer } = horlogeManuelle();
    const { base, envois } = baseNotee(horloge);
    // One question per second per server: the second question of the zone waits a second for its instant.
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge, 1);
    await client.demander("a.example", "NS");
    const soa = client.demander("a.example", "SOA");
    await avancer(0);
    client.pauser(60_000);
    await avancer(1_000);
    expect(envois).toEqual(["0 a.example NS"]);
    await avancer(59_000);
    await soa;
    expect(envois).toEqual(["0 a.example NS", "60000 a.example SOA"]);
  });

  it("lets the questions held by a pause go out one at a time, at the names' pace", async () => {
    const { horloge, avancer } = horlogeManuelle();
    const { base, envois } = baseNotee(horloge);
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge);
    client.pauser(60_000);
    const questions = Array.from({ length: 5 }, (_, i) => client.demander(`z${i}.example`, "NS"));
    await avancer(60_000);
    expect(envois).toHaveLength(1);
    for (let i = 0; i < 4; i += 1) await avancer(40);
    await Promise.all(questions);
    expect(envois.map((e) => Number(e.split(" ")[0]))).toEqual([60_000, 60_040, 60_080, 60_120, 60_160]);
  });

  it("lets them go out at the pace the collection gives, 10 names per second here, never a fixed 25", async () => {
    // collecter passes POLITESSE.nomsParSeconde to the pause (a one-line wiring, read in review: a whole collection's
    // fake clock cannot show that pace among the others).
    const { horloge, avancer } = horlogeManuelle();
    const { base, envois } = baseNotee(horloge);
    const client = new ClientParZone(base, zoneDe, 2, undefined, Number.POSITIVE_INFINITY, horloge);
    client.pauser(60_000, 10);
    const questions = Array.from({ length: 3 }, (_, i) => client.demander(`z${i}.example`, "NS"));
    await avancer(60_000);
    for (let i = 0; i < 2; i += 1) await avancer(100);
    await Promise.all(questions);
    expect(envois.map((e) => Number(e.split(" ")[0]))).toEqual([60_000, 60_100, 60_200]);
  });

  it("starts again from the first breach after a lifted alert: two separate outages only pause", async () => {
    // A first outage until the first pause; the alert is lifted; a second one, until the next pause; then no more.
    const { r, lignes } = await collecteEnPanne(domainesP(2_000), (_nom, _type, lignes) => {
      const pauses = lignes.filter((l) => l.startsWith("pause d'urgence")).length;
      const levees = lignes.filter((l) => l.startsWith("alerte levée")).length;
      return pauses === 0 || (levees === 1 && pauses === 1);
    });
    const pauses = lignes.filter((l) => l.startsWith("pause d'urgence"));
    expect(pauses).toHaveLength(2);
    for (const pause of pauses) expect(pause).toMatch(/\(dépassement 1 sur 3\)/);
    expect(lignes.filter((l) => l.startsWith("alerte levée"))).toHaveLength(2);
    expect(r.arret).toBeNull();
  });

  it("stops at a breach once the day's pauses are all taken, even after a lifted alert", async () => {
    // Two separate outages, one pause a day at most: the first one pauses, the alert is lifted, the second one stops
    // (repeated pauses would eat the retries' time).
    const { r, lignes } = await collecteEnPanne(
      domainesP(2_000),
      (_nom, _type, lignes) =>
        lignes.every((l) => !l.startsWith("pause d'urgence")) || lignes.some((l) => l.startsWith("alerte levée")),
      { arret: { fenetre: 10, part: 0.5, pauseMs: 60_000, depassements: 3, pausesMax: 1 } },
    );
    expect(lignes.filter((l) => l.startsWith("pause d'urgence"))).toHaveLength(1);
    expect(lignes.filter((l) => l.startsWith("alerte levée"))).toHaveLength(1);
    expect(r.arret).toMatch(
      /^arrêt d'urgence après [0-9]+ domaines : (?:[5-9]|10) des 10 derniers domaines en échec \(seuil : 50 %\), toutes les pauses du jour prises \(1 sur 1\)$/,
    );
  });

  it("never counts the retries: a retry full of failures never pauses nor stops", async () => {
    // Four domains in ten always fail: under the threshold in the first pass, all of them in each retry.
    const { r, lignes } = await collecteEnPanne(domainesP(60), (nom) => numero(nom) % 10 < 4, enOrdre);
    expect(lignes.some((l) => l.startsWith("reprise 2 dans "))).toBe(true);
    expect(lignes.some((l) => l.startsWith("pause d'urgence"))).toBe(false);
    expect(r.arret).toBeNull();
  });

  it("asks again, at the next attempt, a zone that was down", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(["mairie.example"]));
    await collecter(new Map([["www.mairie.example", "mairie.example"]]), r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
    });
    // The first pass and its two attempts each open the zone again (its NS, asked once more when it fails). The name
    // answered its A, but its AAAA was not asked once the zone was down: a failure (not a SERVFAIL), asked again at
    // each attempt, where it opens the zone before the domain's own NS question (2 + 3 + 3).
    expect(r.questions.filter((q) => q === "mairie.example NS")).toHaveLength(8);
  });

  it("asks 13 name servers of a domain at most, however many it names", async () => {
    const nombreux: ZoneSimulee = {
      ...ZONE,
      "large.example": {
        NS: Array.from({ length: 40 }, (_, i) => ({ type: "NS" as const, cible: `ns${i}.large.example` })),
      },
    };
    const r = new ResolveurSimule(nombreux, zoneDe);
    await collecter(new Map([["large.example", "large.example"]]), r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
    });
    expect(new Set(r.questions.filter((q) => /^ns\d+\.large\.example A$/.test(q))).size).toBe(13);
  });

  it("keeps the pace: 25 names per second at most", async () => {
    const horloge = fausseHorloge();
    const cent = new Map(Array.from({ length: 100 }, (_, i) => [`n${i}.mairie.example`, "mairie.example"] as const));
    await collecter(cent, new ResolveurSimule(ZONE, zoneDe), { ...POLITESSE, zoneDe, horloge });
    expect(horloge.maintenant()).toBeGreaterThanOrEqual((99 / 25) * 1000);
  });
});
