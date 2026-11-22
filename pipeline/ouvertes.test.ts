// Tests of the open data of the day (brief F.1): made-up records, documentation names and AS numbers only (RFC 2606,
// RFC 5398), no network.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  champCsv,
  fichiersOuverts,
  lignesDomaines,
  lignesMinisteres,
  lignesPays,
  lignesSocietes,
  type Referentiels,
} from "./ouvertes";
import type { EnregistrementDomaine, EnregistrementNom, Etat, Societe } from "./publication";

const nom = (
  n: string,
  domaine: string,
  exploitant: { role: "hébergé par" | "diffusé par"; societe: string } | null,
  categorie: EnregistrementNom["categorie"],
  niveau: EnregistrementNom["niveau"],
): EnregistrementNom => ({
  nom: n,
  domaine,
  provenances: ["dinum:2026-11-19"],
  types: [],
  etat: "ok",
  echec: null,
  cname: [],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [{ as: 64496, plage: "192.0.2.0-192.0.2.255" }],
  cdn: exploitant?.role === "diffusé par" ? { id: "cdn-exemple", methode: "cname" } : null,
  exploitants: exploitant === null ? [] : [{ ...exploitant, preuve: "AS64496", niveau }],
  categorie,
  horsUE: categorie === "non déterminé" ? null : categorie === "hors d'Europe",
  niveau,
  controle: { resolveur: "quad9", accord: true },
});

const domaine = (d: string, perimetre: "État" | "hors État", ministeres: string[]): EnregistrementDomaine => ({
  domaine: d,
  nomWeb: `www.${d}`,
  perimetre,
  raisons: perimetre === "État" ? ["gouv.fr"] : [],
  plateforme: false,
  organismes: 0,
  ministeres,
  noms: 1,
  zone: { etat: "ok", echec: null, ns: [`ns1.${d}`], soa: `ns1.${d}`, ds: false, caa: [] },
  serveursDeNoms: { hotes: [], categorie: "France", horsUE: false, niveau: "probable" },
  messagerie: {
    etat: "aucun",
    mx: [],
    hotes: [],
    categorie: "non déterminé",
    horsUE: null,
    niveau: "non déterminé",
    spf: null,
  },
});

const societe = (n: string, pays: string, mere: string | null, categorie: Societe["categorie"]): Societe => ({
  nom: n,
  pays,
  mere,
  paysMere: mere === null ? null : pays,
  categorie,
  maillons: [],
  controle: null,
});

const etat: Etat = {
  domaines: new Map([
    ["d0.example", domaine("d0.example", "État", ["m1"])],
    ["d1.example", domaine("d1.example", "État", ["m1"])],
    ["d2.example", domaine("d2.example", "hors État", [])],
  ]),
  noms: new Map([
    [
      "www.d0.example",
      nom("www.d0.example", "d0.example", { role: "diffusé par", societe: "cloud-us" }, "hors d'Europe", "probable"),
    ],
    [
      "www.d1.example",
      nom("www.d1.example", "d1.example", { role: "hébergé par", societe: "hebergeur-fr" }, "France", "confirmé"),
    ],
    ["www.d2.example", nom("www.d2.example", "d2.example", null, "non déterminé", "non déterminé")],
  ]),
};

const refs: Referentiels = {
  societes: new Map([
    ["cloud-us", societe("Cloud Exemple, Inc.", "US", "cloud-us", "hors d'Europe")],
    ["filiale", societe('Filiale "Exemple"', "NL", null, "non déterminé")],
    ["hebergeur-fr", societe("Hébergeur Exemple", "FR", "hebergeur-fr", "France")],
  ]),
  organismes: new Map([["m1", { nom: "Ministère de l’Exemple", sigle: null, ministere: null }]]),
  jours: new Map([["d0.example", "2026-11-21"]]),
};

describe("the open data of the day (F.1)", () => {
  it("writes a CSV field by RFC 4180", () => {
    expect([null, "a", "a,b", 'a"b', "a\nb", true, false, 3].map(champCsv)).toEqual([
      "",
      "a",
      '"a,b"',
      '"a""b"',
      '"a\nb"',
      "true",
      "false",
      "3",
    ]);
  });

  it("gives each domain its serving company, its parent's seat, its level and the day of its last change", () => {
    const lignes = lignesDomaines(etat, refs);
    expect(lignes.map((l) => l["domain"])).toEqual(["d0.example", "d1.example", "d2.example"]);
    expect(lignes[0]).toMatchObject({
      state_scope: true,
      role: "delivered_by",
      operator: "cloud-us",
      operator_name: "Cloud Exemple, Inc.",
      parent_country: "US",
      category: "outside_europe",
      outside_eu: true,
      level: "probable",
      cdn: "cdn-exemple",
      ministries: "m1",
      last_change: "2026-11-21",
    });
    expect(lignes[2]).toMatchObject({
      state_scope: false,
      role: null,
      operator: null,
      category: "undetermined",
      outside_eu: null,
      level: "undetermined",
      last_change: null,
    });
  });

  it("counts each company's, ministry's and country's domains of the day", () => {
    const domaines = lignesDomaines(etat, refs);
    expect(lignesSocietes(domaines, refs).map((l) => [l["operator"], l["domains"], l["state_domains"]])).toEqual([
      ["cloud-us", 1, 1],
      ["filiale", 0, 0],
      ["hebergeur-fr", 1, 1],
    ]);
    expect(lignesMinisteres(etat, refs)).toEqual([
      {
        ministry: "m1",
        name: "Ministère de l’Exemple",
        domains: 2,
        outside_eu_confirmed: 0,
        outside_eu_probable: 1,
        undetermined: 0,
      },
    ]);
    expect(lignesPays(domaines)).toEqual([
      { country: "FR", domains: 1, state_domains: 1 },
      { country: "US", domains: 1, state_domains: 1 },
    ]);
  });

  it("publishes each table as CSV and JSON, their data package and their checksums", () => {
    const fichiers = fichiersOuverts(etat, refs, { date: "2026-11-22", methode: "0.2.3" });
    expect([...fichiers.keys()].sort()).toEqual([
      "SHA256SUMS",
      "datapackage.json",
      "sovermap-countries.csv",
      "sovermap-countries.json",
      "sovermap-domains.csv",
      "sovermap-domains.json",
      "sovermap-ministries.csv",
      "sovermap-ministries.json",
      "sovermap-operators.csv",
      "sovermap-operators.json",
    ]);
    const operateurs = fichiers.get("sovermap-operators.csv") ?? "";
    expect(operateurs.split("\r\n")[2]).toBe('filiale,"Filiale ""Exemple""",NL,,,undetermined,,0,0');
    const paquet = JSON.parse(fichiers.get("datapackage.json") ?? "{}") as {
      resources: { path: string; schema: { fields: { name: string; description: string }[] } }[];
      sovermap: { method: string };
    };
    expect(paquet.sovermap.method).toBe("0.2.3");
    for (const r of paquet.resources) {
      const entete = (fichiers.get(r.path) ?? "").split("\r\n")[0];
      expect(entete, r.path).toBe(r.schema.fields.map((f) => f.name).join(","));
      for (const f of r.schema.fields) expect(f.description.length, `${r.path} ${f.name}`).toBeGreaterThan(10);
    }
    for (const ligne of (fichiers.get("SHA256SUMS") ?? "").trim().split("\n")) {
      const [somme, , fichier = ""] = ligne.split(" ");
      expect(
        createHash("sha256")
          .update(fichiers.get(fichier) ?? "", "utf8")
          .digest("hex"),
        fichier,
      ).toBe(somme);
    }
  });
});
