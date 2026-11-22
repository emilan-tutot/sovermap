// Tests of the text pages (part E, E.6): each has a real day of revision, at least one source, its own address, links
// to pages of the site only, a description of about 155 characters, and French typography; and the typography helper.
import { describe, expect, it } from "vitest";
import { PAGES_DE_TEXTE, typographie } from "@/lib/i18n/fr-textes";
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

  it("sets French typography", () => {
    expect(typographie("Domaine : un nom « État » de 1 900 domaines ?")).toBe(
      "Domaine : un nom « État » de 1 900 domaines ?",
    );
  });
});
