// The monthly check of the pinned copies (the owner's answer to point 13, § 8): what is pinned is read from the
// repository's own files, what is newer from each source's answer (made-up answers here: no network in the tests).
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  etiquetteRecente,
  etiquettesDe,
  imageEpinglee,
  millesimeEpingle,
  millesimeRecent,
  versionPsl,
} from "../scripts/lib/copies";

const DIGEST = (c: string) => `sha256:${c.repeat(64)}`;

describe("the pinned copies", () => {
  it("reads the pinned image, the Public Suffix List's version and the COG's vintage from the repository", () => {
    const image = imageEpinglee(readFileSync(".github/workflows/collecte.yml", "utf8"));
    expect(image?.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(image?.etiquette).toMatch(/^v6[.][0-9]+[.][0-9]+-[0-9]{8}$/);
    const copie = readdirSync("referentiels/psl").find((f) => f.endsWith(".dat")) ?? "";
    expect(versionPsl(readFileSync(`referentiels/psl/${copie}`, "utf8"))).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}_/);
    const pays = JSON.parse(readFileSync("referentiels/pays.json", "utf8")) as { sources: Record<string, unknown> };
    expect(millesimeEpingle(pays.sources)).toBeGreaterThanOrEqual(2026);
  });

  it("takes the latest weekly build of the pinned major version, never another major or an undated tag", () => {
    const etiquettes = etiquettesDe({
      results: [
        { name: "latest", digest: DIGEST("a") },
        { name: "latest6", digest: DIGEST("a") },
        { name: "v6.5.1", digest: DIGEST("a") },
        { name: "v6.5.1-20261110", digest: DIGEST("b") },
        { name: "v6.5.1-20261124", digest: DIGEST("c") },
        { name: "v6.6.0-20261124", digest: DIGEST("d") },
        { name: "v5.7.9-20261201", digest: DIGEST("e") },
        { name: "v6.5.2-20261201" },
        { name: 7, digest: DIGEST("f") },
      ],
    });
    expect(etiquettes.map((e) => e.nom)).not.toContain("v6.5.2-20261201");
    expect(etiquetteRecente(etiquettes, "v6.5.1-20261117")).toEqual({ nom: "v6.6.0-20261124", digest: DIGEST("d") });
    expect(etiquetteRecente(etiquettes, "pas une étiquette")).toBeNull();
    expect(etiquettesDe({ results: "non" })).toEqual([]);
  });

  it("reads a list's version line and the latest vintage among the COG's resources", () => {
    expect(versionPsl("// ===BEGIN ICANN DOMAINS===\n// VERSION: 2026-12-01_08-30-20_UTC\n// COMMIT: x\n")).toBe(
      "2026-12-01_08-30-20_UTC",
    );
    expect(versionPsl("// VERSION: demain")).toBeNull();
    expect(
      millesimeRecent({
        resources: [
          { title: "Millésime 2026 : Pays et territoires étrangers au 01/01/2026" },
          { title: "Millésime 2027 : Pays et territoires étrangers au 01/01/2027" },
          { title: "Communes" },
        ],
      }),
    ).toBe(2027);
    expect(millesimeRecent({ resources: "non" })).toBeNull();
    expect(millesimeEpingle({ "natural-earth-admin-0": 41 })).toBeNull();
  });

  it("runs once a month or by hand, never on a pull request, with the least rights", () => {
    const workflow = readFileSync(".github/workflows/copies.yml", "utf8");
    expect(workflow).toContain('- cron: "23 6 3 * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/^\s*(pull_request|push):/m);
    expect(workflow).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(workflow).toMatch(/permissions:\n {6}contents: read\n {6}issues: write\n/);
    expect(workflow).toContain("npx tsx scripts/copies-epinglees.ts > rapport.md");
    expect(workflow).toContain('titre="Copie épinglée à renouveler"');
  });

  it("gives the token to the issue's step only: npm and the script never see it", () => {
    const workflow = readFileSync(".github/workflows/copies.yml", "utf8");
    const etapes = workflow.split(/\n {6}- /);
    const avecJeton = etapes.filter((e) => e.includes("GH_TOKEN"));
    expect(avecJeton).toHaveLength(1);
    expect(avecJeton[0]).toContain("if: steps.verification.outputs.code == '3'");
    expect(avecJeton[0]).toContain("gh issue");
    expect(avecJeton[0]).not.toMatch(/npm|npx|tsx/);
    expect(workflow).not.toMatch(/^ {4}env:\n {6}GH_TOKEN/m);
  });

  it("opens the issue when a copy is to renew even if another could not be read, and is green only when all were read", () => {
    const script = readFileSync("scripts/copies-epinglees.ts", "utf8");
    expect(script).toContain("process.exitCode = aRenouveler.length > 0 ? 3 : erreurs.length > 0 ? 1 : 0;");
    const workflow = readFileSync(".github/workflows/copies.yml", "utf8");
    expect(workflow).toContain('if [ "$CODE" = "0" ]; then exit 0; fi');
    expect(workflow).toContain('if [ "$CODE" = "3" ] && ! grep -q "^Lectures impossibles" rapport.md; then exit 0; fi');
    // Any other exit (1, a killed process) is red.
    expect(workflow).toMatch(/then exit 0; fi\n[^\n]*\n {10}exit 1\n/);
  });
});
