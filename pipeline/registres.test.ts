// Tests of the registries' bulk files: documentation AS numbers only (RFC 5398: 64496-64511), made-up objects.
import { describe, expect, it } from "vitest";
import { paysDesAs, titulairesRipe } from "./registres";

describe("the registries' bulk files", () => {
  it("gives each AS its country of registration, ranges included", () => {
    const fichier = [
      "2|ripencc|20261119|1|19700101|20261119|+0100",
      "ripencc|*|asn|*|1|summary",
      "ripencc|FR|asn|64496|2|20000101|allocated|abc",
      "ripencc|NL|asn|64500|1|20000101|assigned|def",
      "ripencc|FR|ipv4|192.0.2.0|256|20000101|allocated|abc",
    ].join("\n");
    const pays = paysDesAs([fichier]);
    expect(pays.get(64496)).toBe("FR");
    expect(pays.get(64497)).toBe("FR");
    expect(pays.get(64500)).toBe("NL");
    expect(pays.has(64498)).toBe(false);
  });

  it("keeps only the as-name and the holder's name and country, for the observed AS numbers", () => {
    const autNum =
      "aut-num: AS64496\nas-name: EXEMPLE-AS\norg: ORG-EX1-RIPE\nadmin-c: PERSONNE-RIPE\n\naut-num: AS64499\nas-name: AUTRE\n";
    const organisations =
      "organisation: ORG-EX1-RIPE\norg-name: Hébergeur Exemple SAS\ncountry: fr\naddress: 1 rue Exemple\ne-mail: noc@hebergeur.example\nphone: +33 1 00 00 00 00\n";
    const titulaires = titulairesRipe(autNum, organisations, new Set([64496]));
    expect([...titulaires.values()]).toEqual([
      { asn: 64496, asName: "EXEMPLE-AS", org: "ORG-EX1-RIPE", orgName: "Hébergeur Exemple SAS", pays: "FR" },
    ]);
    expect(JSON.stringify([...titulaires.values()])).not.toMatch(/rue|noc@|\+33|PERSONNE/);
  });
});
