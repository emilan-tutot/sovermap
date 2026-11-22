// Who publishes Sovermap (brief E.4): option A by default; B and C from Production variables. Made-up values only.
import { describe, expect, it } from "vitest";
import { editeurDe } from "@/lib/editeur";
import { mentionsLegales } from "@/lib/i18n/fr-textes";
import type { PageDeTexte, Segment } from "@/lib/textes";

/** The whole text of a page, its spaces made plain. */
const texteDe = (p: PageDeTexte): string => {
  const texte = (s: Segment) => (typeof s === "string" ? s : "valeur" in s ? s.valeur : s.lien);
  const blocs = p.sections.flatMap((section) =>
    section.blocs.flatMap((b) =>
      "paragraphe" in b ? [b.paragraphe.map(texte).join("")] : b.liste.map((l) => l.map(texte).join("")),
    ),
  );
  return [p.titre, p.chapo, ...blocs].join(" ").replace(/\s/g, " ");
};

const B = {
  EDITEUR_MODE: "identite",
  EDITEUR_NOM: "Exemple",
  EDITEUR_PRENOMS: "Camille",
  EDITEUR_DOMICILE: "1 rue de l’Exemple, 00000 Exempleville",
  EDITEUR_TELEPHONE: "00 00 00 00 00",
  CONTACT_EDITION: "edition@site.example",
};

describe("the publisher of the legal notices", () => {
  it("stays anonymous by default (option A), with the host's name and address", () => {
    expect(editeurDe({})).toEqual({ mode: "anonyme", contact: null });
    const page = texteDe(mentionsLegales(editeurDe({})));
    expect(page).toContain("ne publie pas son identité");
    expect(page).toContain("Vercel Inc.");
    expect(page).toContain("sera donnée ici à son ouverture");
    expect(page).not.toMatch(/Exemple|Camille/);
  });

  it("publishes the whole identity only with option B, and the name only with option C", () => {
    expect(texteDe(mentionsLegales(editeurDe(B)))).toContain("Camille Exemple");
    expect(texteDe(mentionsLegales(editeurDe(B)))).toContain("00 00 00 00 00");
    const c = texteDe(mentionsLegales(editeurDe({ EDITEUR_MODE: "nom", EDITEUR_NOM: "Camille Exemple" })));
    expect(c).toContain("Camille Exemple");
    expect(c).not.toContain("Exempleville");
  });

  it("stops the build rather than publish incomplete or odd notices", () => {
    expect(() => editeurDe({ EDITEUR_MODE: "identite", EDITEUR_NOM: "Exemple" })).toThrow(/EDITEUR_PRENOMS/);
    expect(() => editeurDe({ EDITEUR_MODE: "nom" })).toThrow(/EDITEUR_NOM/);
    expect(() => editeurDe({ EDITEUR_MODE: "autre" })).toThrow(/EDITEUR_MODE/);
    expect(() => editeurDe({ EDITEUR_MODE: "nom", EDITEUR_NOM: "Ligne\nDeux" })).toThrow(/une ligne de texte/);
  });
});
