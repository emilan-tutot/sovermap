// The measurement point's pilot script (brief B.4): it never runs outside GitHub's runners (never on the owner's PC),
// and it asks only through the project's polite downloader, within its time limits. No network: the script stops at
// its first check, and a missing input would stop it before any request.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/pilote-ecs.ts", "utf8");

describe("the pilot's script", () => {
  it("refuses to run outside GitHub's runners", () => {
    const r = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/pilote-ecs.ts", "--donnees", "absent", "--iptoasn", "absent", "--sortie", "absent.json"],
      { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "false" }, timeout: 60_000 },
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("le pilote ne tourne que sur les runners de GitHub");
  }, 60_000);

  it("reads its local inputs before any request, then asks through the polite downloader, within its time limits", () => {
    const premiereRequete = script.indexOf("new Telechargeur({");
    for (const lecture of ['fragments<EnregistrementDomaine>(o.donnees, "domaines")', "readFileSync(o.iptoasn)"])
      expect(script.indexOf(lecture)).toBeLessThan(premiereRequete);
    expect(script).toContain("delaiMs: 15_000");
    expect(script).toContain("telechargeur.obtenir(adresse)");
    expect(script).toContain("const DELAI_MS = 30_000;");
    expect(script).toContain("await mesurer(tires, obtenir, contexte, mesure)");
    expect(script).not.toMatch(/[^.]fetch\(/);
  });
});
