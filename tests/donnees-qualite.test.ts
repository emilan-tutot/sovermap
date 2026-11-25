// Tests of the Quality page's figures (part D, lib/donnees/qualite.ts): a made-up published state, shaped as the
// collection writes etat.json, and malformed fields.
import { describe, expect, it } from "vitest";
import { lireEtatPublie } from "@/lib/donnees/lecture";
import { qualiteDe } from "@/lib/donnees/qualite";

const ETAT = {
  statut: "preparation",
  date: "2026-11-21",
  jours: 1,
  sommes: {},
  collecte: {
    debut: "2026-11-21T18:09:00.000Z",
    fin: "2026-11-21T21:18:08.728Z",
    dureeMinutes: 189,
    pointDeMesure: "serveur de GitHub Actions (ubuntu-24.04)",
  },
  versions: { regles: { methode: "0.2.1" } },
  sources: [
    { id: "dila", fiche: 4, etat: "du jour", date: "2026-11-21T03:32:02.000Z", ageJours: 0 },
    { id: "", etat: "du jour" },
    "pas une source",
  ],
  qualite: {
    nomsDeLaListe: 101827,
    nomsMesures: 101827,
    couverturePourcent: 100,
    domaines: 41720,
    domainesEtat: 1903,
    echecs: 1133,
    tauxEchecPourcent: 1.11,
    echecsParCode: { SERVFAIL: 721, ZONE_MUETTE: 344, "<script>": 1 },
    pannesConfirmees: 256,
    pannesConfirmeesPourcent: 0.61,
    tauxEchecNonConfirmesPourcent: 0.07,
    temoins: { concordants: true, ecarts: [] },
    regleSousZoneInterne: {
      texte: "sous-zone interne : une étiquette du sous-domaine, autre que la première, vaut « in »",
      noms: 3901,
      etat: "appliquée",
      controle: { date: "2026-11-21", poses: 20, codes: { avecAdresse: 0, nxdomain: 1, servfail: 14, delai: 5 } },
    },
    debitMaxParServeur: { secondes: 9204, secondesAuDela: 5, partAuDelaPourcent: 0.054, max: 19 },
  },
};

describe("the Quality page's figures (part D)", () => {
  it("reads what etat.json publishes about the day's collection", () => {
    const etat = lireEtatPublie(ETAT);
    expect(etat).not.toBeNull();
    const q = qualiteDe(etat!);
    expect(q).toMatchObject({
      date: "2026-11-21",
      jours: 1,
      collecte: { dureeMinutes: 189, pointDeMesure: "serveur de GitHub Actions (ubuntu-24.04)" },
      methode: "0.2.1",
      couverture: { nomsMesures: 101827, domaines: 41720, domainesEtat: 1903 },
      echecs: { noms: 1133, pannesConfirmees: 256, pannesPourcent: 0.61, nonConfirmesPourcent: 0.07 },
      temoinsConcordants: true,
      regleInterne: { noms: 3901, etat: "appliquée", controle: { poses: 20, codes: { servfail: 14, delai: 5 } } },
      debit: { secondesAuDela: 5, secondes: 9204, max: 19 },
    });
    // A code that is not a code, and a source without an identity, are left out.
    expect(Object.keys(q.echecs.parCode)).toEqual(["SERVFAIL", "ZONE_MUETTE"]);
    expect(q.sources).toEqual([
      { id: "dila", fiche: 4, etat: "du jour", date: "2026-11-21T03:32:02.000Z", ageJours: 0 },
    ]);
  });

  it("says « not published » (null) for a missing or malformed field, and never throws", () => {
    const etat = lireEtatPublie({
      statut: "preparation",
      date: "2026-11-21",
      sommes: {},
      collecte: { dureeMinutes: -3, debut: "hier" },
      qualite: { couverturePourcent: "100", debitMaxParServeur: "rapide", regleSousZoneInterne: { noms: Infinity } },
    });
    const q = qualiteDe(etat!);
    expect(q.collecte).toEqual({ debut: null, fin: null, dureeMinutes: null, pointDeMesure: null });
    expect(q.couverture.pourcent).toBeNull();
    expect(q.debit).toBeNull();
    expect(q.regleInterne).toEqual({ texte: null, noms: null, etat: null, controle: null });
    expect(q.temoinsConcordants).toBeNull();
    expect(q.sources).toEqual([]);
    expect(q.methode).toBeNull();
  });
});
