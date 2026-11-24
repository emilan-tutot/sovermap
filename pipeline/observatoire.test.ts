// Tests of the reading of the Observatoire (C.8, card 55): a made-up sheet in the shape of an ODS content.xml (names
// under .example, RFC 2606), its repeated cells, entities and spaces; and a document type refused.
import { describe, expect, it } from "vitest";
import { demarchesDe, lignesOds } from "./observatoire";
import { lireListeSuffixes } from "./psl";

const cellule = (texte: string, attributs = "") =>
  `<table:table-cell office:value-type="string"${attributs}><text:p>${texte}</text:p></table:table-cell>`;
const nombre = (n: number, affiche: string) =>
  `<table:table-cell office:value-type="float" office:value="${n}"><text:p>${affiche}</text:p></table:table-cell>`;
const ligne = (...c: string[]) => `<table:table-row table:style-name="ro1">${c.join("")}</table:table-row>`;

const ENTETES = [
  "Nom Démarche",
  "ID Démarche",
  "Périmètre Ministériel (AC/SG)",
  "Réf Administration",
  "Volumétrie Totale",
  "Volumétrie En Ligne",
  "Note Satisfaction",
  "URL Démarche",
];

const CONTENU = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
<office:body><office:spreadsheet><table:table table:name="T_VDE" table:style-name="ta1">
<table:table-column table:number-columns-repeated="8"/>
${ligne(...ENTETES.map((e) => cellule(e)))}
${ligne(
  cellule("Je déclare l&apos;exemple"),
  cellule("1764"),
  cellule("Ministère de l&apos;Exemple"),
  cellule("DEX"),
  nombre(49499, "49 499"),
  nombre(41588, "41 588"),
  cellule("9,1"),
  cellule('<text:a xlink:href="https://www.service.example/demarche">https://www.service.example/demarche</text:a>'),
)}
${ligne(
  cellule('Une<text:s text:c="2"/>démarche à venir'),
  cellule("115"),
  cellule("Ministère de l&apos;Exemple"),
  `<table:table-cell table:number-columns-repeated="1"/>`,
  cellule("À venir"),
  cellule("À venir"),
  cellule("À venir"),
  cellule("pas une adresse"),
)}
${ligne(`<table:table-cell table:number-columns-repeated="8"/>`)}
</table:table></office:spreadsheet></office:body></office:document-content>`;

// A made-up list in the Public Suffix List's shape (its version line, and the thousand rules a real list has at least).
const SUFFIXES = lireListeSuffixes(
  [
    "// VERSION: 2026-01-01_00-00-00_UTC",
    "// ===BEGIN ICANN DOMAINS===",
    "example",
    "// ===END ICANN DOMAINS===",
    ...Array.from({ length: 1000 }, (_, i) => `rempli${i}.example`),
  ].join("\n"),
);

describe("the reading of the Observatoire (C.8)", () => {
  it("reads the sheet's rows and cells, entities, spaces and repeated cells, and leaves out empty rows", () => {
    const { feuille, lignes } = lignesOds(CONTENU);
    expect(feuille).toBe("T_VDE");
    expect(lignes).toHaveLength(3);
    expect(lignes[1]?.[0]?.texte).toBe("Je déclare l'exemple");
    expect(lignes[1]?.[4]).toEqual({ texte: "49 499", valeur: "49499" });
    expect(lignes[2]?.[0]?.texte).toBe("Une démarche à venir");
  });

  it("takes a démarche's name, identifier, perimeter, administration, volumes and domain, never its marks", () => {
    const demarches = demarchesDe(lignesOds(CONTENU).lignes, SUFFIXES);
    expect(demarches).toEqual([
      {
        id: "115",
        nom: "Une démarche à venir",
        perimetre: "Ministère de l'Exemple",
        administration: null,
        volumeTotal: null,
        volumeEnLigne: null,
        hote: null,
        domaine: null,
      },
      {
        id: "1764",
        nom: "Je déclare l'exemple",
        perimetre: "Ministère de l'Exemple",
        administration: "DEX",
        volumeTotal: 49499,
        volumeEnLigne: 41588,
        hote: "www.service.example",
        domaine: "service.example",
      },
    ]);
    expect(JSON.stringify(demarches)).not.toContain("9,1");
  });

  it("refuses a document type or an entity declaration, and a sheet whose headers changed", () => {
    expect(() => lignesOds(`<!DOCTYPE x [<!ENTITY a "aaaa">]>${CONTENU}`)).toThrow(/refusée/);
    const sansAdresse = CONTENU.replace("URL Démarche", "Adresse");
    expect(() => demarchesDe(lignesOds(sansAdresse).lignes, SUFFIXES)).toThrow(/URL Démarche/);
  });

  it("expands repeated empty cells before a column, and reads numeric references (the review of C.8)", () => {
    // Two marks in the headers, two empty cells written as one repeated cell in the row: the address is read in its
    // own column only if the repetition is expanded.
    const contenu = CONTENU.replace(
      cellule("Note Satisfaction"),
      cellule("Note Satisfaction") + cellule("Note Accessibilité"),
    ).replace(cellule("9,1"), `<table:table-cell table:number-columns-repeated="2"/>`);
    const avecRepetees = demarchesDe(lignesOds(contenu).lignes, SUFFIXES);
    expect(avecRepetees.find((d) => d.id === "1764")?.hote).toBe("www.service.example");
    expect(
      lignesOds(CONTENU.replace("Je déclare l&apos;exemple", "Je d&#xE9;clare l&#39;exemple")).lignes[1]?.[0]?.texte,
    ).toBe("Je déclare l'exemple");
    // An unknown entity stays text, even one named like a property of every object.
    expect(lignesOds(CONTENU.replace("DEX", "&constructor;")).lignes[1]?.[3]?.texte).toBe("&constructor;");
    // No angle bracket is kept, even one a character reference wrote: never a tag in the published text (CodeQL).
    expect(lignesOds(CONTENU.replace("DEX", "&lt;script&gt;DEX&#60;/script&#x3E;")).lignes[1]?.[3]?.texte).toBe(
      "scriptDEX/script",
    );
  });

  it("refuses an edition with a cell's comment or note, and drops control or direction characters", () => {
    const annotee = CONTENU.replace(
      cellule("Je déclare l&apos;exemple"),
      `<table:table-cell office:value-type="string"><office:annotation><dc:creator>Personne Exemple</dc:creator><text:p>à revoir</text:p></office:annotation><text:p>Je déclare l&apos;exemple</text:p></table:table-cell>`,
    );
    expect(() => lignesOds(annotee)).toThrow(/commentaire/);
    const notee = CONTENU.replace(
      "Je déclare l&apos;exemple",
      "Je déclare<text:note><text:note-body><text:p>note interne</text:p></text:note-body></text:note> l&apos;exemple",
    );
    expect(() => lignesOds(notee)).toThrow(/note/);
    expect(lignesOds(CONTENU.replace("Je déclare", "Je dé­clare​")).lignes[1]?.[0]?.texte).toBe("Je déclare l'exemple");
    expect(lignesOds(CONTENU.replace("DEX", "D\u202eEX\u0007")).lignes[1]?.[3]?.texte).toBe("DEX");
  });

  it("takes no host from an address that is not a web address on a name", () => {
    for (const adresse of [
      "mailto:accueil",
      "ftp://www.service.example/",
      "https://10.0.0.10/demarche",
      "https://[2001:db8::1]/",
    ]) {
      const contenu = CONTENU.replaceAll("https://www.service.example/demarche", adresse);
      expect(demarchesDe(lignesOds(contenu).lignes, SUFFIXES).find((d) => d.id === "1764")?.hote, adresse).toBe(null);
    }
  });

  it("refuses a sheet larger than any edition, and a full cell after a repetition cut at 64", () => {
    expect(() => lignesOds(CONTENU + " ".repeat(8 * 1024 * 1024))).toThrow(/trop grand/);
    const decalee = CONTENU.replace(cellule("9,1"), `<table:table-cell table:number-columns-repeated="100"/>`);
    expect(() => lignesOds(decalee)).toThrow(/répétition/);
    const large = ligne(...Array.from({ length: 300 }, () => cellule("x")));
    expect(() =>
      lignesOds(CONTENU.replace(`${ligne(`<table:table-cell table:number-columns-repeated="8"/>`)}`, large)),
    ).toThrow(/cellules/);
  });
});
