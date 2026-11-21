// Tests of the measurement and of its scheduling: a simulated resolver, a fake clock, documentation names and
// addresses only (RFC 2606, RFC 5737, RFC 3849).
import { describe, expect, it } from "vitest";
import { ClientParZone, collecter, POLITESSE } from "./collecte";
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

  it("sends the first question of a zone alone: the zone's other questions wait for its answer", async () => {
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
    expect(journal).toEqual(["début www.nouveau.example A"]);
    repondre();
    await Promise.all([a, aaaa]);
    expect(journal).toEqual([
      "début www.nouveau.example A",
      "fin www.nouveau.example A",
      "début www.nouveau.example AAAA",
      "fin www.nouveau.example AAAA",
    ]);
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
    const base: ClientDns = {
      id: "base",
      demander: async (nom) => {
        if (!debuts.has(nom)) debuts.set(nom, horloge.maintenant());
        return { code: "NOERROR", ad: false, reponses: [], duree: 1 };
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
    // A zone already open does not wait for its parent again.
    const ensuite = horloge.maintenant();
    await client.demander("www.c.fr", "A");
    expect(t("www.c.fr")).toBe(ensuite);
  });

  it("stops asking a zone whose apex failed three times in a row, until the next attempt", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(["morte.example", "www.morte.example"]));
    const client = new ClientParZone(r, zoneDe, 2);
    for (const type of ["NS", "SOA", "MX"] as const) {
      expect((await client.demander("morte.example", type)).code).toBe("SERVFAIL");
    }
    // The zone is down for this attempt: its names fail at once, without a question, and say so.
    expect((await client.demander("www.morte.example", "A")).code).toBe("ZONE_MUETTE");
    expect(r.questions).toEqual(["morte.example NS", "morte.example SOA", "morte.example MX"]);
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
      demander: async (nom) => {
        debuts.push([nom, horloge.maintenant()]);
        return { code: "NOERROR", ad: false, reponses: [], duree: 1 };
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

  it("asks again, at the next attempt, a zone that was down", async () => {
    const r = new ResolveurSimule(ZONE, zoneDe, new Set(["mairie.example"]));
    await collecter(new Map([["www.mairie.example", "mairie.example"]]), r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
    });
    // The first pass and its two attempts each ask the apex again.
    expect(r.questions.filter((q) => q === "mairie.example NS")).toHaveLength(3);
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
