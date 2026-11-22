// Tests of the SecNumCloud survey (brief C.4): the qualified services of the ANSSI's catalogue, dated, with the
// mandatory sentence of the method, and nothing that is only « being qualified »; a service linked to a company of the
// referential only by its decision of qualification, read, and the Sirene register (C.4).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import secnumcloud from "@/referentiels/secnumcloud.json";
import societes from "@/referentiels/societes.json";

const registre = readFileSync(new URL("../docs/sources.md", import.meta.url), "utf8");
const methode = readFileSync(new URL("../docs/methode.md", import.meta.url), "utf8");
const TYPES = new Set(["SaaS", "PaaS", "CaaS", "IaaS"]);
const jour = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** The Luhn key every SIREN satisfies: a number that fails it is not a SIREN. */
function luhn(nombre: string): boolean {
  let somme = 0;
  [...nombre].reverse().forEach((c, i) => {
    const d = Number(c) * (i % 2 === 1 ? 2 : 1);
    somme += d > 9 ? d - 9 : d;
  });
  return /^\d{9}$/.test(nombre) && somme % 10 === 0;
}

/** The Sirene source of a company of the referential (« Sirene : NAME, …, SIREN n, siège à … »), or "". */
const sireneDe = (cle: string): string =>
  (societes.societes as Record<string, { sources: { titre: string }[] }>)[cle]?.sources.find((s) =>
    s.titre.startsWith("Sirene :"),
  )?.titre ?? "";

describe("the SecNumCloud survey (referentiels/secnumcloud.json)", () => {
  it("comes from card 40 of the registry, retained as a dated manual survey", () => {
    expect(secnumcloud.source.fiche).toBe(40);
    expect(registre).toMatch(/^### 40\. Catalogue des services qualifiés SecNumCloud de l'ANSSI$/m);
    const fiche40 = registre.slice(registre.indexOf("### 40. "), registre.indexOf("\n### 41. "));
    expect(fiche40).toContain("- **Décision : retenue (relevé manuel daté).**");
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
    }
  });

  it("links a service to a company only by its decision, read, and the Sirene register", () => {
    expect(secnumcloud.rapprochement.decisionsLues.length).toBeGreaterThan(0);
    const cles = Object.keys(societes.societes);
    let lies = 0;
    for (const s of secnumcloud.services) {
      const t = s.titulaire;
      // Nothing linked without its decision read.
      if (t === null) {
        expect(s.societe, s.decision).toBeNull();
        continue;
      }
      expect(secnumcloud.rapprochement.decisionsLues).toContain(s.decision);
      if (s.societe === null) {
        // A decision that names a company outside the referential links none: a group never inherits a subsidiary's.
        for (const cle of cles) expect(sireneDe(cle), cle).not.toContain(`SIREN ${t.siren}`);
        continue;
      }
      lies += 1;
      expect(cles).toContain(s.societe);
      const sirene = sireneDe(s.societe);
      if (luhn(t.siren)) {
        expect(sirene, s.decision).toContain(`SIREN ${t.siren}`);
      } else {
        expect(sirene.startsWith(`Sirene : ${t.raisonSociale},`), s.decision).toBe(true);
        expect(sirene, s.decision).toContain(t.ville);
      }
    }
    expect(lies).toBe(6);
    // A decision is read or not found, never both; a decision read is always recopied (its service's « titulaire »).
    const { decisionsLues, decisionsIntrouvables } = secnumcloud.rapprochement;
    expect(decisionsLues.filter((d) => decisionsIntrouvables.includes(d))).toEqual([]);
    for (const d of decisionsLues) {
      expect(secnumcloud.services.find((s) => s.decision === d)?.titulaire ?? null, d).not.toBeNull();
    }
    // The rule is the method's (layer 8): a group never inherits a subsidiary's qualification.
    const regle = "Un groupe n'hérite jamais de la qualification d'une filiale, ni l'inverse.";
    expect(secnumcloud.rapprochement.regle).toContain(regle);
    expect(methode).toContain(regle);
    expect(luhn("790173066")).toBe(true);
    expect(luhn("790163066")).toBe(false);
  });
});
