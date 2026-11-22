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
  verifierOuvertes,
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
    ["d3.example", domaine("d3.example", "hors État", [])],
    ["d4.example", domaine("d4.example", "État", ["m1"])],
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
    // Served by two known companies and a network no referential knows.
    [
      "www.d3.example",
      {
        ...nom("www.d3.example", "d3.example", null, "hors d'Europe", "probable"),
        exploitants: [
          { role: "hébergé par", societe: null, preuve: "AS64511", niveau: "probable" },
          { role: "hébergé par", societe: "hebergeur-fr", preuve: "AS64496", niveau: "probable" },
          { role: "hébergé par", societe: "cloud-us", preuve: "AS64497", niveau: "probable" },
        ],
      },
    ],
    // Attached to a ministry, and its web name does not exist: not « non déterminé ».
    [
      "www.d4.example",
      { ...nom("www.d4.example", "d4.example", null, "non déterminé", "non déterminé"), etat: "nxdomain" },
    ],
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

const JOUR = {
  date: "2026-11-22",
  heure: "2026-11-22T21:00:00.000Z",
  methode: "0.2.3",
  sources: [
    { id: "iptoasn", fiche: 18, etat: "relevé manuel", date: "2026-11-20" },
    { id: "ris-ipv4", fiche: 19, etat: "du jour", date: "2026-11-22" },
  ],
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

  it("gives each domain all the known operators of its web name, their parents' seats, and its unknown networks", () => {
    const lignes = lignesDomaines(etat, refs);
    expect(lignes.map((l) => l["domain"])).toEqual([
      "d0.example",
      "d1.example",
      "d2.example",
      "d3.example",
      "d4.example",
    ]);
    expect(lignes[0]).toMatchObject({
      state_scope: true,
      roles: "delivered_by",
      operators: "cloud-us",
      operator_names: "Cloud Exemple, Inc.",
      operator_countries: "US",
      parents: "cloud-us",
      parent_countries: "US",
      unknown_networks: 0,
      category: "outside_europe",
      outside_eu: true,
      level: "probable",
      cdn: "cdn-exemple",
      ministries: "m1",
      last_change: "2026-11-21",
    });
    expect(lignes[2]).toMatchObject({
      state_scope: false,
      roles: null,
      operators: null,
      unknown_networks: 0,
      category: "undetermined",
      outside_eu: null,
      level: "undetermined",
      last_change: null,
    });
    // Two known companies, in the record's order, and the network no referential knows counted apart.
    expect(lignes[3]).toMatchObject({
      roles: "hosted_by;hosted_by",
      operators: "hebergeur-fr;cloud-us",
      parent_countries: "FR;US",
      unknown_networks: 1,
    });
    expect(lignes[4]).toMatchObject({ web_status: "nxdomain" });
  });

  it("counts each company and each country once a domain, and a ministry's shares among the domains that answer", () => {
    const domaines = lignesDomaines(etat, refs);
    expect(lignesSocietes(domaines, refs).map((l) => [l["operator"], l["domains"], l["state_domains"]])).toEqual([
      ["cloud-us", 2, 1],
      ["filiale", 0, 0],
      ["hebergeur-fr", 2, 1],
    ]);
    expect(lignesMinisteres(etat, refs)).toEqual([
      {
        ministry: "m1",
        name: "Ministère de l’Exemple",
        domains: 3,
        answering: 2,
        outside_eu_confirmed: 0,
        outside_eu_probable: 1,
        undetermined: 0,
      },
    ]);
    expect(lignesPays(domaines)).toEqual([
      { country: "FR", domains: 2, state_domains: 1 },
      { country: "US", domains: 2, state_domains: 1 },
    ]);
  });

  it("publishes each table as CSV and JSON, their data package and their checksums, « en préparation »", () => {
    const fichiers = fichiersOuverts(etat, refs, JOUR);
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
      created: string;
      resources: { path: string; schema: { fields: { name: string; description: string }[] } }[];
      sovermap: { method: string; status: string };
      sources: Record<string, unknown>[];
    };
    expect(paquet.created).toBe("2026-11-22T21:00:00.000Z");
    expect(paquet.sovermap).toMatchObject({ method: "0.2.3", status: "preparation" });
    expect(JSON.parse(fichiers.get("sovermap-domains.json") ?? "{}")).toMatchObject({ status: "preparation" });
    // The day's sources, dated, never their addresses (one of them names the repository's account); RIS, kept for
    // control only, said to be so.
    expect(paquet.sources[0]).toEqual({
      title: "iptoasn (fiche 18 du registre des sources de Sovermap)",
      date: "2026-11-20",
      state: "relevé manuel",
    });
    expect(String(paquet.sources[1]?.["usage"])).toMatch(/^contrôle seulement/);
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

  it("checks the open files against their own data package, and finds a value of the wrong type", () => {
    const fichiers = fichiersOuverts(etat, refs, JOUR);
    expect(verifierOuvertes(fichiers)).toEqual([]);
    const mauvais = new Map(fichiers);
    mauvais.set(
      "sovermap-domains.json",
      (fichiers.get("sovermap-domains.json") ?? "").replace('"unknown_networks":0', '"unknown_networks":"0"'),
    );
    expect(verifierOuvertes(mauvais)).toEqual(["domains 0 unknown_networks : integer attendu"]);
  });
});
