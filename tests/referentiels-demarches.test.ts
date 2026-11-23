// Tests of the démarches of the Observatoire (C.8; docs/sources.md, card 55): one dated edition, deposited by the owner,
// with only what Sovermap takes of a démarche, never its marks.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { construireListe, lireCopiePerimetre } from "@/pipeline/perimetre";
import { domaineEnregistrable, lireListeSuffixes } from "@/pipeline/psl";
import demarches from "@/referentiels/demarches.json";
import plateformes from "@/referentiels/plateformes-tierces.json";

const registre = readFileSync(new URL("../docs/sources.md", import.meta.url), "utf8");
const lire = (dossier: string, fichier: string) =>
  readFileSync(new URL(`../referentiels/${dossier}/${fichier}`, import.meta.url), "utf8");
const fichiers = (dossier: string, motif: RegExp) =>
  readdirSync(new URL(`../referentiels/${dossier}/`, import.meta.url))
    .filter((f) => motif.test(f))
    .sort();
/** The pinned Public Suffix List, the one the collection uses (its latest copy). */
const SUFFIXES = lireListeSuffixes(
  lire("psl", fichiers("psl", /^public_suffix_list-\d{4}-\d{2}-\d{2}\.dat$/).at(-1) ?? ""),
);
const CLES = ["id", "nom", "perimetre", "administration", "volumeTotal", "volumeEnLigne", "hote", "domaine"];
const NOM = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

describe("the démarches of the Observatoire (referentiels/demarches.json)", () => {
  it("come from card 55 of the registry, retained as a dated manual survey, one edition", () => {
    expect(demarches.source.fiche).toBe(55);
    const debut = registre.indexOf("### 55. ");
    const fiche55 = registre.slice(debut, registre.indexOf("\n### ", debut + 1));
    expect(fiche55).toContain("- **Décision : retenue (relevé manuel daté, par édition)**");
    expect(demarches.version).toBe(demarches.source.publiee);
    expect(demarches.source.document).toContain(`édition ${demarches.source.edition}`);
  });

  it("give each démarche its identifier, name, perimeter, volumes and domain, and nothing else", () => {
    expect(demarches.demarches.length).toBeGreaterThan(200);
    expect(new Set(demarches.demarches.map((d) => d.id)).size).toBe(demarches.demarches.length);
    for (const d of demarches.demarches) {
      expect(Object.keys(d).sort(), d.id).toEqual([...CLES].sort());
      expect(d.id).toMatch(/^\d{1,9}$/);
      expect(d.nom.trim()).not.toBe("");
      for (const v of [d.volumeTotal, d.volumeEnLigne]) {
        if (v !== null) expect(Number.isSafeInteger(v) && v >= 0, d.id).toBe(true);
      }
      expect(d.hote === null, d.id).toBe(d.domaine === null);
      if (d.hote !== null && d.domaine !== null) {
        expect(d.hote).toMatch(NOM);
        // The domain is the one the pinned Public Suffix List gives: never a public suffix alone (the review of C.8).
        expect(domaineEnregistrable(d.hote, SUFFIXES), d.id).toBe(d.domaine);
      }
    }
  });

  it("bring no unit outside the DINUM's, the SIG's and the MESR's lists but the ones named here (the review of C.8)", () => {
    // Each démarche's address is measured every day (method 0.2.6): a domain that none of the lists has becomes a new
    // unit, measured and published. A new edition that brings one updates this list, after a look at what it is (a
    // platform, a video or a form service would be a third party, never a unit).
    const copies = fichiers("listes", /^liste-dinum-\d{4}-\d{2}-\d{2}\.csv$/).map((f) => ({
      date: f.slice(12, 22),
      csv: lire("listes", f),
    }));
    const perimetre = (["sig", "mesr"] as const).flatMap((source) => {
      const f = fichiers("perimetre", new RegExp(`^${source}-\\d{4}-\\d{2}-\\d{2}\\.csv$`)).at(-1);
      return f === undefined
        ? []
        : [lireCopiePerimetre(source, f.slice(source.length + 1, source.length + 11), lire("perimetre", f))];
    });
    expect(copies.length).toBeGreaterThan(0);
    expect(perimetre.map((c) => c.source)).toEqual(["sig", "mesr"]);
    const liste = construireListe(
      copies,
      null,
      SUFFIXES,
      new Set(plateformes.domaines),
      ".gouv.fr",
      undefined,
      perimetre,
    );
    const nouveaux = new Set(
      demarches.demarches.flatMap((d) => (d.domaine !== null && !liste.domaines.has(d.domaine) ? [d.domaine] : [])),
    );
    expect([...nouveaux].sort()).toEqual(["monespacesante.fr"]);
  });
});
