// Tests of the reference list: made-up lists and Référentiel, documentation names only (RFC 2606), and a small
// made-up suffix list in which « gouv.example » plays .gouv.fr's part.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ReferentielDila } from "./dila";
import { construireListe, lireCopiePerimetre, ministeresDuDomaine, uniteDe } from "./perimetre";
import { lireListeSuffixes } from "./psl";

const suffixes = lireListeSuffixes(
  ["// VERSION: essai", "example", "gouv.example", ...Array.from({ length: 1000 }, (_, i) => `rempli${i}.test`)].join(
    "\n",
  ),
);
const plateformes = new Set(["createur.example"]);

const dila: ReferentielDila = {
  fichier: "dila_refOrga_admin_Etat_fr_20260101.zip",
  neutralises: 0,
  services: new Map([
    [
      "s1",
      {
        id: "s1",
        nom: "Service Exemple",
        sigle: null,
        type: null,
        parent: "m1",
        ministere: "m1",
        hotes: ["www.service.example", "page.createur.example"],
      },
    ],
  ]),
};

describe("the reference list", () => {
  const liste = construireListe(
    [
      {
        date: "2024-12-11",
        csv: "name,type\nwww.mairie.example,Commune\nmairie.example,Commune\nrecette.mairie.example,Commune\n",
      },
      {
        date: "2026-11-19",
        csv: "name,type\nwww.mairie.example,Commune\nportail.ministere.gouv.example,Gouvernement\nclub.createur.example,\n",
      },
    ],
    dila,
    suffixes,
    plateformes,
    ".gouv.example",
  );

  it("keeps each name's provenances and types, and leaves internal names out", () => {
    expect(liste.noms.get("www.mairie.example")).toEqual({
      nom: "www.mairie.example",
      domaine: "mairie.example",
      provenances: ["dinum:2024-12-11", "dinum:2026-11-19"],
      types: ["Commune"],
      organismes: [],
    });
    expect(liste.noms.has("recette.mairie.example")).toBe(false);
    expect(liste.exclus.get("environnement")).toBe(1);
  });

  it("counts a name set aside once, keeps it, and measures it when the fourth rule is suspended", () => {
    const copies = [
      { date: "2024-12-11", csv: "name,type\nx.in.phm.ministere.gouv.example,\nin.ministere.gouv.example,\n" },
      { date: "2026-11-19", csv: "name,type\nx.in.phm.ministere.gouv.example,\n" },
    ];
    const avec = construireListe(copies, null, suffixes, plateformes, ".gouv.example");
    expect(avec.exclus.get("sous-zone interne")).toBe(1);
    expect([...(avec.ecartes.get("sous-zone interne") ?? [])]).toEqual(["x.in.phm.ministere.gouv.example"]);
    expect(avec.noms.has("in.ministere.gouv.example")).toBe(true);
    const sans = construireListe(copies, null, suffixes, plateformes, ".gouv.example", { sousZoneInterne: false });
    expect(sans.noms.has("x.in.phm.ministere.gouv.example")).toBe(true);
    expect(sans.exclus.has("sous-zone interne")).toBe(false);
  });

  it("gives each unit its web name, adding the apex when no www. is listed", () => {
    expect(liste.domaines.get("mairie.example")?.nomWeb).toBe("www.mairie.example");
    const ministere = liste.domaines.get("ministere.gouv.example");
    expect(ministere?.nomWeb).toBe("ministere.gouv.example");
    expect(liste.noms.get("ministere.gouv.example")?.provenances).toEqual(["domaine"]);
  });

  it("puts .gouv and the DILA's websites in the « État » perimeter, never a platform's page", () => {
    expect(liste.domaines.get("ministere.gouv.example")?.perimetre).toBe("État");
    expect(liste.domaines.get("ministere.gouv.example")?.raisons).toEqual(["gouv.fr"]);
    expect(liste.domaines.get("service.example")).toMatchObject({
      perimetre: "État",
      raisons: ["dila"],
      organismes: ["s1"],
      ministeres: ["m1"],
    });
    expect(liste.domaines.get("mairie.example")?.perimetre).toBe("hors État");
    expect(liste.domaines.get("page.createur.example")).toMatchObject({ perimetre: "hors État", plateforme: true });
    // The provenance « dila » never carries the day's file: a date in it would rewrite every fragment every day.
    expect(liste.noms.get("www.service.example")?.provenances).toEqual(["dila"]);
  });

  it("makes each name on a third-party platform its own unit", () => {
    expect(uniteDe("club.createur.example", suffixes, plateformes)).toBe("club.createur.example");
    expect(uniteDe("www.mairie.example", suffixes, plateformes)).toBe("mairie.example");
    expect(liste.domaines.get("club.createur.example")?.nomWeb).toBe("club.createur.example");
  });

  it("puts the SIG's sites and the MESR's public institutions in the « État » perimeter (C.5), never a platform", () => {
    const avecPerimetre = construireListe(
      [{ date: "2026-11-19", csv: "name,type\nwww.universite.example,\nmairie.example,Commune\n" }],
      dila,
      suffixes,
      plateformes,
      ".gouv.example",
      undefined,
      [
        {
          source: "sig",
          date: "2026-11-01",
          sites: [
            "agence.example",
            "portail.ministere.gouv.example",
            "x.createur.example",
            "Bureau.Agence.example",
            "www.service.example",
          ],
          ministeres: new Map([
            ["agence.example", "m2"],
            ["Bureau.Agence.example", "m3"],
            ["www.service.example", "m9"],
          ]),
          empreinte: "000000000001",
        },
        {
          source: "mesr",
          date: "2026-11-21",
          sites: ["www.universite.example", "recette.ecole.example"],
          empreinte: "000000000002",
        },
      ],
    );
    // A site that is not in the list enters it, with its provenance; its unit is « État ».
    expect(avecPerimetre.noms.get("agence.example")?.provenances).toEqual(["sig:2026-11-01"]);
    // Its ministry, as the SIG gives it, for each of its sites (a site written in capitals included).
    expect(avecPerimetre.domaines.get("agence.example")).toMatchObject({
      perimetre: "État",
      raisons: ["sig"],
      ministeres: ["m2", "m3"],
    });
    // The DILA's ministry first: the SIG's for the same domain is a fallback only.
    expect(avecPerimetre.domaines.get("service.example")?.ministeres).toEqual(["m1"]);
    // A listed name keeps its provenances, and its unit gains the reason.
    expect(avecPerimetre.noms.get("www.universite.example")?.provenances).toEqual([
      "dinum:2026-11-19",
      "mesr:2026-11-21",
    ]);
    expect(avecPerimetre.domaines.get("universite.example")).toMatchObject({ perimetre: "État", raisons: ["mesr"] });
    expect(avecPerimetre.domaines.get("ministere.gouv.example")?.raisons).toEqual(["gouv.fr", "sig"]);
    // A unit on a third-party platform never enters the perimeter; an internal name stays out, whatever its list.
    expect(avecPerimetre.domaines.get("x.createur.example")).toMatchObject({
      perimetre: "hors État",
      plateforme: true,
    });
    expect(avecPerimetre.noms.has("recette.ecole.example")).toBe(false);
    expect(avecPerimetre.domaines.get("mairie.example")?.perimetre).toBe("hors État");
  });

  it("gives a domain the DILA's ministries, else its SIG sites' on a day the Référentiel is read (C.5)", () => {
    expect(ministeresDuDomaine(["m1"], ["m2"], true)).toEqual(["m1"]);
    expect(ministeresDuDomaine([], ["m2"], true)).toEqual(["m2"]);
    // Without the Référentiel, no ministry has a name: the SIG's identifiers are not published alone.
    expect(ministeresDuDomaine([], ["m2"], false)).toEqual([]);
  });

  it("reads the real dated copies as the collection does: valid, unique sites, no address of a person", () => {
    for (const source of ["sig", "mesr"] as const) {
      const fichier = readdirSync("referentiels/perimetre")
        .filter((f) => new RegExp(`^${source}-\\d{4}-\\d{2}-\\d{2}\\.csv$`).test(f))
        .sort()
        .at(-1);
      expect(fichier, source).toBeDefined();
      if (fichier === undefined) continue;
      const texte = readFileSync(`referentiels/perimetre/${fichier}`, "utf8");
      const copie = lireCopiePerimetre(source, fichier.slice(source.length + 1, -4), texte);
      expect(copie.sites.length, source).toBeGreaterThan(100);
      expect(new Set(copie.sites).size, source).toBe(copie.sites.length);
      expect(texte, source).not.toContain("@");
      if (source === "sig") expect(new Set(copie.ministeres?.values()).size).toBeLessThanOrEqual(20);
    }
  });

  it("never sets aside a site the SIG lists as a technical tool, and only for that rule (point 09, Q3)", () => {
    const avecSig = construireListe(
      [{ date: "2026-11-19", csv: "name,type\nmx.ambassade.example,\nmx.mairie.example,Commune\n" }],
      null,
      suffixes,
      plateformes,
      ".gouv.example",
      undefined,
      [
        {
          source: "sig",
          date: "2026-11-01",
          sites: [
            "mx.ambassade.example",
            "pop.patrimoine.gouv.example",
            "recette.agence.example",
            "mx.in.ambassade.example",
          ],
          empreinte: "000000000001",
        },
        { source: "mesr", date: "2026-11-21", sites: ["mail.universite.example"], empreinte: "000000000002" },
      ],
    );
    // Listed by the SIG: measured, with the official list's provenance too, and never counted as set aside.
    expect(avecSig.noms.get("mx.ambassade.example")?.provenances).toEqual(["dinum:2026-11-19", "sig:2026-11-01"]);
    expect(avecSig.noms.has("pop.patrimoine.gouv.example")).toBe(true);
    // The same rule still sets aside a name the SIG does not list (the MESR's list waives nothing).
    expect([...(avecSig.ecartes.get("outil technique") ?? [])].sort()).toEqual([
      "mail.universite.example",
      "mx.mairie.example",
    ]);
    expect(avecSig.exclus.get("outil technique")).toBe(2);
    // The other rules still apply to a site the SIG lists, the fourth one included.
    expect(avecSig.noms.has("recette.agence.example")).toBe(false);
    expect(avecSig.exclus.get("environnement")).toBe(1);
    expect([...(avecSig.ecartes.get("sous-zone interne") ?? [])]).toEqual(["mx.in.ambassade.example"]);
  });

  it("reads a dated copy, checks it, and gives it a fingerprint that changes with its text", () => {
    const UUID = "ac1a7fdb-50f4-4599-b306-ec06b7250965";
    const sig = lireCopiePerimetre(
      "sig",
      "2026-11-01",
      `site,ministere,type\nagence.example,${UUID},vitrine\n,${UUID},x\n`,
    );
    expect(sig).toMatchObject({ source: "sig", date: "2026-11-01", sites: ["agence.example"] });
    expect(sig.ministeres?.get("agence.example")).toBe(UUID);
    expect(sig.empreinte).toMatch(/^[0-9a-f]{12}$/);
    // One more line: another fingerprint, so another rule of the day.
    const autre = lireCopiePerimetre(
      "sig",
      "2026-11-01",
      `site,ministere,type\nagence.example,${UUID},vitrine\nb.example,${UUID},x\n`,
    );
    expect(autre.empreinte).not.toBe(sig.empreinte);
    // The MESR's copy has no ministry; a copy without its columns, or with a malformed ministry, is refused.
    expect(
      lireCopiePerimetre("mesr", "2026-11-21", "site,nom,siren,type\nwww.universite.example,U,1,Université\n").sites,
    ).toEqual(["www.universite.example"]);
    expect(() => lireCopiePerimetre("mesr", "2026-11-21", "nom\nU\n")).toThrow(/colonne « site »/);
    expect(() => lireCopiePerimetre("sig", "2026-11-01", "site,type\na.example,x\n")).toThrow(/colonne « ministere »/);
    expect(() => lireCopiePerimetre("sig", "2026-11-01", "site,ministere\na.example,<b>\n")).toThrow(
      /ministère illisible/,
    );
    // A site that is not a host name is refused, never dropped without a word.
    expect(() => lireCopiePerimetre("mesr", "2026-11-21", "site\nhttps://x.example/\n")).toThrow(/site illisible/);
  });
});
