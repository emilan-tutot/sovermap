// The local directory's workflow guards (the review of PR 18): read as text, so that a later edit cannot drop one
// silently.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/annuaire.yml", "utf8");
/** The text of one job, from its name to the next job's. */
const tache = (nom: string) => {
  const debut = workflow.indexOf(`\n  ${nom}:\n`);
  if (debut === -1) throw new Error(`tâche ${nom} absente`);
  const suite = workflow.slice(debut + 1).search(/\n {2}[a-z]+:\n/);
  return suite === -1 ? workflow.slice(debut) : workflow.slice(debut, debut + 1 + suite);
};

describe("the local directory's workflow", () => {
  it("writes « donnees » from the code of « main » only, never from a pull request or another branch", () => {
    const publier = tache("publier");
    expect(publier).toContain("github.event_name != 'pull_request'");
    expect(publier).toContain("github.ref == 'refs/heads/main'");
    expect(publier).toContain("contents: write");
    expect(tache("lire")).not.toContain("contents: write");
  });

  it("reads Hugging Face once at a time: the trials of every pull request share one group", () => {
    expect(workflow).toContain("group: annuaire-${{ github.event_name == 'pull_request' && 'essai' || 'courant' }}");
    expect(workflow).not.toContain("github.ref || 'courant'");
  });

  it("runs its trial when the reading or the control of personal data changes", () => {
    for (const chemin of ["pipeline/annuaire-local.ts", "pipeline/cli/annuaire.ts", "pipeline/personnelles.ts"]) {
      expect(workflow).toContain(`- "${chemin}"`);
    }
  });
});
