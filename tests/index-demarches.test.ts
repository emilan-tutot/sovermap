import { describe, expect, it } from "vitest";
import { type Etat, index } from "@/pipeline/publication";

// index/demarches.json through the publication's index (the review of PR 27): the names the day's list set aside reach
// the index of the démarches, and only they are left out; without a list, the method's default rules decide.
// indexDemarches alone has its tests in pipeline/publication.test.ts; this one proves index()'s wiring. The collection's
// own passing of its list (pipeline/cli/collecter.ts) is checked by its trials only.
describe("index/demarches.json through the publication's index (C.8)", () => {
  const etat: Etat = { noms: new Map(), domaines: new Map() };
  const details: Parameters<typeof index>[1] = {
    as: new Map(),
    societes: new Map(),
    organismes: new Map(),
    organismesDe: new Map(),
    demarches: {
      edition: 15,
      periode: "octobre 2026",
      publiee: "2026-10-20",
      demarches: [
        {
          id: "1764",
          nom: "Démarche 1764",
          perimetre: "Ministère de l’Exemple",
          administration: null,
          volumeTotal: 100,
          volumeEnLigne: null,
          hote: "www.service.example",
          domaine: "service.example",
        },
        {
          id: "2001",
          nom: "Démarche 2001",
          perimetre: "Ministère de l’Exemple",
          administration: null,
          volumeTotal: 50,
          volumeEnLigne: null,
          hote: "recette.service.example",
          domaine: "service.example",
        },
      ],
    },
  };
  const publiees = (nomsEcartes?: ReadonlySet<string>) => {
    const fichiers = index(etat, nomsEcartes === undefined ? details : { ...details, nomsEcartes });
    const lu = JSON.parse(fichiers.get("index/demarches.json") ?? "null") as {
      demarches: { hote: unknown; domaine: unknown }[];
    };
    return lu.demarches;
  };

  it("publishes an address the day's list kept, and never one it set aside", () => {
    // No rule of the method sets www.service.example aside: kept with a list that kept it.
    expect(publiees(new Set(["autre.example"]))[0]).toMatchObject({ hote: "www.service.example" });
    // The day's list set it aside: never published, whatever the default rules would say.
    expect(publiees(new Set(["www.service.example"]))[0]).toMatchObject({ hote: null, domaine: null });
  });

  it("follows the method's default rules without a list", () => {
    const [www, recette] = publiees();
    expect(www).toMatchObject({ hote: "www.service.example", domaine: "service.example" });
    // A test environment (« recette ») is internal or technical for the method (§ 3): never published.
    expect(recette).toMatchObject({ hote: null, domaine: null });
  });
});
