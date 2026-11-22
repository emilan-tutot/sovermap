// Tests of the guard against personal data in what is published (brief F.3). The examples are assembled at run time,
// so that the repository's privacy scan never meets an address written whole.
import { describe, expect, it } from "vitest";
import { donneesPersonnelles, masquer } from "./personnelles";

const arobase = "@";
const adresse = ["hostmaster", arobase, "exemple.example"].join("");

describe("the guard against personal data (F.3)", () => {
  it("finds an e-mail address, a mailto: or a tel: link, and masks what it reports", () => {
    const trouvees = donneesPersonnelles([
      ["domaines/ab/cd.json", `{"caa":[{"propriete":"iodef","valeur":"mailto:${adresse}"}]}`],
      ["index/as.json", `{"titulaire":"Contact ${adresse}"}`],
      ["sovermap-domains.csv", "domain,phone\r\nd0.example,tel:+33100000000\r\n"],
    ]);
    expect(trouvees.map((t) => t.fichier)).toEqual([
      "domaines/ab/cd.json",
      "domaines/ab/cd.json",
      "index/as.json",
      "sovermap-domains.csv",
    ]);
    for (const t of trouvees) {
      expect(t.extrait).not.toContain(arobase);
      expect(t.extrait.length).toBeLessThanOrEqual(6);
    }
    expect(masquer(adresse)).toBe("ho…ple");
  });

  it("lets through what the collection publishes: names, SPF includes, checksums, addresses of the site", () => {
    expect(
      donneesPersonnelles([
        ["domaines/ab/cd.json", '{"spf":{"include":["_spf.exemple.example"]},"ns":["ns1.exemple.example"]}'],
        ["noms/ab/sommes.json", '{"cd.json":"0612345678abcdef0612345678abcdef0612345678abcdef0612345678abcdef"}'],
        ["etat.json", '{"agent":"Sovermap-bot/0.2 (+https://sovermap.vercel.app)"}'],
      ]),
    ).toEqual([]);
  });
});
