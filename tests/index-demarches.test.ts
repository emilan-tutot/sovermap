import { describe, expect, it } from "vitest";
import { type Etat, index } from "@/pipeline/publication";

// index/demarches.json through the publication's index, as the collection calls it (the review of PR 27): the names the
// day's list set aside reach the index of the démarches, and only they are left out. indexDemarches alone has its tests
// in pipeline/publication.test.ts; this one proves the wiring.
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
      ],
    },
  };
  const publiee = (nomsEcartes?: ReadonlySet<string>) => {
    const fichiers = index(etat, nomsEcartes === undefined ? details : { ...details, nomsEcartes });
    const lu = JSON.parse(fichiers.get("index/demarches.json") ?? "null") as {
      demarches: { hote: unknown; domaine: unknown }[];
    };
    return lu.demarches[0];
  };

  it("publishes an address the day's list kept, and never one it set aside", () => {
    // No rule of the method sets this address aside: kept without the day's list, and with a list that kept it.
    expect(publiee()).toMatchObject({ hote: "www.service.example", domaine: "service.example" });
    expect(publiee(new Set(["autre.example"]))).toMatchObject({ hote: "www.service.example" });
    // The day's list set it aside: never published, whatever the default rules would say.
    expect(publiee(new Set(["www.service.example"]))).toMatchObject({ hote: null, domaine: null });
  });
});
