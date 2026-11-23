// Tests of the reading of the local directory (brief C.6, card 50): made-up offices and addresses, no network.
import type { FileMetaData } from "hyparquet";
import { describe, expect, it } from "vitest";
import {
  type CopieAnnuaire,
  copieCourante,
  dateEtat,
  ecartVolume,
  fichierParPlages,
  type Guichet,
  guichetDe,
  hotesDe,
  lieuDe,
  lignesGuichets,
  lireCopieAnnuaire,
  memeCopie,
  nomDeRemplacement,
  type Obtenir,
  plagesPermises,
  sansStatistiques,
  TYPES_GUICHET,
  VERSION_LECTURE,
} from "./annuaire-local";
import type { Ecarts } from "./personnelles";

const SHA = "a".repeat(64);
const COMMIT = "b".repeat(40);

/** A made-up footer: one row group, the columns at the given positions, with statistics holding a made-up e-mail. */
function meta(colonnes: [string, number, number][]): FileMetaData {
  const courriel = ["contact", "mairie.example"].join("@");
  return {
    version: 2,
    schema: [],
    num_rows: 2n,
    metadata_length: 100,
    row_groups: [
      {
        total_byte_size: 0n,
        num_rows: 2n,
        columns: colonnes.map(([nom, debut, taille]) => ({
          file_offset: 0n,
          meta_data: {
            type: "BYTE_ARRAY",
            encodings: [],
            path_in_schema: [nom],
            codec: "ZSTD",
            num_values: 2n,
            total_uncompressed_size: BigInt(taille),
            total_compressed_size: BigInt(taille),
            data_page_offset: BigInt(debut),
            statistics: { min_value: courriel, max_value: courriel },
          },
        })),
      },
    ],
  } as unknown as FileMetaData;
}

const UTILES: [string, number, number][] = [
  ["types", 100, 50],
  ["name", 150, 50],
  ["addresses", 300, 100],
  ["urls", 500, 40],
  ["modification_date", 700, 10],
  ["siret", 710, 10],
  ["siren", 720, 10],
];

describe("the local directory, read by ranges (C.6)", () => {
  it("lists the files of the current copy, by commit", async () => {
    const liste = [
      {
        type: "file",
        path: "data/local-administrations-directory-latest/local_administrations_directory_part_1.parquet",
        size: 1000,
        lfs: { oid: SHA },
        lastCommit: { id: COMMIT, date: "2026-11-14T00:38:54.000Z" },
      },
      { type: "file", path: "README.md", size: 10 },
      {
        type: "file",
        path: "data/local-administrations-directory-latest/local_administrations_directory_part_0.parquet",
        size: 2000,
        lfs: { oid: SHA },
        lastCommit: { id: COMMIT, date: "2026-11-14T00:38:54.000Z" },
      },
    ];
    const demandes: string[] = [];
    const obtenir: Obtenir = async (adresse) => {
      demandes.push(adresse);
      return { url: adresse, statut: 200, entetes: new Headers(), corps: Buffer.from(JSON.stringify(liste)) };
    };
    const fichiers = await copieCourante(obtenir);
    expect(fichiers.map((f) => f.chemin.slice(-14))).toEqual(["part_0.parquet", "part_1.parquet"]);
    expect(fichiers[0]).toMatchObject({ taille: 2000, sha256: SHA, commit: COMMIT });
    expect(demandes).toEqual([
      "https://huggingface.co/api/datasets/AgentPublic/local-administrations-directory/tree/main/data/local-administrations-directory-latest?expand=true",
    ]);
    // A date that is not an exact ISO time (it would go into a commit message) refuses the whole copy.
    const avecDate =
      (date: unknown): Obtenir =>
      async (adresse) => ({
        url: adresse,
        statut: 200,
        entetes: new Headers(),
        corps: Buffer.from(JSON.stringify([{ ...liste[0], lastCommit: { id: COMMIT, date } }])),
      });
    await expect(copieCourante(avecDate("2026-11-14T00:38:54Z\nx"))).rejects.toThrow("date ou taille illisible");
    await expect(copieCourante(avecDate("$(date)"))).rejects.toThrow("date ou taille illisible");
    await expect(copieCourante(avecDate(20261114))).rejects.toThrow("date ou taille illisible");
    await expect(copieCourante(avecDate("2999-01-01T00:00:00.000Z"))).rejects.toThrow("date ou taille illisible");
  });

  it("drops the footer's statistics, which hold values of every column", () => {
    const m = sansStatistiques(meta(UTILES));
    for (const c of m.row_groups[0]?.columns ?? []) expect(c.meta_data?.statistics).toBeUndefined();
    expect(JSON.stringify(m, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("@");
  });

  it("allows the ranges of the useful columns only, and refuses any other range before asking it", async () => {
    const plages = plagesPermises(meta([...UTILES, ["phone_numbers", 400, 50], ["mails", 450, 50]]));
    expect(plages.get("addresses")).toEqual([[300, 400]]);
    expect([...plages.keys()]).not.toContain("mails");
    const lues: string[] = [];
    const fichier = fichierParPlages(
      async (debut, fin) => {
        lues.push(`${debut}-${fin}`);
        return new ArrayBuffer(fin - debut);
      },
      1000,
      plages.get("addresses") ?? [],
    );
    await fichier.slice(300, 400);
    // A range that would run on into the phone numbers or the e-mails is refused, and never asked.
    await expect(Promise.resolve().then(() => fichier.slice(300, 460))).rejects.toThrow("plage refusée");
    await expect(Promise.resolve().then(() => fichier.slice(450, 500))).rejects.toThrow("plage refusée");
    expect(lues).toEqual(["300-400"]);
    // A footer without one of the useful columns is refused.
    expect(() => plagesPermises(meta(UTILES.slice(1)))).toThrow("colonne absente : types");
    // A column chunk starts at its dictionary page when it has one (hyparquet's placement), at its data otherwise.
    const avecDictionnaire = meta(UTILES);
    const types = avecDictionnaire.row_groups[0]?.columns[0]?.meta_data;
    const noms = avecDictionnaire.row_groups[0]?.columns[1]?.meta_data;
    if (types === undefined || noms === undefined) throw new Error("pied d'essai incomplet");
    types.dictionary_page_offset = 0n;
    noms.dictionary_page_offset = 140n;
    noms.total_compressed_size = 60n;
    expect(plagesPermises(avecDictionnaire).get("types")).toEqual([[100, 150]]);
    expect(plagesPermises(avecDictionnaire).get("name")).toEqual([[140, 200]]);
    // A footer that would point a useful column at another column's bytes (people's names) is refused.
    expect(() => plagesPermises(meta([...UTILES, ["people_in_charge", 160, 20]]))).toThrow(
      "colonne name : sa plage chevauche celle d'une autre colonne",
    );
  });

  it("keeps the host names of an office's websites", () => {
    expect(
      hotesDe([
        "https://www.Mairie.example/accueil",
        "http://mairie.example",
        "mailto:x",
        "ftp://f.example",
        "sans-point",
      ]),
    ).toEqual(["mairie.example", "www.mairie.example"]);
    expect(hotesDe('["www.ville.example/page"]')).toEqual(["www.ville.example"]);
    expect(hotesDe(null)).toEqual([]);
  });

  it("keeps the town and postcode of an office, and nothing else of its address", () => {
    const adresses = JSON.stringify([
      { adresse: "1 place de la Mairie", commune: "", code_postal: "" },
      { adresse: "2 rue Exemple", commune: "Exemple-sur-Mer", code_postal: "99999", latitude: "1", longitude: "2" },
    ]);
    expect(lieuDe(adresses)).toEqual({ commune: "Exemple-sur-Mer", codePostal: "99999" });
    expect(lieuDe('[{"commune": "Exemple", "code_postal": "99 999"}]')).toEqual({
      commune: "Exemple",
      codePostal: null,
    });
    expect(lieuDe("pas du JSON")).toEqual({ commune: null, codePostal: null });
  });

  it("never keeps an e-mail, a phone or a person's name in an office's name or commune: it is named by its kind (P13)", () => {
    // The examples are put together at run time, so that scan:prive finds none in the repository.
    const courriel = ["accueil", "mairie.example"].join("@");
    const telephone = ["01", "23", "45", "67", "89"].join(" ");
    const adresses = (commune: string) => JSON.stringify([{ commune, code_postal: "99999" }]);
    const ecarts: Ecarts = {};
    expect(
      guichetDe({ name: "Permanence de M. Exemple", types: "mairie", addresses: adresses("Exemple-sur-Mer") }, ecarts),
    ).toMatchObject({ nom: "Mairie d'Exemple-sur-Mer", commune: "Exemple-sur-Mer" });
    expect(
      guichetDe({ name: `Accueil (${courriel})`, types: "epci", addresses: adresses("Bourg-Exemple") }, ecarts)?.nom,
    ).toBe("Groupement de communes de Bourg-Exemple");
    expect(guichetDe({ name: `Mairie annexe ${telephone}`, types: "mairie" }, ecarts)?.nom).toBe("Mairie");
    // An office's usual name passes unchanged: « M. le maire » names no person.
    expect(guichetDe({ name: "Cabinet de M. le maire", types: "mairie" }, ecarts)?.nom).toBe("Cabinet de M. le maire");
    // The commune too: one that holds a person's name is left out, never copied.
    expect(
      guichetDe({ name: "Mairie", types: "mairie", addresses: adresses("Chez Mme Exemple") }, ecarts)?.commune,
    ).toBeNull();
    expect(ecarts).toEqual({ "annuaire-local": { "nom de personne": 2, "adresse e-mail": 1, téléphone: 1 } });
    expect(nomDeRemplacement("cg (Collectivité locale)", "Ain-Exemple")).toBe("Conseil départemental d'Ain-Exemple");
    expect(nomDeRemplacement("cr (Collectivité locale)", null)).toBe("Conseil régional");
  });

  it("builds an office from the useful columns of its row", () => {
    expect(
      guichetDe({
        name: " Mairie d'Exemple-sur-Mer ",
        types: "mairie",
        urls: ["https://www.mairie.example"],
        siren: "123456789",
        siret: "12345678900011",
        addresses: JSON.stringify([{ commune: "Exemple-sur-Mer", code_postal: "99999" }]),
        modification_date: "2026-11-12 10:00:00",
      }),
    ).toEqual({
      nom: "Mairie d'Exemple-sur-Mer",
      type: "mairie",
      hotes: ["www.mairie.example"],
      siren: "123456789",
      siret: "12345678900011",
      commune: "Exemple-sur-Mer",
      codePostal: "99999",
      modification: "2026-11-12",
    });
    expect(guichetDe({ name: "", types: "mairie" })).toBeNull();
    // A category column keeps its known values only (P13): an office of another kind is never copied.
    expect(guichetDe({ name: "Exemple", types: "Une autre catégorie, écrite par quelqu'un" })).toBeNull();
    for (const type of TYPES_GUICHET) expect(guichetDe({ name: "Exemple", types: type })?.type).toBe(type);
    expect(guichetDe({ name: "Mairie", types: "mairie", siren: "12345", siret: "abc" })).toMatchObject({
      siren: null,
      siret: null,
      hotes: [],
      commune: null,
    });
  });
});

describe("the publication of a copy of the local directory (C.6)", () => {
  const fichier = (chemin: string, sha256: string) => ({
    chemin,
    taille: 1000,
    sha256,
    commit: COMMIT,
    date: "2026-11-12",
  });
  const publiee: CopieAnnuaire = {
    fichiers: [fichier("data/a.parquet", SHA), fichier("data/b.parquet", "c".repeat(64))],
    guichets: 1000,
    etat: "2026-11-13",
    lue: "2026-11-15T13:23:00.000Z",
    regles: VERSION_LECTURE,
  };

  it("knows the copy already published, file by file, under the same rules of reading", () => {
    expect(memeCopie([...publiee.fichiers].reverse(), publiee)).toBe(true);
    expect(memeCopie([fichier("data/a.parquet", SHA), fichier("data/b.parquet", "d".repeat(64))], publiee)).toBe(false);
    expect(memeCopie([fichier("data/a.parquet", SHA)], publiee)).toBe(false);
    expect(memeCopie(publiee.fichiers, null)).toBe(false);
    // Read under older rules: read again, so that a correction reaches « donnees » at once (the review of PR 18).
    expect(memeCopie(publiee.fichiers, { ...publiee, regles: VERSION_LECTURE - 1 })).toBe(false);
  });

  it("reads the published copy's description back, checked: an unreadable one counts as none", () => {
    expect(lireCopieAnnuaire(JSON.stringify(publiee))).toEqual(publiee);
    // A description written before the rules had a version: the first rules.
    expect(lireCopieAnnuaire(JSON.stringify({ ...publiee, regles: undefined }))).toEqual({ ...publiee, regles: 1 });
    expect(lireCopieAnnuaire(JSON.stringify({ ...publiee, regles: "2" }))).toBeNull();
    expect(lireCopieAnnuaire(JSON.stringify({ ...publiee, etat: undefined }))).toEqual({ ...publiee, etat: null });
    expect(lireCopieAnnuaire(JSON.stringify({ ...publiee, etat: "le 13 novembre" }))).toBeNull();
    expect(lireCopieAnnuaire(JSON.stringify({ ...publiee, guichets: "1000" }))).toBeNull();
    expect(lireCopieAnnuaire(JSON.stringify({ ...publiee, fichiers: [{ chemin: "x", sha256: "court" }] }))).toBeNull();
    expect(lireCopieAnnuaire("pas du JSON")).toBeNull();
    expect(lireCopieAnnuaire("[]")).toBeNull();
  });

  it("never lets a broken copy replace a good one: 10 % of the published offices at most, and never none", () => {
    expect(ecartVolume(1100, publiee)).toBeNull();
    expect(ecartVolume(900, publiee)).toBeNull();
    expect(ecartVolume(1101, publiee)).toMatch(/écart de 10 %/);
    expect(ecartVolume(500, publiee)).toMatch(/500 guichets contre 1000/);
    expect(ecartVolume(0, null)).toBe("aucun guichet lu");
    expect(ecartVolume(85865, null)).toBeNull();
  });

  it("dates the directory's state by the most recent change among the dates read (every row's, card 50)", () => {
    expect(dateEtat(["2026-11-02", null, "2026-11-13", "2025-01-01"])).toBe("2026-11-13");
    expect(dateEtat([null])).toBeNull();
    expect(dateEtat([])).toBeNull();
  });

  it("writes one office per line, sorted, so that a new copy changes only its changed lines", () => {
    const g = (nom: string, siret: string | null): Guichet => ({
      nom,
      type: "mairie",
      hotes: [],
      siren: null,
      siret,
      commune: null,
      codePostal: null,
      modification: null,
    });
    const texte = lignesGuichets([g("Mairie de B", null), g("Mairie de A", "2"), g("Mairie de A", "1")]);
    const lignes = texte
      .trimEnd()
      .split("\n")
      .map((l) => JSON.parse(l) as Guichet);
    expect(lignes.map((l) => `${l.nom} ${l.siret}`)).toEqual(["Mairie de A 1", "Mairie de A 2", "Mairie de B null"]);
    expect(texte.endsWith("\n")).toBe(true);
  });
});
