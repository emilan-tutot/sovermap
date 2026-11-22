// Tests of the country table and of the labels (brief C.7): every row has at least two sources of the registry
// (docs/sources.md), read on a date; the memberships hold together; every label of the data has its English name.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import libelles from "@/referentiels/libelles.json";
import pays from "@/referentiels/pays.json";
import { EUROPE_HORS_UE, UE } from "@/pipeline/societes";
import type { Categorie, Niveau } from "@/pipeline/types";
import type { Servant } from "@/pipeline/classement";

const registre = readFileSync(new URL("../docs/sources.md", import.meta.url), "utf8");
const fiches = new Set([...registre.matchAll(/^### (\d+)\. /gm)].map((m) => Number(m[1])));
const methode = readFileSync(new URL("../docs/methode.md", import.meta.url), "utf8");

type Ligne = (typeof pays.pays)[number];
const lignes: Ligne[] = pays.pays;
const codes = (f: (l: Ligne) => boolean) => new Set(lignes.filter(f).map((l) => l.a2));

describe("the country table (referentiels/pays.json)", () => {
  it("has one row per ISO code, with its names", () => {
    expect(lignes).toHaveLength(249);
    expect(new Set(lignes.map((l) => l.a2)).size).toBe(249);
    expect(new Set(lignes.map((l) => l.a3)).size).toBe(249);
    for (const l of lignes) {
      expect(l.a2).toMatch(/^[A-Z]{2}$/);
      expect(l.a3).toMatch(/^[A-Z]{3}$/);
      if (l.adm0_a3 !== null) expect(l.adm0_a3).toMatch(/^[A-Z]{3}$/);
      expect(l.fr.trim()).not.toBe("");
      expect(l.en.trim()).not.toBe("");
      expect(l.fr).not.toContain("*");
    }
    expect(lignes.find((l) => l.a2 === "FR")).toMatchObject({ a3: "FRA", adm0_a3: "FRA", fr: "France", ue: true });
  });

  it("gives every row at least two sources of the registry, and the date they were read", () => {
    for (const numero of Object.values(pays.sources)) expect(fiches.has(numero)).toBe(true);
    for (const l of lignes) {
      expect(new Set(l.sources).size).toBeGreaterThanOrEqual(2);
      for (const numero of l.sources) expect(fiches.has(numero)).toBe(true);
      expect(l.lu).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(l.lu)).toBeLessThanOrEqual(Date.now());
    }
  });

  it("holds its memberships together, and says how they differ from the collection's lists", () => {
    for (const l of lignes) {
      if (l.ue) expect(l.eee).toBe(true);
      if (l.europeHorsUe) expect(l.ue).toBe(false);
    }
    // The collection still classifies with its own lists (pipeline/societes.ts) until the method 0.3 (C.2): the
    // table adds seven territories of the EU with their own code, and twelve countries or territories of Europe.
    const ue = codes((l) => l.ue);
    expect([...UE].every((c) => ue.has(c))).toBe(true);
    expect([...ue].filter((c) => !UE.has(c)).sort()).toEqual(["AX", "GF", "GP", "MF", "MQ", "RE", "YT"]);
    const europe = codes((l) => l.europeHorsUe);
    expect([...EUROPE_HORS_UE].filter((c) => !europe.has(c))).toEqual(["XK"]);
    expect([...europe].filter((c) => !EUROPE_HORS_UE.has(c)).sort()).toEqual([
      "AZ",
      "BY",
      "FO",
      "GE",
      "GG",
      "GI",
      "IM",
      "JE",
      "KZ",
      "RU",
      "SJ",
      "TR",
    ]);
  });

  it("gives the Commission's adequacy decisions, with their reference, date and scope", () => {
    const adequats = lignes.filter((l) => l.adequation !== null);
    expect(adequats).toHaveLength(16);
    for (const l of adequats) {
      expect(l.adequation?.decision).toMatch(/CELEX \d{5}[A-Z]\d{4}/);
      expect(l.adequation?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.sources).toContain(pays.sources["decisions-d-adequation-commission"]);
    }
    const partielles = adequats.filter((l) => l.adequation?.portee === "partielle").map((l) => l.a2);
    expect(partielles.sort()).toEqual(["CA", "IL", "US", "UY"]);
    expect(adequats.every((l) => ["totale", "partielle"].includes(l.adequation?.portee ?? ""))).toBe(true);
  });
});

describe("the labels of the data (referentiels/libelles.json)", () => {
  it("names every category, level and role of the data in English", () => {
    const categories: Record<Categorie, string> = libelles.categories;
    const niveaux: Record<Niveau, string> = libelles.niveaux;
    const roles: Record<Servant["role"], string> = libelles.roles;
    for (const table of [categories, niveaux, roles, libelles.natures]) {
      for (const en of Object.values(table)) expect(en.trim()).not.toBe("");
    }
  });

  it("names the ten layers of the method, in French as the method does", () => {
    expect(libelles.couches.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const c of libelles.couches) {
      expect(methode).toContain(`### Couche ${c.numero} — ${c.fr}\n`);
      expect(c.en.trim()).not.toBe("");
    }
  });
});
