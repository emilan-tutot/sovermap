// The collection refuses more than 200 names outside GitHub Actions (brief B.10).
import { describe, expect, it } from "vitest";
import { verifierLimite } from "./garde";

describe("the limit of a trial", () => {
  it("refuses more than 200 names outside GitHub Actions, and only there", () => {
    expect(() => verifierLimite(200, {})).not.toThrow();
    expect(() => verifierLimite(201, {})).toThrow(/200 noms au plus/);
    expect(() => verifierLimite(201, { GITHUB_ACTIONS: "false" })).toThrow();
    expect(() => verifierLimite(122_000, { GITHUB_ACTIONS: "true" })).not.toThrow();
  });
});
