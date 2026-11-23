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
  const suite = workflow.slice(debut + 1).search(/\n {2}[a-z0-9-]+:\n/);
  return suite === -1 ? workflow.slice(debut) : workflow.slice(debut, debut + 1 + suite);
};
/** The three jobs that measure and build the day (brief B.8). */
const MESURE = ["mesurer-1", "mesurer-2", "assembler"] as const;

describe("the collection's workflow", () => {
  it("enables the scheduled workflows again from two places, with the least rights, never on a pull request", () => {
    const boucle = "for fichier in collecte.yml fraicheur.yml archives.yml copies.yml; do";
    const enable = 'gh api -X PUT "repos/$REPO/actions/workflows/$fichier/enable"';
    /** One branch of the loop's « case », up to its end. */
    const branche = (texte: string, etiquette: string) => {
      const debut = texte.indexOf(`${etiquette})`);
      expect(debut).toBeGreaterThan(0);
      return texte.slice(debut, texte.indexOf(";;", debut));
    };
    const verifier = (texte: string) => {
      expect(texte).toContain(boucle);
      // Only a workflow GitHub disabled for inactivity is enabled again: never one disabled by hand (the politeness
      // lever, point 17, § 3), never an active one (the robot would become the recipient of its runs' e-mails).
      expect(branche(texte, "disabled_inactivity")).toContain(enable);
      expect(branche(texte, "disabled_manually")).not.toContain("PUT");
      expect(branche(texte, "active")).not.toContain("PUT");
      expect(texte.split(enable)).toHaveLength(2);
    };
    const entretien = tache("entretien");
    expect(entretien).toContain("if: github.event_name != 'pull_request'");
    expect(entretien).toMatch(/permissions:\n {6}actions: write\n {4}env:/);
    verifier(entretien);
    // This job never turns the collection red: a failure is a warning.
    expect(entretien).not.toContain("exit 1");
    // The freshness check does the same every 6 hours, and opens an issue when one cannot be enabled.
    const fraicheur = readFileSync(".github/workflows/fraicheur.yml", "utf8");
    expect(fraicheur).toContain('titre="Workflow planifié désactivé"');
    verifier(fraicheur);
    expect(branche(fraicheur, "disabled_manually")).not.toContain("echec=");
    // An unreadable state is an error of GitHub's API, never an alarm; a workflow enabled again is said in the issue
    // (its e-mails may go to the robot), and the issue closes once every one is active and readable (the second and
    // third reviews of PR 25), read in the freshness check's own maintenance job.
    const debutEntretien = fraicheur.indexOf("\n  entretien:\n");
    expect(debutEntretien).toBeGreaterThan(0);
    const entretienFraicheur = fraicheur.slice(debutEntretien);
    expect(branche(entretienFraicheur, "*")).not.toContain("echec=");
    expect(branche(entretienFraicheur, "disabled_inactivity")).toContain('reactives="$reactives $fichier"');
    expect(entretienFraicheur).toContain("ont été réactivés :$reactives.");
    expect(entretienFraicheur).toMatch(/elif \[ -n "\$n" \] && \[ -z "\$illisibles" \]; then\n\s+gh issue close "\$n"/);
    // Red only when a workflow could not be enabled: every « exit 1 » of the job stands behind that test.
    const sorties = entretienFraicheur.match(/exit 1/g) ?? [];
    expect(sorties.length).toBeGreaterThan(0);
    expect(entretienFraicheur.match(/if \[ -n "\$echec" \]; then exit 1; fi/g) ?? []).toHaveLength(sorties.length);
    // A third chance for the day's collection, which does nothing once the day has started.
    expect(workflow).toContain('- cron: "17 15 * * *"');
  });

  it("ends a trial's first pass at its deadline, so that a degraded trial's three jobs still end in 60 minutes", () => {
    // Trap 67 (23/11/2026, 07:07): two emergency pauses at one domain a second took a trial past its job's limit; the
    // domains already open at the deadline may still take a while on a harder day (the third review of PR 25). Each
    // half of a trial has half the deadline, and its jobs' limits add up to 60 minutes (pipeline/creneau.ts).
    expect(tache("mesurer-1")).toContain("timeout-minutes: ${{ github.event_name == 'pull_request' && 25 || 165 }}");
    expect(tache("mesurer-2")).toContain("timeout-minutes: ${{ github.event_name == 'pull_request' && 25 || 165 }}");
    expect(tache("assembler")).toContain("timeout-minutes: ${{ github.event_name == 'pull_request' && 10 || 30 }}");
    for (const nom of ["mesurer-1", "mesurer-2"])
      expect(tache(nom)).toContain('--essai --limite "$LIMITE_ESSAI" --delai-reprise-minutes 1 --echeance-minutes 10');
    const collecter = readFileSync("pipeline/cli/collecter.ts", "utf8");
    expect(collecter).toContain("...(o.essai ? { finPremierePasse: minutesDe(echeanceMinutes) } : {}),");
  });

  it("measures the list in two halves, one job after the other, then builds the day from both (brief B.8)", () => {
    const [premiere, seconde, assemblage] = MESURE.map(tache);
    expect(premiere).toContain("args=(--tranche 1 ");
    expect(seconde).toContain("args=(--tranche 2 ");
    expect(assemblage).toContain("args=(--assembler ");
    // Never two measurements at once: the second half after the first, never after an emergency stop.
    expect(seconde).toContain("needs: [jour, mesurer-1]");
    expect(seconde).toContain("if: needs.mesurer-1.outputs.arret == 'false'");
    expect(assemblage).toContain("needs: [jour, mesurer-1, mesurer-2]");
    expect(assemblage).toContain("needs.mesurer-1.outputs.arret == 'true'");
    // The sources are downloaded once a day: the second half and the assembly read the first's.
    expect(premiere).toContain("name: tranche-1");
    expect(premiere).toContain("travail/sources");
    expect(seconde).not.toContain("--veille");
    expect(seconde).not.toContain("--iptoasn");
    expect(assemblage).not.toContain("--conteneur");
    expect(assemblage).not.toContain("docker run");
    for (const texte of [premiere, seconde]) expect(texte).toContain("retention-days: 1");
    // The publication and the alarm follow the assembly.
    expect(tache("publier")).toContain("needs: [jour, assembler]");
    expect(tache("publier")).toContain("needs.assembler.outputs.publiable == 'true'");
    expect(tache("alerter")).toContain("needs: [jour, mesurer-1, mesurer-2, assembler, publier]");
    for (const nom of MESURE) expect(tache("alerter")).toContain(`needs.${nom}.result == 'failure'`);
    expect(workflow).not.toContain("needs.mesurer.");
  });

  it("never reads an error of GitHub's API as « today is not done » (the day would be measured twice)", () => {
    const jour = tache("jour");
    expect(jour).toContain('grep -q "HTTP 404"');
    expect(jour).not.toMatch(/\|\| true\)/);
    expect(jour).not.toMatch(/\|\| echo 0/);
    // A failed check of the day opens the issue too.
    expect(tache("alerter")).toContain("needs.jour.result == 'failure'");
  });

  it("keeps the failures' diagnosis in the run's artifact only: never in « donnees » nor in the release", () => {
    // The artifact takes it beside « sortie » (pipeline/diagnostic.ts writes it in the work folder).
    expect(tache("assembler")).toContain("travail/diagnostic.json");
    // The publication copies « sortie » only, and the release archives what was copied.
    const publier = tache("publier");
    expect(publier).toContain("cp -a ../collecte/sortie/. ./");
    expect(publier).not.toContain("diagnostic");
  });

  it("measures the day the check named, never the clock's", () => {
    for (const nom of MESURE) {
      expect(tache(nom)).toContain("DATE: ${{ needs.jour.outputs.date }}");
      expect(tache(nom)).toContain('--date "$DATE"');
    }
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

  it("reads « no data branch yet » from exit code 2 only, in the jobs that read the published state", () => {
    for (const nom of ["mesurer-1", "assembler", "publier"]) {
      const texte = tache(nom);
      expect(texte).toContain("git ls-remote --exit-code --heads origin donnees");
      expect(texte).toMatch(/2\)|-eq 2/);
      expect(texte).toContain("exit 1");
    }
  });

  it("never lets a trial take the place of a day's measurement, nor measure during or around one", () => {
    const mesurer = tache("mesurer-1");
    expect(mesurer).toContain("group: collecte-mesure-${{ github.event_name == 'pull_request' && 'essai' || 'jour' }}");
    const creneau = mesurer.indexOf("npx tsx pipeline/cli/creneau-essai.ts");
    expect(creneau).toBeGreaterThan(-1);
    expect(creneau).toBeLessThan(mesurer.indexOf("docker run -d --name knot"));
    expect(mesurer.slice(mesurer.lastIndexOf("- if:", creneau), creneau)).toContain(
      "github.event_name == 'pull_request'",
    );
    // A trial is capped, and the day's collection waits for a trial that measures.
    expect(mesurer).toContain("timeout-minutes: ${{ github.event_name == 'pull_request' && 25 || 165 }}");
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
    for (const nom of ["mesurer-1", "mesurer-2"]) expect(tache(nom)).toContain("attendre-resolveur.ts 127.0.0.1:5300");
    // The « views » section, to the next top-level key (comment lines left out); each view opens with « - » at two
    // spaces, its keys at four.
    const lignes = config.split("\n").filter((l) => !/^\s*#/.test(l));
    const debut = lignes.indexOf("views:");
    expect(debut).toBeGreaterThan(-1);
    const fin = lignes.findIndex((l, i) => i > debut && /^\S/.test(l));
    const section = lignes.slice(debut + 1, fin === -1 ? undefined : fin).join("\n");
    const vues = section
      .split(/^ {2}- /m)
      .slice(1)
      .map((v) => `    ${v}`);
    expect(vues.length).toBeGreaterThan(0);
    // An IPv4 subnet holds the address; any other (IPv6) never does.
    const dans = (sousReseau: string, adresse: string) => {
      const [reseau = "", longueur = "32"] = sousReseau.trim().split("/");
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(reseau)) return false;
      const entier = (ip: string) => ip.split(".").reduce((n, octet) => n * 256 + Number(octet), 0);
      const masque = 2 ** 32 - 2 ** (32 - Number(longueur));
      return (entier(reseau) & masque) >>> 0 === (entier(adresse) & masque) >>> 0;
    };
    expect([dans("::1/128", "127.0.0.1"), dans("127.0.0.0/8", "127.0.0.1"), dans("10.0.0.0/8", "127.0.0.1")]).toEqual([
      false,
      true,
      false,
    ]);
    for (const vue of vues) {
      const cles = [...vue.matchAll(/^ {4}([a-z-]+):/gm)].map((m) => m[1]);
      // Exactly one of « answer » and « tags »: 6.5.1 refuses the whole configuration otherwise; and the answer lets
      // the questions through (« refused » would refuse them all).
      expect(
        cles.filter((c) => c === "answer" || c === "tags"),
        vue,
      ).toHaveLength(1);
      expect(vue, vue).toMatch(/^ {4}answer: allow$/m);
      const sousReseaux = /^ {4}subnets: \[(.*)\]$/m.exec(vue)?.[1]?.split(",") ?? [];
      expect(
        sousReseaux.some((s) => dans(s, "127.0.0.1")),
        vue,
      ).toBe(true);
    }
    // The measured names are asked whole (method 0.2.4).
    expect(vues.some((v) => /^ {4}options:\n {6}minimize: false$/m.test(v))).toBe(true);
  });

  it("measures a day once: the mark « measurement started » is saved and read back before the collection", () => {
    // In the first half's job, before its first question; the second half and the assembly run only after it.
    const mesurer = tache("mesurer-1");
    // The assembly asks nothing: it may be re-run. The second half has its own mark: a re-run of it refuses.
    expect(tache("assembler")).not.toContain("collecte-commencee");
    const seconde = tache("mesurer-2");
    const marque = seconde.indexOf(
      "key: collecte-commencee-${{ needs.jour.outputs.date }}-moitie2-${{ github.run_id }}",
    );
    expect(seconde.indexOf('--key "collecte-commencee-$DATE-moitie2-"')).toBeGreaterThan(-1);
    expect(seconde.indexOf('--key "collecte-commencee-$DATE-moitie2-"')).toBeLessThan(marque);
    expect(marque).toBeLessThan(seconde.indexOf('--ref refs/heads/main --key "$CLE"'));
    expect(seconde.indexOf('--ref refs/heads/main --key "$CLE"')).toBeLessThan(seconde.indexOf("- id: collecte"));
    expect(seconde).toMatch(/permissions:\n {6}contents: read\n {6}actions: read/);
    const debut = mesurer.indexOf("# A day is measured once");
    const collecte = mesurer.indexOf("- id: collecte");
    expect(debut).toBeGreaterThan(-1);
    const temoin = mesurer.slice(debut, collecte);
    // Three steps, none for a trial, in this order: refuse (a day already started, a re-run after midnight, a
    // measurement that could not end before midnight), save, read back.
    expect(temoin.match(/- if: env\.ESSAI != 'true'/g)).toHaveLength(3);
    const refus = temoin.indexOf('if [ "$(date -u +%F)" != "$DATE" ]; then');
    const enregistrement = temoin.indexOf(
      "key: collecte-commencee-${{ needs.jour.outputs.date }}-${{ github.run_id }}",
    );
    const relecture = temoin.indexOf(
      "--ref refs/heads/main --key \"$CLE\" --json key --jq 'map(select(.key == env.CLE)) | length'",
    );
    expect([refus, enregistrement, relecture].every((i) => i > -1)).toBe(true);
    expect(refus < enregistrement && enregistrement < relecture).toBe(true);
    expect(temoin).toContain('if [ "$(date -u +%H%M)" -ge 1830 ]; then');
    expect(temoin).toContain('--ref refs/heads/main --key "collecte-commencee-$DATE-"');
    expect(temoin).toContain('if [ "$commencees" != "0" ]; then');
    // Each refusal ends the step in red, the last one too (an « exit 0 » there would measure without a mark).
    expect(temoin).toMatch(/une relance après minuit\)\." \| tee -a "\$GITHUB_STEP_SUMMARY" >&2\n\s*exit 1/);
    expect(temoin).toMatch(
      /croiser celle du lendemain ; rien n'est mesuré\." \| tee -a "\$GITHUB_STEP_SUMMARY" >&2\n\s*exit 1/,
    );
    expect(temoin).toMatch(
      /une seule interrogation des serveurs par jour\)\." \| tee -a "\$GITHUB_STEP_SUMMARY" >&2\n\s*exit 1/,
    );
    expect(temoin).toMatch(/\} \| tee -a "\$GITHUB_STEP_SUMMARY" >&2\n\s*exit 1/);
    // Never an error swallowed in these steps, but the read-back, which reads an error as « not yet » and refuses at
    // the end (the wait above swallows them on purpose: a pattern easy to copy).
    expect(temoin).not.toMatch(/\|\| true|2> \/dev\/null/);
    expect(temoin.match(/\|\| trouvee=""/g)).toHaveLength(1);
    // The run of 09:47 (« jour ») sees a day started, and a reply that is not « 0 » counts as one.
    expect(tache("jour")).toContain('--ref refs/heads/main --key "collecte-commencee-$DATE-"');
    expect(tache("jour")).toContain('[ "$commencees" != "0" ]');
  });
});
