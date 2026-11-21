// Tests of the fourth rule's safeguard: a made-up control resolver, documentation names only (RFC 2606).
import { describe, expect, it } from "vitest";
import type { ClientDns, Code } from "./dns-bas";
import { generateur } from "./politesse";
import { controleDu, type EtatRegleInterne, lireEtatRegleInterne, NOMS_REPOSES, reposerNoms } from "./regle-interne";

const etat = (e: Partial<EtatRegleInterne> = {}): EtatRegleInterne => ({
  etat: "appliquée",
  liste: "2026-11-19",
  methode: "0.3",
  controle: { date: "2026-11-21", poses: 20, reponses: 0, codes: { SERVFAIL: 20 } },
  ...e,
});

const client = (code: (nom: string) => Code): ClientDns & { poses: string[] } => {
  const poses: string[] = [];
  return {
    id: "quad9",
    poses,
    demander: async (nom, type) => {
      poses.push(`${nom} ${type}`);
      return { code: code(nom), ad: false, reponses: [], duree: 1 };
    },
    fermer: () => {},
  };
};

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

  it("asks 20 names drawn at random, and suspends the rule as soon as one answers, even « does not exist »", async () => {
    const noms = Array.from({ length: 50 }, (_, i) => `n${i}.in.phm.ministere.example`);
    const muets = client(() => "SERVFAIL");
    const r = await reposerNoms(muets, noms, generateur(1), "2026-11-21", "2026-11-19", "0.3");
    expect(muets.poses).toHaveLength(NOMS_REPOSES);
    expect(new Set(muets.poses).size).toBe(NOMS_REPOSES);
    expect(muets.poses.every((q) => q.endsWith(" A"))).toBe(true);
    expect(r).toEqual(etat());
    const repondant = muets.poses[3]?.split(" ")[0];
    const unRepond = client((nom) => (nom === repondant ? "NXDOMAIN" : "TIMEOUT"));
    const s = await reposerNoms(unRepond, noms, generateur(1), "2026-11-21", "2026-11-19", "0.3");
    expect(s.etat).toBe("suspendue");
    expect(s.controle).toEqual({ date: "2026-11-21", poses: 20, reponses: 1, codes: { NXDOMAIN: 1, TIMEOUT: 19 } });
    // Fewer names than 20: all of them, once.
    const peu = client(() => "SERVFAIL");
    expect(
      (await reposerNoms(peu, noms.slice(0, 3), generateur(1), "2026-11-21", "2026-11-19", "0.3")).controle.poses,
    ).toBe(3);
  });

  it("proves nothing when Quad9 never answers: the rule keeps its state, and the list is asked again", async () => {
    const noms = Array.from({ length: 30 }, (_, i) => `n${i}.in.phm.ministere.example`);
    const muet = client(() => "TIMEOUT");
    const suspendue = await reposerNoms(
      muet,
      noms,
      generateur(1),
      "2026-12-02",
      "2026-12-01",
      "0.3",
      etat({ etat: "suspendue" }),
    );
    expect(suspendue).toMatchObject({ etat: "suspendue", liste: "2026-11-19" });
    expect(controleDu(suspendue, "2026-12-01", "0.3")).toBe("garder");
    const neuve = await reposerNoms(muet, noms, generateur(1), "2026-12-02", "2026-12-01", "0.3");
    expect(neuve).toMatchObject({ etat: "appliquée", liste: "", methode: "", controle: { poses: 20, reponses: 0 } });
    expect(controleDu(neuve, "2026-12-01", "0.3")).toBe("reposer");
    // After a review (a new method, the same list), a check that proves nothing keeps yesterday's method: the review's
    // check happens the next day.
    const revue = await reposerNoms(muet, noms, generateur(1), "2026-12-02", "2026-11-19", "0.4", etat());
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
    // What is not a code, or not a count, is dropped.
    const codes = { "<b>": 1, SERVFAIL: 2.5, TIMEOUT: 3 };
    expect(lireEtatRegleInterne({ ...etat(), controle: { ...etat().controle, codes } })?.controle.codes).toEqual({
      TIMEOUT: 3,
    });
  });
});
