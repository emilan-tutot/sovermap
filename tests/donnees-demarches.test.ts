// Tests of the reading of the démarches' index by the site (C.8, D.2): made-up démarches, documentation names only
// (RFC 2606); every entry checked, the most used first.
import { describe, expect, it } from "vitest";
import { lireIndexDemarches } from "@/lib/donnees/demarches";

const demarche = (id: string, volumeTotal: number | null, hote: string | null, mesure: unknown = null) => ({
  id,
  nom: `Démarche ${id}`,
  perimetre: "Ministère de l’Exemple",
  administration: null,
  volumeTotal,
  volumeEnLigne: null,
  hote,
  domaine: hote === null ? null : hote.split(".").slice(-2).join("."),
  mesure,
});
const source = { fiche: 55, edition: 15, periode: "octobre 2026", publiee: "2026-10-20" };
const mesure = {
  etat: "ok",
  categorie: "hors d'Europe",
  horsUE: true,
  niveau: "probable",
  societes: ["cdn-us"],
  cdn: "cloudflare",
};

describe("the démarches' index, as the site reads it (C.8, D.2)", () => {
  it("puts the most used first, those without a volume last, then by name", () => {
    const lu = lireIndexDemarches({
      source,
      demarches: [
        demarche("1", 10, null),
        demarche("2", null, null),
        demarche("3", 500, "www.service.example", mesure),
      ],
    });
    expect(lu?.demarches.map((d) => d.id)).toEqual(["3", "1", "2"]);
    expect(lu?.demarches[0]?.mesure).toEqual(mesure);
    expect(lu).toMatchObject({ edition: 15, periode: "octobre 2026", publiee: "2026-10-20" });
  });

  it("leaves out what is not a démarche, and never trusts a measure without a name or a valid category", () => {
    const lu = lireIndexDemarches({
      source,
      demarches: [
        demarche("abc", 1, null),
        { ...demarche("4", 1, null), nom: "  " },
        "pas une démarche",
        demarche("5", 1, "<b>x</b>", mesure),
        demarche("6", 1, "www.service.example", { ...mesure, categorie: "ailleurs" }),
        demarche("7", 1, "www.service.example", { ...mesure, societes: ["Une Société", "cdn-us"] }),
      ],
    });
    expect(lu?.demarches.map((d) => d.id)).toEqual(["5", "6", "7"]);
    // An address that is not a name: no address, no measure.
    expect(lu?.demarches.find((d) => d.id === "5")).toMatchObject({ hote: null, domaine: null, mesure: null });
    expect(lu?.demarches.find((d) => d.id === "6")?.mesure).toBeNull();
    expect(lu?.demarches.find((d) => d.id === "7")?.mesure?.societes).toEqual(["cdn-us"]);
  });

  it("refuses an index without its edition, its period or its day", () => {
    expect(lireIndexDemarches({ demarches: [] })).toBeNull();
    expect(lireIndexDemarches({ source: { ...source, periode: "" }, demarches: [] })).toBeNull();
    expect(lireIndexDemarches({ source: { ...source, publiee: "20/10/2026" }, demarches: [] })).toBeNull();
    expect(lireIndexDemarches("index")).toBeNull();
  });
});
