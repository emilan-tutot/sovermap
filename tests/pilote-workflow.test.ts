// The measurement point's pilot workflow (brief B.4): read as text, so that a later edit cannot let it run by itself,
// write to the repository, keep a token or run outside its slot.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/pilote-ecs.yml", "utf8");
/** The workflow without its comments: what runs. */
const actif = workflow
  .split("\n")
  .filter((l) => !l.trim().startsWith("#"))
  .join("\n");
/** The lines of a top-level block (« on: », « permissions: »…), trimmed, empty ones left out. */
function bloc(cle: string): string[] {
  const lignes = actif.split("\n");
  const debut = lignes.indexOf(`${cle}:`);
  if (debut < 0) return [];
  const suite: string[] = [];
  for (const l of lignes.slice(debut + 1)) {
    if (l.trim() === "") continue;
    if (!l.startsWith(" ")) break;
    suite.push(l.trim());
  }
  return suite;
}

describe("the pilot's workflow", () => {
  it("runs by hand only: its only trigger is workflow_dispatch, with no input", () => {
    expect(bloc("on")).toEqual(["workflow_dispatch:"]);
  });

  it("reads only: contents and actions read, no token kept in the checkouts, actions pinned by their hash", () => {
    expect(bloc("permissions")).toEqual(["contents: read"]);
    expect(actif).toMatch(/^ {4}permissions:\n {6}contents: read\n {6}actions: read\n {4}steps:/m);
    expect(actif).not.toMatch(/: *write/);
    const checkouts = actif.match(/uses: actions\/checkout@/g) ?? [];
    expect(checkouts).toHaveLength(2);
    expect((actif.match(/persist-credentials: false/g) ?? []).length).toBe(checkouts.length);
    for (const uses of actif.match(/uses: [^\n]+/g) ?? []) expect(uses).toMatch(/@[0-9a-f]{40} # v/);
    expect(actif).toContain("runs-on: ubuntu-24.04");
  });

  it("waits for a slot clear of the day's collections before anything is asked", () => {
    const garde = actif.indexOf("npx tsx pipeline/cli/creneau-essai.ts");
    expect(garde).toBeGreaterThan(0);
    expect(garde).toBeLessThan(actif.indexOf("npx tsx scripts/pilote-ecs.ts"));
    expect(actif).toContain("--workflow collecte.yml");
  });

  it("asks through the pilot's script only, with the hand-surveyed IPtoASN copy, and keeps its report even when it stops", () => {
    expect(actif).toContain("gh release download sources-iptoasn");
    expect(actif).not.toContain("iptoasn.com");
    expect(actif).toContain("npx tsx scripts/pilote-ecs.ts --donnees donnees");
    expect(actif).toMatch(/- if: always\(\)\n\s+uses: actions\/upload-artifact@/);
    expect(actif).toContain("name: pilote-ecs");
  });
});
