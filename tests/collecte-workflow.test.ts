// The daily collection's workflow guards (the code review of PR 6, findings 2, 3, 4 and 5): read as text, so that a
// later edit cannot drop one silently.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
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

  it("never publishes an older day, nor another content for the published day", () => {
    const publier = tache("publier");
    const controle = publier.indexOf('[[ "$du_jour" < "$publie" ]]');
    expect(controle).toBeGreaterThan(-1);
    expect(controle).toBeLessThan(publier.indexOf("cp -a ../collecte/sortie/. ./"));
    // The same day: only an identical content passes (a re-run), after the comparison of the files.
    const memeJour = publier.indexOf('[ "$du_jour" = "$publie" ]');
    expect(memeJour).toBeGreaterThan(publier.indexOf("if git diff --cached --quiet; then"));
    expect(memeJour).toBeLessThan(publier.indexOf("git commit -q"));
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
    // A trial is capped, and the day's collection waits for a trial that measures.
    expect(mesurer).toContain("timeout-minutes: ${{ github.event_name == 'pull_request' && 60 || 330 }}");
    const attente = mesurer.indexOf("--event pull_request");
    expect(attente).toBeGreaterThan(-1);
    expect(attente).toBeLessThan(mesurer.indexOf("docker run -d --name knot"));
  });

  it("has shell blocks that bash can read (a stray quote would fail a day's run)", () => {
    const bash = spawnSync("bash", ["--version"], { encoding: "utf8" });
    if (bash.error !== undefined || bash.status !== 0) return; // no bash here: the CI's runner has one
    for (const fichier of readdirSync(".github/workflows").filter((f) => f.endsWith(".yml"))) {
      const lignes = readFileSync(`.github/workflows/${fichier}`, "utf8").split("\n");
      for (let i = 0; i < lignes.length; i += 1) {
        const ouverture = /^(\s*)(?:- )?run: \|\s*$/.exec(lignes[i] ?? "");
        if (ouverture === null) continue;
        const retrait = (ouverture[1] ?? "").length;
        const bloc: string[] = [];
        for (let j = i + 1; j < lignes.length; j += 1) {
          const ligne = lignes[j] ?? "";
          if (ligne.trim() !== "" && ligne.search(/\S/) <= retrait) break;
          bloc.push(ligne);
        }
        const verdict = spawnSync("bash", ["-n"], { input: bloc.join("\n"), encoding: "utf8" });
        expect(verdict.status, `${fichier}, ligne ${i + 1} : ${verdict.stderr}`).toBe(0);
      }
    }
  });

  it("gives the resolver views Knot Resolver 6.5.1 accepts, over the collection's own address (the review of 96f0218)", () => {
    const config = readFileSync("pipeline/knot/config.yaml", "utf8");
    // The resolver listens where the collection asks.
    expect(config).toContain("interface: 127.0.0.1@5300");
    expect(tache("mesurer")).toContain("attendre-resolveur.ts 127.0.0.1:5300");
    // The « views » section, to the next top-level key; each view opens with « - » at two spaces, its keys at four.
    const section = /\nviews:\n((?:(?: {2}.*)?\n)*)/.exec(config)?.[1] ?? "";
    const vues = section
      .split(/^ {2}- /m)
      .slice(1)
      .map((v) => `    ${v}`);
    expect(vues.length).toBeGreaterThan(0);
    const dans = (sousReseau: string, adresse: string) => {
      const [reseau = "", longueur = "32"] = sousReseau.trim().split("/");
      const entier = (ip: string) => ip.split(".").reduce((n, octet) => n * 256 + Number(octet), 0);
      const masque = 2 ** 32 - 2 ** (32 - Number(longueur));
      return (entier(reseau) & masque) >>> 0 === (entier(adresse) & masque) >>> 0;
    };
    for (const vue of vues) {
      const cles = [...vue.matchAll(/^ {4}([a-z-]+):/gm)].map((m) => m[1]);
      // Exactly one of « answer » and « tags »: 6.5.1 refuses the whole configuration otherwise.
      expect(
        cles.filter((c) => c === "answer" || c === "tags"),
        vue,
      ).toHaveLength(1);
      const sousReseaux = /^ {4}subnets: \[(.*)\]$/m.exec(vue)?.[1]?.split(",") ?? [];
      expect(
        sousReseaux.some((s) => dans(s, "127.0.0.1")),
        vue,
      ).toBe(true);
    }
    // The measured names are asked whole (method 0.2.5).
    expect(vues.some((v) => /^ {4}options:\n {6}minimize: false$/m.test(v))).toBe(true);
  });
});
