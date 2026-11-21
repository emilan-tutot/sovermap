// Tests of the SecNumCloud survey (brief C.4): the qualified services of the ANSSI's catalogue, dated, with the
// mandatory sentence of the method, and nothing that is only « being qualified ».
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import secnumcloud from "@/referentiels/secnumcloud.json";

const registre = readFileSync(new URL("../docs/sources.md", import.meta.url), "utf8");
const methode = readFileSync(new URL("../docs/methode.md", import.meta.url), "utf8");
const TYPES = new Set(["SaaS", "PaaS", "CaaS", "IaaS"]);
const jour = (date: string) => Date.parse(`${date}T00:00:00Z`);

describe("the SecNumCloud survey (referentiels/secnumcloud.json)", () => {
  it("comes from card 40 of the registry, retained as a dated manual survey", () => {
    expect(secnumcloud.source.fiche).toBe(40);
    expect(registre).toMatch(/^### 40\. Catalogue des services qualifiés SecNumCloud de l'ANSSI$/m);
    expect(registre).toContain("- **Décision : retenue (relevé manuel daté).**");
    expect(secnumcloud.source.miseAJour).toBe(secnumcloud.version);
    expect(Number.isNaN(jour(secnumcloud.version))).toBe(false);
  });

  it("carries the method's mandatory sentence, word for word", () => {
    expect(methode).toContain(`« ${secnumcloud.phrase} »`);
  });

  it("gives each qualified service its supplier, types, dates and decision", () => {
    const services = secnumcloud.services;
    expect(services).toHaveLength(30);
    expect(new Set(services.map((s) => s.decision)).size).toBe(30);
    for (const s of services) {
      expect(s.fournisseur.trim()).not.toBe("");
      expect(s.service.trim()).not.toBe("");
      expect(s.types.length).toBeGreaterThan(0);
      for (const type of s.types) expect(TYPES.has(type)).toBe(true);
      expect(s.decision).toMatch(/^\d+$/);
      expect(jour(s.debut)).toBeLessThan(jour(s.fin));
      // Every service was qualified on the day of the catalogue.
      expect(jour(s.debut)).toBeLessThanOrEqual(jour(secnumcloud.version));
      expect(jour(s.fin)).toBeGreaterThanOrEqual(jour(secnumcloud.version));
      // No supplier is matched with a company before C.1 gives two sources for it.
      expect(s.societe).toBeNull();
    }
  });
});
