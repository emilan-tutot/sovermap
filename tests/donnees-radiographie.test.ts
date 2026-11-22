// Tests of the Radiographie's assembly (D.2): made-up records and indexes, documentation names (RFC 2606) and AS
// numbers (RFC 5398), no network.
import { describe, expect, it } from "vitest";
import type { EtatPublie } from "@/lib/donnees/lecture";
import {
  lireIndexAs,
  lireIndexMinisteres,
  lireIndexSocietes,
  nomPays,
  provenanceDe,
  radiographieDe,
  societeVue,
  sourcesDe,
} from "@/lib/donnees/radiographie";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";

const MINISTERE = "00000000-0000-4000-8000-000000000001";
const societes = lireIndexSocietes({
  "hebergeur-fr": { nom: "Hébergeur Exemple", pays: "FR", mere: "hebergeur-fr", paysMere: "FR", categorie: "France" },
  "filiale-us": { nom: "Filiale Exemple", pays: "IE", mere: "groupe-us", paysMere: "US", categorie: "hors d'Europe" },
  "groupe-us": { nom: "Groupe Exemple", pays: "US", mere: "groupe-us", paysMere: "US", categorie: "hors d'Europe" },
  "sans-mere": { nom: "Société Exemple", pays: "FR", mere: null, paysMere: null, categorie: "non déterminé" },
  // A parent that serves no site: named by the published chain (from 23/11/2026), or not at all before.
  "filiale-groupe": {
    nom: "Filiale de Groupe",
    pays: "FR",
    mere: "groupe-fr",
    paysMere: "FR",
    categorie: "France",
    maillons: [
      { cle: "holding-fr", nom: "Holding Exemple", pays: "FR" },
      { cle: "groupe-fr", nom: "Groupe Français Exemple", pays: "FR" },
      { cle: "MAUVAISE", nom: 3, pays: "FR" },
    ],
  },
  "filiale-ancienne": { nom: "Filiale Ancienne", pays: "FR", mere: "groupe-fr", paysMere: "FR", categorie: "France" },
  "MAUVAISE CLE": { nom: "x", pays: "FR", mere: null, paysMere: null, categorie: "France" },
  "pays-illisible": { nom: "x", pays: "France", mere: null, paysMere: null, categorie: "France" },
  "categorie-inconnue": { nom: "x", pays: "FR", mere: null, paysMere: null, categorie: "ailleurs" },
});
const as = lireIndexAs({
  "64496": { description: "EXEMPLE-AS", paysEnregistrement: "FR", titulaire: "Hébergeur Exemple SAS" },
  "64497": { description: null, paysEnregistrement: "EU", titulaire: null },
  "pas-un-as": { titulaire: "x" },
});
const ministeres = lireIndexMinisteres({
  [MINISTERE]: { nom: "Ministère de l’Exemple", domaines: [] },
  x: { nom: "y" },
});

const hote = (nomHote: string, societe: string | null): EnregistrementDomaine["serveursDeNoms"]["hotes"][number] => ({
  hote: nomHote,
  etat: "ok",
  as: [64496],
  exploitants: [{ role: "hébergé par", societe, preuve: "AS64496", niveau: "probable" }],
  categorie: "France",
  horsUE: false,
  niveau: "probable",
});

const domaine: EnregistrementDomaine = {
  domaine: "service.example",
  nomWeb: "www.service.example",
  perimetre: "État",
  raisons: ["gouv.fr", "dila"],
  plateforme: false,
  organismes: 1,
  ministeres: [MINISTERE, "inconnu"],
  noms: 3,
  zone: { etat: "ok", echec: null, ns: ["ns1.service.example", "ns2.service.example"], soa: null, ds: true, caa: [] },
  serveursDeNoms: {
    hotes: [hote("ns1.service.example", "hebergeur-fr"), hote("ns2.service.example", "hebergeur-fr")],
    categorie: "France",
    horsUE: false,
    niveau: "probable",
  },
  messagerie: {
    etat: "ok",
    mx: [{ preference: 10, hote: "mx.service.example" }],
    hotes: [hote("mx.service.example", "sans-mere")],
    categorie: "non déterminé",
    horsUE: null,
    niveau: "non déterminé",
    spf: null,
  },
};

const web: EnregistrementNom = {
  nom: "www.service.example",
  domaine: "service.example",
  provenances: ["dinum:2024-12-11", "dila:dila_refOrga_admin_Etat_fr_20261121.zip", "inconnue:x"],
  types: [],
  etat: "ok",
  echec: null,
  cname: ["service.cdn.example"],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [
    { as: 64496, plage: "192.0.2.0/24" },
    { as: 64497, plage: null },
  ],
  cdn: { id: "cloudflare", methode: "cname" },
  exploitants: [
    { role: "diffusé par", societe: "filiale-us", preuve: "CNAME service.cdn.example", niveau: "confirmé" },
    { role: "hébergé par", societe: "inconnue", preuve: "AS64497", niveau: "non déterminé" },
  ],
  categorie: "hors d'Europe",
  horsUE: true,
  niveau: "probable",
  controle: { resolveur: "quad9", accord: true },
};

describe("the Radiographie of a domain (D.2)", () => {
  it("reads the day's indexes entry by entry, leaving out what is not one", () => {
    expect([...(societes?.keys() ?? [])]).toEqual([
      "hebergeur-fr",
      "filiale-us",
      "groupe-us",
      "sans-mere",
      "filiale-groupe",
      "filiale-ancienne",
    ]);
    expect(as?.get(64496)).toEqual({ titulaire: "Hébergeur Exemple SAS", pays: "FR" });
    // A registry's « EU » is kept as given (no country's name: the page shows the code).
    expect(as?.get(64497)).toEqual({ titulaire: null, pays: "EU" });
    expect(as?.size).toBe(2);
    expect(ministeres?.get(MINISTERE)).toBe("Ministère de l’Exemple");
    expect(ministeres?.size).toBe(1);
    expect(lireIndexSocietes([])).toBeNull();
    expect(lireIndexAs("x")).toBeNull();
  });

  it("names a company, its ultimate parent, or says it is the top of its chain or unknown", () => {
    const index = societes ?? new Map();
    expect(societeVue("hebergeur-fr", index)?.mere).toBe("sommet");
    expect(societeVue("filiale-us", index)?.mere).toEqual({
      cle: "groupe-us",
      nom: "Groupe Exemple",
      pays: "US",
      page: true,
    });
    expect(societeVue("sans-mere", index)?.mere).toBeNull();
    expect(societeVue("filiale-groupe", index)).toMatchObject({
      mere: { cle: "groupe-fr", nom: "Groupe Français Exemple", pays: "FR", page: false },
      maillons: [
        { cle: "holding-fr", nom: "Holding Exemple", pays: "FR" },
        { cle: "groupe-fr", nom: "Groupe Français Exemple", pays: "FR" },
      ],
    });
    expect(societeVue("filiale-ancienne", index)?.mere).toEqual({
      cle: "groupe-fr",
      nom: null,
      pays: "FR",
      page: false,
    });
    expect(societeVue("inconnue", index)).toBeNull();
    expect(societeVue(null, index)).toBeNull();
    expect(nomPays("US")).toBe("États-Unis");
    expect(nomPays("EU")).toBeNull();
  });

  it("reads where a name comes from, and when", () => {
    expect(provenanceDe("dinum:2024-12-11")).toEqual({ source: "dinum", date: "2024-12-11" });
    expect(provenanceDe("dila:dila_refOrga_admin_Etat_fr_20261121.zip")).toEqual({
      source: "dila",
      date: "2026-11-21",
    });
    expect(provenanceDe("sig:2026-11-01")).toEqual({ source: "sig", date: "2026-11-01" });
    expect(provenanceDe("domaine")).toEqual({ source: "domaine", date: null });
    expect(provenanceDe("inconnue:2026-11-01")).toBeNull();
  });

  it("takes the sources' dates and the referentials' versions from etat.json, never an odd value", () => {
    const etat: EtatPublie = {
      date: "2026-11-21",
      statut: "preparation",
      jours: 1,
      sommes: {},
      brut: {
        versions: {
          regles: { listes: ["2024-12-11", "pas une date"], as: "0.2", societes: "0.2", cdn: "<b>0.1</b>" },
          dila: "dila_refOrga_admin_Etat_fr_20261122.json",
        },
        sources: [
          { id: "iptoasn", date: "2026-11-20T00:00:00.000Z" },
          { id: "ris-ipv4", date: "2026-11-21T18:08:14.000Z" },
        ],
      },
    };
    expect(sourcesDe(etat)).toEqual({
      collecte: "2026-11-21",
      listes: ["2024-12-11"],
      dila: "2026-11-22",
      iptoasn: "2026-11-20",
      ris: "2026-11-21",
      referentiels: { as: "0.2", societes: "0.2", cdn: null },
    });
  });

  it("reads no DILA day from a file that names none", () => {
    const etat: EtatPublie = {
      date: "2026-11-21",
      statut: "preparation",
      jours: 1,
      sommes: {},
      brut: { versions: { dila: "<b>pas un fichier</b>" } },
    };
    expect(sourcesDe(etat).dila).toBeNull();
  });

  it("assembles the layers from the records and the indexes", () => {
    const r = radiographieDe(domaine, web, {
      societes: societes ?? new Map(),
      as: as ?? new Map(),
      ministeres: ministeres ?? new Map(),
    });
    expect(r).toMatchObject({ domaine: "service.example", nomWeb: "www.service.example", autresNoms: 2 });
    // A ministry the index does not name keeps its identifier.
    expect(r.ministeres).toEqual(["Ministère de l’Exemple", "inconnu"]);
    expect(r.web?.provenances).toEqual([
      { source: "dinum", date: "2024-12-11" },
      { source: "dila", date: "2026-11-21" },
    ]);
    expect(r.web?.reseaux).toEqual([
      { as: 64496, plage: "192.0.2.0/24", titulaire: "Hébergeur Exemple SAS", pays: "FR" },
      { as: 64497, plage: null, titulaire: null, pays: "EU" },
    ]);
    expect(r.web?.cdn).toEqual({ id: "cloudflare", methode: "cname", nom: "Cloudflare" });
    // A company the index does not know is « not determined », never guessed.
    expect(r.web?.exploitants.map((e) => [e.role, e.societe?.nom ?? null, e.niveau])).toEqual([
      ["diffusé par", "Filiale Exemple", "confirmé"],
      ["hébergé par", null, "non déterminé"],
    ]);
    expect(r.serveurs).toMatchObject({ ns: ["ns1.service.example", "ns2.service.example"], dnssec: true });
    expect(r.messagerie.hotes[0]?.exploitants[0]?.societe?.mere).toBeNull();
    // Without the web name's record, its layers are « not determined »; the domain's stay.
    expect(radiographieDe(domaine, null, { societes: new Map(), as: new Map(), ministeres: new Map() }).web).toBeNull();
  });
});
