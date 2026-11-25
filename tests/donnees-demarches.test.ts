// Tests of the reading of the démarches' index by the site (C.8, D.2): made-up démarches, documentation names only
// (RFC 2606); every entry checked, the most used first.
import { describe, expect, it } from "vitest";
import { editionDemarches, lireIndexDemarches, servieDe } from "@/lib/donnees/demarches";

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
    expect(lu?.demarches[0]?.mesure).toEqual({ ...mesure, partiel: false });
    // A record reduced or shortened that day: its measure says so.
    expect(
      lireIndexDemarches({ source, demarches: [demarche("8", 1, "www.service.example", { ...mesure, partiel: true })] })
        ?.demarches[0]?.mesure?.partiel,
    ).toBe(true);
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

  it("never tells an unknown state as a failure", () => {
    // The review of the démarches' page: a state the collection does not publish is no measure. (An address the method
    // excludes never reaches the index: the collection decides it with the day's rules, pipeline/publication.ts.)
    const lu = lireIndexDemarches({
      source,
      demarches: [demarche("1", 3, "www.service.example", { ...mesure, etat: "reduit" })],
    });
    expect(lu?.demarches.find((d) => d.id === "1")?.mesure).toBeNull();
  });
});

describe("the « served by » cell of a démarche (servieDe)", () => {
  const lue = (m: unknown) =>
    lireIndexDemarches({ source, demarches: [demarche("1", 1, "www.service.example", m)] })?.demarches[0]?.mesure ??
    null;
  const noms = new Map([["cdn-us", "Exemple CDN"]]);
  const nomDe = (cle: string) => noms.get(cle);

  it("says nothing when the name was not measured, and why a name does not answer", () => {
    expect(servieDe(null, nomDe)).toEqual({ sorte: "non mesuree" });
    for (const etat of ["nxdomain", "nodata", "echec"] as const)
      expect(servieDe(lue({ ...mesure, etat }), nomDe)).toEqual({ sorte: "sans reponse", etat });
  });

  it("names the companies by the day's index, says a partial record, and keeps an unnamed one unnamed", () => {
    expect(servieDe(lue({ ...mesure, societes: ["cdn-us", "autre-cle"], partiel: true }), nomDe)).toEqual({
      sorte: "servie",
      societes: [
        { cle: "cdn-us", nom: "Exemple CDN" },
        { cle: "autre-cle", nom: null },
      ],
      partiel: true,
    });
    expect(servieDe(lue({ ...mesure, societes: [] }), nomDe)).toEqual({
      sorte: "servie",
      societes: [],
      partiel: false,
    });
  });
});

describe("the démarches' edition, for the attribution of card 55 (editionDemarches)", () => {
  it("gives the edition of a readable index, nothing without an index, an error for one that does not read", () => {
    expect(editionDemarches({ statut: "ok", donnees: { source, demarches: [] }, date: "2026-11-24" })).toEqual({
      statut: "ok",
      edition: 15,
      periode: "octobre 2026",
    });
    expect(editionDemarches({ statut: "absent" })).toEqual({ statut: "absent" });
    expect(editionDemarches({ statut: "ok", donnees: { demarches: [] }, date: "2026-11-24" })).toEqual({
      statut: "indisponible",
    });
    expect(editionDemarches({ statut: "indisponible" })).toEqual({ statut: "indisponible" });
  });
});
