import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { chaine, FRAGMENT, liste, lireFiches, objet } from "@/scripts/mesures/etat-publie";
import { comparerVersions, dansLaPlage } from "@/scripts/mesures/versions";

// The shared parts of the measurement tools of the points (scripts/mesures/): no network, a made-up state only.
describe("the version ranges of the advisory database", () => {
  it("holds a version only when every comparator of the range holds", () => {
    expect(dansLaPlage("16.4.6", ">= 16.0.0, < 16.4.7")).toBe(true);
    expect(dansLaPlage("16.4.6", ">= 16.0.0, < 16.4.6")).toBe(false);
    expect(dansLaPlage("16.4.6", ">= 16.5.0")).toBe(false);
    expect(dansLaPlage("19.3.1", "< 19.3.1")).toBe(false);
    expect(dansLaPlage("19.3.1", "<= 19.3.1")).toBe(true);
    expect(dansLaPlage("19.3.1", "> 19.3.0")).toBe(true);
    expect(dansLaPlage("19.3.1", "= 19.3.1")).toBe(true);
    expect(dansLaPlage("19.3.1", "19.3.0")).toBe(false);
    expect(dansLaPlage("15.0.0", ">= 15.0.0-canary.0, < 15.2.3")).toBe(true);
  });

  it("compares numbers, not letters, and shows a doubtful range rather than hiding it", () => {
    expect(comparerVersions("16.10.0", "16.9.9")).toBeGreaterThan(0);
    expect(comparerVersions("1.2", "1.2.0")).toBe(0);
    expect(comparerVersions("2.0.0", "10.0.0")).toBeLessThan(0);
    expect(dansLaPlage("1.0.0", "~1.0")).toBe(true);
  });
});

describe("a published state, read for the tools", () => {
  const dossier = mkdtempSync(path.join(tmpdir(), "sovermap-mesures-"));
  afterAll(() => rmSync(dossier, { recursive: true, force: true }));

  it("reads every record of every fragment by its key, checked at the border, and nothing else", () => {
    const seau = path.join(dossier, "noms", "2c");
    mkdirSync(seau, { recursive: true });
    const ecrire = (fichier: string, contenu: unknown) =>
      writeFileSync(path.join(seau, fichier), JSON.stringify(contenu), "utf8");
    ecrire("d1.json", { noms: [{ nom: "www.a.example", etat: "ok" }, { sansNom: true }, 5, { nom: 7 }] });
    // A bucket split in two keeps its records in « d1.1.json ».
    ecrire("d1.1.json", { noms: [{ nom: "www.b.example", etat: "echec" }] });
    // Neither a file that is not a fragment nor another kind of record is read.
    ecrire("index.json", { noms: [{ nom: "www.c.example" }] });
    ecrire("d2.json", { domaines: [{ domaine: "d.example" }] });
    const fiches = lireFiches(dossier, "noms");
    expect([...fiches.keys()].sort()).toEqual(["www.a.example", "www.b.example"]);
    expect(fiches.get("www.b.example")?.["etat"]).toBe("echec");
  });

  it("tells a fragment of records from the bucket's checksums and from any other file", () => {
    for (const f of ["d1.json", "2c.json", "d1.1.json", "ff.12.json"]) expect(FRAGMENT.test(f), f).toBe(true);
    for (const f of ["sommes.json", "index.json", "d1.json.gz", "d1.txt", "D1.json"])
      expect(FRAGMENT.test(f), f).toBe(false);
  });

  it("checks each value at the border", () => {
    expect(objet({ a: 1 })).toEqual({ a: 1 });
    expect(objet([1])).toBeNull();
    expect(objet(null)).toBeNull();
    expect(chaine("x")).toBe("x");
    expect(chaine(1)).toBeNull();
    expect(liste("x")).toEqual([]);
    expect(liste([1, 2])).toEqual([1, 2]);
  });
});
