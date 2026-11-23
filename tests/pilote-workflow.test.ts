// The measurement point's pilot workflow (brief B.4): read as text, so that a later edit cannot let it run by itself,
// write to the repository or keep a token.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/pilote-ecs.yml", "utf8");
/** The workflow without its comments: what runs. */
const actif = workflow
  .split("\n")
  .filter((l) => !l.trim().startsWith("#"))
  .join("\n");

describe("the pilot's workflow", () => {
  it("runs by hand only, never on a schedule nor for a pull request", () => {
    expect(workflow).toMatch(/^on:\n {2}workflow_dispatch:\n/m);
    expect(workflow).not.toMatch(/schedule:|pull_request|push:/);
  });

  it("reads only: contents read, no token kept in the checkouts, actions pinned by their hash", () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(actif).not.toMatch(/: *write/);
    const checkouts = workflow.match(/uses: actions\/checkout@/g) ?? [];
    expect(checkouts).toHaveLength(2);
    expect((workflow.match(/persist-credentials: false/g) ?? []).length).toBe(checkouts.length);
    for (const uses of workflow.match(/uses: [^\n]+/g) ?? []) expect(uses).toMatch(/@[0-9a-f]{40} # v/);
    expect(workflow).toContain("runs-on: ubuntu-24.04");
  });

  it("asks through the pilot's script only, with the hand-surveyed IPtoASN copy, and keeps its report in the artifact", () => {
    expect(actif).toContain("gh release download sources-iptoasn");
    expect(actif).not.toContain("iptoasn.com");
    expect(workflow).toContain("npx tsx scripts/pilote-ecs.ts --donnees donnees");
    expect(workflow).toContain("name: pilote-ecs");
  });
});
