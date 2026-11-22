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
});
