// Tests of the fourth rule's safeguard: a made-up control resolver, documentation names only (RFC 2606) and addresses
// of documentation (RFC 5737).
import { describe, expect, it } from "vitest";
import type { ClientDns, Code, Reponse } from "./dns-bas";
import { generateur } from "./politesse";
import { controleDu, type EtatRegleInterne, lireEtatRegleInterne, NOMS_REPOSES, reposerNoms } from "./regle-interne";

const codes = (c: Partial<EtatRegleInterne["controle"]["codes"]> = {}): EtatRegleInterne["controle"]["codes"] => ({
  avecAdresse: 0,
  nxdomain: 0,
  sansAdresse: 0,
  servfail: 0,
  delai: 0,
  autre: 0,
  ...c,
});

const etat = (e: Partial<EtatRegleInterne> = {}): EtatRegleInterne => ({
  etat: "appliquée",
  liste: "2026-11-19",
  methode: "0.3",
  controle: { date: "2026-11-21", poses: 20, reponses: 0, codes: codes({ servfail: 20 }) },
  ...e,
});

type Reponse1 = { code: Code; adresse?: "A" | "AAAA" };
/** A control resolver: `reponse(nom, type)` gives the code, and an address record of that type when asked for. */
const client = (reponse: (nom: string, type: string) => Reponse1): ClientDns & { poses: string[] } => {
  const poses: string[] = [];
  return {
    id: "quad9",
    poses,
    demander: async (nom, type) => {
      poses.push(`${nom} ${type}`);
      const r = reponse(nom, type);
      const reponses: Reponse["reponses"] =
        r.adresse === "A"
          ? [{ proprietaire: nom, ttl: 300, donnee: { type: "A", adresse: "192.0.2.80" } }]
          : r.adresse === "AAAA"
            ? [{ proprietaire: nom, ttl: 300, donnee: { type: "AAAA", adresse: "2001:db8::80" } }]
            : [];
      return { code: r.code, ad: false, reponses, duree: 1 };
    },
    fermer: () => {},
  };
};

const NOMS = Array.from({ length: 50 }, (_, i) => `n${i}.in.phm.ministere.example`);

describe("the safeguard of the fourth rule (internal sub-zones)", () => {
  it("asks again at a new list or under a new method, never twice for one list, and keeps a suspension", () => {
    expect(controleDu(null, "2026-11-19", "0.3")).toBe("reposer");
    expect(controleDu(etat(), "2026-11-19", "0.3")).toBe("garder");
    expect(controleDu(etat(), "2026-12-01", "0.3")).toBe("reposer");
    expect(controleDu(etat(), "2026-11-19", "0.4")).toBe("reposer");
    // Only a review (a new method) lifts a suspension, never a new list.
    expect(controleDu(etat({ etat: "suspendue" }), "2026-12-01", "0.3")).toBe("garder");
    expect(controleDu(etat({ etat: "suspendue" }), "2026-12-01", "0.4")).toBe("reposer");
  });

  it("asks 20 names drawn at random, and counts every category of answer", async () => {
    const muets = client(() => ({ code: "SERVFAIL" }));
    const r = await reposerNoms(muets, NOMS, generateur(1), "2026-11-21", "2026-11-19", "0.3");
    expect(muets.poses).toHaveLength(NOMS_REPOSES);
    expect(new Set(muets.poses).size).toBe(NOMS_REPOSES);
    expect(muets.poses.every((q) => q.endsWith(" A"))).toBe(true);
    expect(r).toEqual(etat());
    // Fewer names than 20: all of them, once.
    const peu = client(() => ({ code: "SERVFAIL" }));
    const trois = await reposerNoms(peu, NOMS.slice(0, 3), generateur(1), "2026-11-21", "2026-11-19", "0.3");
    expect(trois.controle.poses).toBe(3);
  });

  it("suspends the rule only for a name with an address: NXDOMAIN or NOERROR without one never does", async () => {
    const tires = client(() => ({ code: "SERVFAIL" }));
    await reposerNoms(tires, NOMS, generateur(1), "2026-11-21", "2026-11-19", "0.3");
    const noms = tires.poses.map((q) => q.split(" ")[0]);
    // One « does not exist », one NOERROR without an address (its AAAA asked too), the rest SERVFAIL or timeouts.
    const sansAdresse = client((nom) =>
      nom === noms[0]
        ? { code: "NXDOMAIN" }
        : nom === noms[1]
          ? { code: "NOERROR" }
          : { code: nom === noms[2] ? "TIMEOUT" : "SERVFAIL" },
    );
    const r = await reposerNoms(sansAdresse, NOMS, generateur(1), "2026-11-21", "2026-11-19", "0.3");
    expect(r.etat).toBe("appliquée");
    expect(r.controle).toEqual({
      date: "2026-11-21",
      poses: 20,
      reponses: 0,
      codes: codes({ nxdomain: 1, sansAdresse: 1, delai: 1, servfail: 17 }),
    });
    expect(sansAdresse.poses).toContain(`${noms[1]} AAAA`);
    // A without an address, then an AAAA that times out: unknown, never « no address ».
    const aaaaMuet = client((nom, type) =>
      nom === noms[0] ? (type === "AAAA" ? { code: "TIMEOUT" } : { code: "NOERROR" }) : { code: "SERVFAIL" },
    );
    const inconnu = await reposerNoms(aaaaMuet, NOMS, generateur(1), "2026-11-21", "2026-11-19", "0.3");
    expect(inconnu.controle.codes).toEqual(codes({ delai: 1, servfail: 19 }));
    // A name with an IPv6 address only answers too.
    const ipv6 = client((nom, type) =>
      nom === noms[4]
        ? type === "AAAA"
          ? { code: "NOERROR", adresse: "AAAA" }
          : { code: "NOERROR" }
        : { code: "SERVFAIL" },
    );
    const s = await reposerNoms(ipv6, NOMS, generateur(1), "2026-11-21", "2026-11-19", "0.3");
    expect(s).toMatchObject({
      etat: "suspendue",
      controle: { reponses: 1, codes: codes({ avecAdresse: 1, servfail: 19 }) },
    });
  });

  it("proves nothing when Quad9 never answers: the rule keeps its state, and the list is asked again", async () => {
    const muet = client(() => ({ code: "TIMEOUT" }));
    const suspendue = await reposerNoms(
      muet,
      NOMS,
      generateur(1),
      "2026-12-02",
      "2026-12-01",
      "0.3",
      etat({ etat: "suspendue" }),
    );
    expect(suspendue).toMatchObject({ etat: "suspendue", liste: "2026-11-19" });
    expect(controleDu(suspendue, "2026-12-01", "0.3")).toBe("garder");
    const neuve = await reposerNoms(muet, NOMS, generateur(1), "2026-12-02", "2026-12-01", "0.3");
    expect(neuve).toMatchObject({ etat: "appliquée", liste: "", methode: "", controle: { poses: 20, reponses: 0 } });
    expect(neuve.controle.codes).toEqual(codes({ delai: 20 }));
    expect(controleDu(neuve, "2026-12-01", "0.3")).toBe("reposer");
    // After a review (a new method, the same list), a check that proves nothing keeps yesterday's method: the review's
    // check happens the next day.
    const revue = await reposerNoms(muet, NOMS, generateur(1), "2026-12-02", "2026-11-19", "0.4", etat());
    expect(revue).toMatchObject({ liste: "2026-11-19", methode: "0.3" });
    expect(controleDu(revue, "2026-11-19", "0.4")).toBe("reposer");
    expect(lireEtatRegleInterne(neuve)?.methode).toBe("");
  });

  it("reads yesterday's state field by field, and nothing else", () => {
    // Dates and a version only: nothing else is ever published again from yesterday's state.
    expect(lireEtatRegleInterne({ ...etat(), liste: "" })?.liste).toBe("");
    expect(lireEtatRegleInterne({ ...etat(), liste: "<b>gras</b>" })).toBeNull();
    expect(lireEtatRegleInterne({ ...etat(), methode: "la dernière" })).toBeNull();
    expect(lireEtatRegleInterne({ ...etat(), controle: { ...etat().controle, date: "hier" } })).toBeNull();
    expect(lireEtatRegleInterne(etat())).toEqual(etat());
    expect(lireEtatRegleInterne({ ...etat(), etat: "peut-être" })).toBeNull();
    expect(lireEtatRegleInterne({ ...etat(), controle: { date: "2026-11-21", poses: -1, reponses: 0 } })).toBeNull();
    expect(lireEtatRegleInterne("appliquée")).toBeNull();
    expect(lireEtatRegleInterne(undefined)).toBeNull();
    // The six categories only, each a count: anything else is dropped, a missing one is 0.
    const bruts = { "<b>": 1, servfail: 2.5, delai: 3, SERVFAIL: 4 };
    expect(lireEtatRegleInterne({ ...etat(), controle: { ...etat().controle, codes: bruts } })?.controle.codes).toEqual(
      codes({ delai: 3 }),
    );
  });
});
