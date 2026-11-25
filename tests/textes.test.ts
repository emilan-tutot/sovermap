// Tests of the text pages (part E, E.6): each has a real day of revision, at least one source, its own address, links
// to pages of the site only, a description of about 155 characters, and French typography; and the typography helper.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { methode, PAGES_DE_TEXTE, typographie } from "@/lib/i18n/fr-textes";
import { liensDe, type PageDeTexte } from "@/lib/textes";

/** Every sentence of a page, its sources' included. */
const textesDe = (p: PageDeTexte): string[] => [
  p.titre,
  p.description,
  p.chapo,
  ...p.sections.flatMap((s) => [
    ...(s.titre === undefined ? [] : [s.titre]),
    ...s.blocs
      .flatMap((b) => ("paragraphe" in b ? b.paragraphe : b.liste.flat()))
      .flatMap((x) => (typeof x === "string" ? [x] : "lien" in x ? [x.lien] : [])),
  ]),
  ...p.sources.flat().flatMap((x) => (typeof x === "string" ? [x] : "lien" in x ? [x.lien] : [])),
];

describe("the text pages (E.6)", () => {
  it("each has a real day of revision, at least one source, its own address and links to the site only", () => {
    const chemins = new Set<string>();
    expect(PAGES_DE_TEXTE.length).toBeGreaterThan(0);
    for (const p of PAGES_DE_TEXTE) {
      expect(p.revision, p.chemin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${p.revision}T00:00:00Z`).toISOString().slice(0, 10), p.chemin).toBe(p.revision);
      expect(p.sources.length, p.chemin).toBeGreaterThan(0);
      expect(p.chemin).toMatch(/^\/[a-z-]+$/);
      expect(chemins.has(p.chemin), p.chemin).toBe(false);
      chemins.add(p.chemin);
      for (const lien of liensDe(p)) expect(lien, p.chemin).toMatch(/^\/[a-z0-9-]*(#[a-z0-9-]+)?$/);
      expect(p.description.length, p.chemin).toBeGreaterThanOrEqual(50);
      expect(p.description.length, p.chemin).toBeLessThanOrEqual(180);
    }
  });

  it("never leaves a plain space before « : ; ! ? », after « or inside a number", () => {
    for (const p of PAGES_DE_TEXTE) {
      for (const texte of textesDe(p)) expect(texte, p.chemin).not.toMatch(/ [:;!?»]|« |\d \d{3}\b/);
    }
  });

  it("never writes a count of domains by hand: the day's counts are on the Quality page (point 13, § 7)", () => {
    for (const p of PAGES_DE_TEXTE) {
      expect(textesDe(p).join("\n"), p.chemin).not.toMatch(/[0-9][0-9\s\u00a0\u202f]*domaines/);
    }
  });

  it("lists on the Method page every version of docs/methode.md, with its day", () => {
    const versions = [
      ...readFileSync("docs/methode.md", "utf8").matchAll(/^\| (0\.[^|]+?) \| (\d{2}\/\d{2}\/\d{4}) \|/gm),
    ];
    expect(versions.length).toBeGreaterThan(0);
    const texte = textesDe(methode).join("\n");
    for (const [, version, jour] of versions) expect(texte).toContain(`${version} (${jour})`);
  });

  it("sets French typography", () => {
    expect(typographie("Domaine : un nom « État » de 1 900 domaines ?")).toBe(
      "Domaine : un nom « État » de 1 900 domaines ?",
    );
  });
});
