// The daily collection's workflow guards (the code review of PR 6, findings 2, 3, 4 and 5): read as text, so that a
// later edit cannot drop one silently.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/collecte.yml", "utf8");
/** The text of one job, from its name to the next job's. */
const tache = (nom: string) => {
  const debut = workflow.indexOf(`\n  ${nom}:\n`);
  if (debut === -1) throw new Error(`tâche ${nom} absente`);
  const suite = workflow.slice(debut + 1).search(/\n {2}[a-z]+:\n/);
  return suite === -1 ? workflow.slice(debut) : workflow.slice(debut, debut + 1 + suite);
};

describe("the collection's workflow", () => {
  it("never reads an error of GitHub's API as « today is not done » (the day would be measured twice)", () => {
    const jour = tache("jour");
    expect(jour).toContain('grep -q "HTTP 404"');
    expect(jour).not.toMatch(/\|\| true\)/);
    expect(jour).not.toMatch(/\|\| echo 0/);
    // A failed check of the day opens the issue too.
    expect(tache("alerter")).toContain("needs.jour.result == 'failure'");
  });

  it("measures the day the check named, never the clock's", () => {
    const mesurer = tache("mesurer");
    expect(mesurer).toContain("DATE: ${{ needs.jour.outputs.date }}");
    expect(mesurer).toContain('--date "$DATE"');
  });

  it("publishes only a day newer than the published one, before replacing any file", () => {
    const publier = tache("publier");
    const controle = publier.indexOf('[[ ! "$du_jour" > "$publie" ]]');
    expect(controle).toBeGreaterThan(-1);
    expect(controle).toBeLessThan(publier.indexOf("cp -a ../collecte/sortie/. ./"));
  });

  it("reads « no data branch yet » from exit code 2 only, in the measuring and the publishing jobs", () => {
    for (const nom of ["mesurer", "publier"]) {
      const texte = tache(nom);
      expect(texte).toContain("git ls-remote --exit-code --heads origin donnees");
      expect(texte).toMatch(/2\)|-eq 2/);
      expect(texte).toContain("exit 1");
    }
  });

  it("never lets a trial take the place of a day's measurement, nor measure during or around one", () => {
    const mesurer = tache("mesurer");
    expect(mesurer).toContain("group: collecte-mesure-${{ github.event_name == 'pull_request' && 'essai' || 'jour' }}");
    const creneau = mesurer.indexOf("npx tsx pipeline/cli/creneau-essai.ts");
    expect(creneau).toBeGreaterThan(-1);
    expect(creneau).toBeLessThan(mesurer.indexOf("docker run -d --name knot"));
    expect(mesurer.slice(mesurer.lastIndexOf("- if:", creneau), creneau)).toContain(
      "github.event_name == 'pull_request'",
    );
  });
});
