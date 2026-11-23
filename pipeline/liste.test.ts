// Tests of the reference list and of the Public Suffix List. Only documentation names (`.example`, RFC 2606) and a
// small made-up suffix list; one test reads the pinned copy to check it holds no personal data.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lignesCsv, nettoyerListe, nomValide } from "./liste";
import { domaineEnregistrable, lireListeSuffixes, reduireListeSuffixes } from "./psl";

const LISTE_ESSAI = [
  "// This Source Code Form is subject to the terms of the Mozilla Public",
  "// License, v. 2.0.",
  "",
  "// VERSION: 2026-01-01_00-00-00_UTC",
  "// COMMIT: 0000000000000000000000000000000000000000",
  "// ===BEGIN ICANN DOMAINS===",
  "// example : Submitted by A Person <a.person@example.com>",
  "example",
  "gouv.example",
  "*.joker.example",
  "!sauf.joker.example",
  "// ===END ICANN DOMAINS===",
  "// ===BEGIN PRIVATE DOMAINS===",
  "plateforme.example",
  "// ===END PRIVATE DOMAINS===",
  ...Array.from({ length: 1000 }, (_, i) => `rempli${i}.example`),
].join("\n");

describe("the Public Suffix List", () => {
  const liste = lireListeSuffixes(LISTE_ESSAI);
  it("gives the registrable domain by the longest rule, wildcards and exceptions", () => {
    expect(liste.version).toBe("2026-01-01_00-00-00_UTC");
    expect(domaineEnregistrable("www.service.gouv.example", liste)).toBe("service.gouv.example");
    expect(domaineEnregistrable("www.site.example", liste)).toBe("site.example");
    expect(domaineEnregistrable("a.b.joker.example", liste)).toBe("a.b.joker.example");
    expect(domaineEnregistrable("www.sauf.joker.example", liste)).toBe("sauf.joker.example");
    expect(domaineEnregistrable("gouv.example", liste)).toBeNull();
    expect(domaineEnregistrable("www.inconnu.test", liste)).toBe("inconnu.test");
  });
  it("tells the suffixes of the ICANN section from those of the private section", () => {
    // gouv.example names a busy server in the collection's summary; plateforme.example, a company's platform, never.
    expect(liste.icann?.has("gouv.example")).toBe(true);
    expect(liste.icann?.has("example")).toBe(true);
    expect(liste.icann?.has("plateforme.example")).toBe(false);
    expect(liste.regles.has("plateforme.example")).toBe(true);
    expect(liste.icann?.has("rempli1.example")).toBe(false);
  });
  it("keeps only the licence notice, the version and the rules in the pinned copy", () => {
    const reduite = reduireListeSuffixes(LISTE_ESSAI);
    expect(reduite).toContain("Mozilla Public");
    expect(reduite).toContain("// VERSION: 2026-01-01_00-00-00_UTC");
    expect(reduite).not.toContain("a.person");
    expect(lireListeSuffixes(reduite).regles.size).toBe(lireListeSuffixes(LISTE_ESSAI).regles.size);
  });
  it("pins a dated copy with no comment but its licence, version and markers", () => {
    const fichiers = readdirSync("referentiels/psl").filter((f) =>
      /^public_suffix_list-\d{4}-\d{2}-\d{2}\.dat$/.test(f),
    );
    expect(fichiers.length).toBeGreaterThan(0);
    for (const f of fichiers) {
      const texte = readFileSync(`referentiels/psl/${f}`, "utf8");
      expect(texte).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);
      const liste2 = lireListeSuffixes(texte);
      expect(liste2.regles.has("gouv.fr")).toBe(true);
      expect(domaineEnregistrable("www.service.gouv.fr", liste2)).toBe("service.gouv.fr");
      // Every comment line is one the copy may keep (the review of PR 17): a « Submitted by » line, which names a
      // contributor even without an e-mail address, can never come back.
      const permises = [
        /^\/\/ This Source Code Form is subject to the terms of the Mozilla Public$/,
        /^\/\/ License, v\. 2\.0\. If a copy of the MPL was not distributed with this$/,
        /^\/\/ file, You can obtain one at https:\/\/mozilla\.org\/MPL\/2\.0\/\.$/,
        /^\/\/ Copie réduite par Sovermap : /,
        /^\/\/ \(qui nomment des contributeurs\)\. /,
        /^\/\/ VERSION: \d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_UTC$/,
        /^\/\/ COMMIT: [0-9a-f]{40}$/,
        /^\/\/ ===(BEGIN|END) (ICANN|PRIVATE) DOMAINS===$/,
      ];
      const commentaires = texte.split("\n").filter((l) => l.startsWith("//"));
      for (const l of commentaires) expect(permises.some((p) => p.test(l)), l).toBe(true);
    }
  });

  it("pins one copy only, named by the date of its own version line (the collection takes it by its name)", () => {
    const fichiers = readdirSync("referentiels/psl").filter((f) => f.endsWith(".dat"));
    expect(fichiers).toHaveLength(1);
    const [fichier = ""] = fichiers;
    const version = /^\/\/ VERSION: (\d{4}-\d{2}-\d{2})_/m.exec(readFileSync(`referentiels/psl/${fichier}`, "utf8"))?.[1];
    expect(version).toBeDefined();
    expect(fichier).toBe(`public_suffix_list-${version}.dat`);
  });
});

describe("the official lists (C.5)", () => {
  it("reads quoted CSV fields", () => {
    expect([...lignesCsv('a,"b, c","d ""e"""\nf,g,h\n')]).toEqual([
      ["a", "b, c", 'd "e"'],
      ["f", "g", "h"],
    ]);
  });
  it("keeps the name and the type only, never another column", () => {
    const brut =
      'name,http_status,type,sources\nwww.mairie.example,200,Commune,"Ajout manuel de Personne Exemple"\nWWW.Mairie.example.,,Commune,x\nété.example,,Commune,y\n';
    const { csv, noms } = nettoyerListe(brut);
    expect(noms).toBe(2);
    expect(csv).toBe("name,type\nwww.mairie.example,Commune\nxn--t-9fab.example,Commune\n");
    expect(csv).not.toContain("Personne");
  });
  it("keeps only the list's known types: anything else in the type column, a person's name above all, is dropped", () => {
    const brut =
      "name,type\nwww.mairie.example,Commune\nwww.ajout.example,Ajout Manuel Personne Exemple\nwww.etat.example,Gouvernement\n";
    const { csv, types, typesInconnus } = nettoyerListe(brut);
    expect(csv).toBe("name,type\nwww.ajout.example,\nwww.etat.example,Gouvernement\nwww.mairie.example,Commune\n");
    expect(csv).not.toContain("Personne");
    expect(types).toEqual({ "": 1, Gouvernement: 1, Commune: 1 });
    // Counted apart from the empty types: a new list may bring a legitimate one, to be read by hand.
    expect(typesInconnus).toBe(1);
  });
  it("refuses a list without its name or type column", () => {
    expect(() => nettoyerListe("domaine,genre\na.example,x\n")).toThrow();
  });
  it("refuses a last label that begins or ends with a hyphen", () => {
    expect(nomValide("www.exemple.fr-")).toBeNull();
    expect(nomValide("www.exemple.-fr")).toBeNull();
    expect(nomValide("www.exemple.fr")).toBe("www.exemple.fr");
  });

  it("writes an internationalised name in its ASCII form, and refuses what is not a name", () => {
    expect(nomValide("ÉTÉ.example")).toBe("xn--t-9fab.example");
    expect(nomValide("pas un nom")).toBeNull();
    expect(nomValide("-tiret.example")).toBeNull();
  });
});
