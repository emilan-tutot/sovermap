import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nouvelleMemoire, placerEtiquettes, seCroisent, toucheBoite, type Ancre, type Place } from "../components/globe/etiquettes";
import { arcGrandCercle, FRANCE } from "../components/globe/geo";
import { morceaux } from "../components/texte/Valeur";
import { JETONS } from "../lib/design/tokens";
import { findHardcodedTexts } from "../scripts/lib/texte-en-dur";

// The design rules of DESIGN.md that code can check: one source of tokens, no text in a component, the labels of the
// globe, the height of the threads, the line breaks of raw values.

describe("jetons (DESIGN.md §3)", () => {
  it("le miroir en JavaScript reprend les couleurs de app/globals.css", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const jeton = (nom: string) => new RegExp(`--color-${nom}: (#[0-9A-Fa-f]{6});`).exec(css)?.[1];
    expect(jeton("fond")).toBe(JETONS.fond);
    expect(jeton("encre")).toBe(JETONS.encre);
    expect(jeton("discret")).toBe(JETONS.discret);
    expect(jeton("accent")).toBe(JETONS.accent);
    expect(jeton("filet")).toBe(JETONS.scene.cote);
  });
  it("les défauts de Tailwind sont remis à zéro", () => {
    expect(readFileSync("app/globals.css", "utf8")).toMatch(/@theme \{\s*--\*: initial;/);
  });
});

describe("aucun texte en dur (DESIGN.md §9)", () => {
  const textes = (source: string) => findHardcodedTexts("components/x.tsx", source).map((t) => t.excerpt);
  it("refuse un texte écrit dans le JSX, un attribut lu ou une chaîne entre accolades", () => {
    expect(textes(`export const A = () => <p>Bonjour</p>;`)).toEqual(["Bonjour"]);
    expect(textes(`export const A = () => <button aria-label="Fermer" />;`)).toEqual(["Fermer"]);
    expect(textes(`export const A = () => <img alt={"Une carte"} />;`)).toEqual(["Une carte"]);
    expect(textes(`export const A = () => <p>{"Texte"}</p>;`)).toEqual(["Texte"]);
  });
  it("accepte le dictionnaire, la ponctuation, les chiffres et les entités", () => {
    expect(textes(`export const A = () => <p>{fr.site.name} · {n}&nbsp;: 404</p>;`)).toEqual([]);
    expect(textes(`export const A = () => <a className="logo" href="/" aria-label={fr.coque.logo} />;`)).toEqual([]);
  });
});

describe("étiquettes du globe (ARRÊT 2 bis, défaut a)", () => {
  // Three points close together west of a fourth one, as France, Luxembourg, the United Kingdom and the United States.
  const ancres: Ancre[] = [
    { code: "FR", x: 600, y: 420, l: 80, h: 22 },
    { code: "LU", x: 640, y: 380, l: 100, h: 22 },
    { code: "GB", x: 580, y: 330, l: 110, h: 22 },
    { code: "US", x: 200, y: 400, l: 100, h: 22 },
  ];
  const fils = [
    [
      { x: 600, y: 420 },
      { x: 400, y: 250 },
      { x: 200, y: 400 },
    ],
  ];
  const places = placerEtiquettes(ancres, fils, 1000, 800, 56, nouvelleMemoire());
  const parCote = (cote: Place["cote"]) => places.filter((p) => p.cote === cote);
  it("place chaque étiquette visible", () => {
    expect(places.map((p) => p.code).sort()).toEqual(["FR", "GB", "LU", "US"]);
  });
  it("garde dans chaque colonne l'ordre nord-sud des points", () => {
    for (const cote of ["gauche", "droite"] as const) {
      const colonne = parCote(cote);
      const ordre = [...colonne].sort((a, b) => a.y - b.y).map((p) => p.code);
      const points = [...colonne].sort((a, b) => (ancres.find((x) => x.code === a.code)?.y ?? 0) - (ancres.find((x) => x.code === b.code)?.y ?? 0)).map((p) => p.code);
      expect(ordre).toEqual(points);
    }
  });
  it("ne croise jamais deux filets et n'en fait passer aucun sur une autre étiquette", () => {
    for (const a of places)
      for (const b of places) {
        if (a === b) continue;
        expect(seCroisent(a.ligne, b.ligne)).toBe(false);
        expect(toucheBoite(a.ligne, b, 2)).toBe(false);
      }
  });
});

describe("hauteur des fils (ARRÊT 2 bis, défaut b)", () => {
  const hauteurMax = (arc: [number, number, number][]) => Math.max(...arc.map(([x, y, z]) => Math.hypot(x, y, z))) - 1;
  it("un lien court reste presque à plat, un lien long monte plus haut", () => {
    const court = hauteurMax(arcGrandCercle(FRANCE, { lat: 49.6, lon: 6.1 }));
    const long = hauteurMax(arcGrandCercle(FRANCE, { lat: 38.9, lon: -77 }));
    expect(court).toBeLessThan(0.005);
    expect(long).toBeGreaterThan(court * 20);
  });
});

describe("valeurs brutes (ARRÊT 2 bis, défaut f)", () => {
  it("ne coupe jamais une adresse IPv4, un préfixe, une date, une heure ni un numéro d'AS", () => {
    for (const mot of ["141.101.90.96", "141.101.90.0/24", "2026-11-19", "00:18:12", "AS13335"]) expect(morceaux(mot)).toEqual([mot]);
  });
  it("coupe un nom de domaine après un point, une adresse web après une barre oblique, une IPv6 après un deux-points", () => {
    expect(morceaux("www.univ-grenoble-alpes.fr")).toEqual(["www.", "univ-grenoble-alpes.", "fr"]);
    expect(morceaux("https://example.org/a")).toEqual(["https://", "example.", "org/", "a"]);
    expect(morceaux("2606:4700::6810")).toEqual(["2606:", "4700:", ":", "6810"]);
  });
});
