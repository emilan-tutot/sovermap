// The collection refuses more than 200 names outside GitHub Actions (brief B.10).
import { describe, expect, it } from "vitest";
import { type Garde, gardesPannes, veilleUtilisable, verifierLimite } from "./garde";

describe("the limit of a trial", () => {
  it("refuses more than 200 names outside GitHub Actions, and only there", () => {
    expect(() => verifierLimite(200, {})).not.toThrow();
    expect(() => verifierLimite(201, {})).toThrow(/200 noms au plus/);
    expect(() => verifierLimite(201, { GITHUB_ACTIONS: "false" })).toThrow();
    expect(() => verifierLimite(122_000, { GITHUB_ACTIONS: "true" })).not.toThrow();
  });
});

describe("the confirmed breakdowns' guards", () => {
  it("never stay red for ever after a real, lasting change: tomorrow compares with today's measurement", () => {
    // A shared host stops for good: confirmed breakdowns go from 1 % to 3.5 %.
    const jourN = gardesPannes(0.035, 0.01);
    expect(jourN).toEqual({ plafond: true, hausse: false });
    const gardesN: Garde[] = [
      { nom: "témoins concordants", ok: true, detail: "" },
      { nom: "pannes confirmées sous 8 %", ok: jourN.plafond, detail: "" },
      {
        nom: "pannes confirmées à moins de 2 points de la veille",
        ok: jourN.hausse,
        detail: "",
        relatifALaVeille: true,
      },
      { nom: "disjoncteur sous 2 %", ok: true, detail: "", relatifALaVeille: true },
    ];
    // Day N is not published, but it is trustworthy: it becomes tomorrow's yesterday.
    expect(gardesN.every((g) => g.ok)).toBe(false);
    expect(veilleUtilisable(gardesN)).toBe(true);
    // Day N+1 compares with day N's 3.5 %, not with the last published 1 %: green.
    expect(gardesPannes(0.035, 0.035)).toEqual({ plafond: true, hausse: true });
  });

  it("keeps the ceiling of 8 %, and a day above it never becomes tomorrow's yesterday", () => {
    expect(gardesPannes(0.081, 0.08)).toEqual({ plafond: false, hausse: true });
    expect(gardesPannes(0.03, null)).toEqual({ plafond: true, hausse: true });
    const gardes: Garde[] = [
      { nom: "pannes confirmées sous 8 %", ok: false, detail: "" },
      { nom: "pannes confirmées à moins de 2 points de la veille", ok: true, detail: "", relatifALaVeille: true },
    ];
    expect(veilleUtilisable(gardes)).toBe(false);
  });
});
