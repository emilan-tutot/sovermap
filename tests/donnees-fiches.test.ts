// Tests of the records for the pages (part D, lib/donnees/fiches.ts): fragments written by the collection's own
// function (pipeline/publication.ts), from made-up records (RFC 2606 names, RFC 5398 AS numbers), no network.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cheminSeau, fiche, type LireFichier } from "@/lib/donnees/fiches";
import type { Lecture } from "@/lib/donnees/lecture";
import { type EnregistrementDomaine, type EnregistrementNom, fragments, seau } from "@/pipeline/publication";

const nom = (n: string): EnregistrementNom => ({
  nom: n,
  domaine: n.replace(/^www\./, ""),
  provenances: ["dinum:2026-11-19"],
  types: [],
  etat: "ok",
  echec: null,
  cname: [],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [{ as: 64496, plage: null }],
  cdn: null,
  exploitants: [{ role: "hébergé par", societe: "hebergeur-fr", preuve: "AS64496", niveau: "confirmé" }],
  categorie: "France",
  horsUE: false,
  niveau: "confirmé",
  controle: { resolveur: "quad9", accord: true },
});

const domaine = (d: string): EnregistrementDomaine => ({
  domaine: d,
  nomWeb: `www.${d}`,
  perimetre: "État",
  raisons: ["gouv.fr"],
  plateforme: false,
  organismes: 0,
  ministeres: [],
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

/** The published files, read as the reader gives them (checked, with their day). */
function lecteur(fichiers: Map<string, string>, date = "2026-11-22") {
  const lus: string[] = [];
  const lire: LireFichier = async (chemin) => {
    lus.push(chemin);
    const texte = fichiers.get(chemin);
    return texte === undefined
      ? ({ statut: "absent" } as Lecture<unknown>)
      : { statut: "ok", donnees: JSON.parse(texte) as unknown, date };
  };
  return { lire, lus };
}

/** Names that all fall in the bucket of the first one (found by trying: the bucket is a hash). */
function memeSeau(combien: number): string[] {
  const premier = "www.d0.example";
  const cible = seau(premier);
  const noms = [premier];
  for (let i = 1; noms.length < combien; i += 1) {
    const n = `www.d${i}.example`;
    if (seau(n) === cible) noms.push(n);
  }
  return noms;
}

describe("the records for the pages (part D)", () => {
  it("finds the path of a key's bucket as the collection writes it", () => {
    const h = createHash("sha256").update("www.d0.example", "utf8").digest("hex");
    expect(cheminSeau("noms", "www.d0.example")).toBe(`noms/${h.slice(0, 2)}/${h.slice(2, 4)}.json`);
    expect(cheminSeau("noms", "www.d0.example", 2)).toBe(`noms/${h.slice(0, 2)}/${h.slice(2, 4)}.2.json`);
    expect(cheminSeau("domaines", "d0.example")).toBe(`domaines/${seau("d0.example")}.json`);
  });

  it("finds a name's and a domain's record, with the day of their state", async () => {
    const fichiers = new Map([
      ...fragments(
        "noms",
        ["www.d0.example", "www.d1.example"].map((n) => [n, nom(n)] as [string, EnregistrementNom]),
      ),
      ...fragments("domaines", [["d0.example", domaine("d0.example")] as [string, EnregistrementDomaine]]),
    ]);
    const { lire } = lecteur(fichiers);
    expect(await fiche(lire, "noms", "www.d1.example")).toMatchObject({
      statut: "ok",
      donnees: { nom: "www.d1.example" },
      date: "2026-11-22",
    });
    expect(await fiche(lire, "domaines", "d0.example")).toMatchObject({
      statut: "ok",
      donnees: { domaine: "d0.example" },
    });
    // Not published: « absent » (a page answers « not found »).
    expect(await fiche(lire, "noms", "www.inconnu.example")).toEqual({ statut: "absent" });
  });

  it("looks for a key in the numbered parts of its bucket, and stops where it is found", async () => {
    const cles = memeSeau(30);
    const fichiers = fragments(
      "noms",
      cles.map((n) => [n, nom(n)] as [string, EnregistrementNom]),
    );
    const parties = [...fichiers.keys()].filter((c) => !c.endsWith("sommes.json"));
    expect(parties.length).toBeGreaterThan(1);
    const { lire, lus } = lecteur(fichiers);
    const derniere = [...cles].sort().at(-1) ?? "";
    expect(await fiche(lire, "noms", derniere)).toMatchObject({ statut: "ok", donnees: { nom: derniere } });
    expect(lus).toHaveLength(parties.length);
    const premiere = [...cles].sort()[0] ?? "";
    lus.length = 0;
    expect(await fiche(lire, "noms", premiere)).toMatchObject({ statut: "ok" });
    expect(lus).toHaveLength(1);
  });

  it("refuses a fragment that does not match its schema, and passes on what the reader says", async () => {
    const chemin = cheminSeau("noms", "www.d0.example");
    const journal: string[] = [];
    const casse = new Map([[chemin, JSON.stringify({ noms: [{ nom: "www.d0.example" }] })]]);
    expect(await fiche(lecteur(casse).lire, "noms", "www.d0.example", (l) => journal.push(l))).toEqual({
      statut: "indisponible",
    });
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatch(/^donnees : fragment hors schéma \(noms\/[0-9a-f]{2}\/[0-9a-f]{2}\.json : /);
    const indisponible: LireFichier = async () => ({ statut: "indisponible" });
    expect(await fiche(indisponible, "noms", "www.d0.example")).toEqual({ statut: "indisponible" });
    const fermee: LireFichier = async () => ({ statut: "porte fermée" });
    expect(await fiche(fermee, "noms", "www.d0.example")).toEqual({ statut: "porte fermée" });
  });
});
