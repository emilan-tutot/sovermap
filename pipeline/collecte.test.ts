// Tests of the measurement and of its scheduling: a simulated resolver, a fake clock, documentation names and
// addresses only (RFC 2606, RFC 5737, RFC 3849).
import { describe, expect, it } from "vitest";
import { collecter, POLITESSE } from "./collecte";
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

  it("waits for the brake before every question", async () => {
    let freinages = 0;
    const r = new ResolveurSimule(ZONE, zoneDe);
    await collecter(noms, r, {
      ...POLITESSE,
      zoneDe,
      horloge: fausseHorloge(),
      frein: async () => {
        freinages += 1;
      },
    });
    expect(freinages).toBe(r.questions.length);
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

  it("keeps the pace: 25 names per second at most", async () => {
    const horloge = fausseHorloge();
    const cent = new Map(Array.from({ length: 100 }, (_, i) => [`n${i}.mairie.example`, "mairie.example"] as const));
    await collecter(cent, new ResolveurSimule(ZONE, zoneDe), { ...POLITESSE, zoneDe, horloge });
    expect(horloge.maintenant()).toBeGreaterThanOrEqual((99 / 25) * 1000);
  });
});
