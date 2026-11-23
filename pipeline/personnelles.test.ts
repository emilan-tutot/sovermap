// Tests of the guard against personal data in what is published (brief F.3). The examples are assembled at run time,
// so that the repository's privacy scan never meets an address written whole.
import { describe, expect, it } from "vitest";
import {
  ajouterEcarts,
  donneesPersonnelles,
  type Ecarts,
  garderTexteLibre,
  masquer,
  motifsPersonnels,
} from "./personnelles";

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

describe("the free text kept from a source (point 13, P13)", () => {
  it("finds an e-mail address, a phone and the form of a person's name", () => {
    expect(motifsPersonnels(`Service exemple, écrire à ${adresse}`)).toEqual(["adresse e-mail"]);
    expect(motifsPersonnels("Accueil : 01 23 45 67 89")).toEqual(["téléphone"]);
    expect(motifsPersonnels("Accueil 0123456789")).toEqual(["téléphone"]);
    expect(motifsPersonnels("Standard +33 1 23 45 67 89")).toEqual(["téléphone"]);
    expect(motifsPersonnels("Standard 0033 (0)1 23 45 67 89")).toEqual(["téléphone"]);
    expect(motifsPersonnels("Secrétariat de Mme Exemple")).toEqual(["nom de personne"]);
    expect(motifsPersonnels("Cabinet de M. Exemple")).toEqual(["nom de personne"]);
    expect(motifsPersonnels("Bureau de Monsieur Exemple, tél. 01.23.45.67.89")).toEqual([
      "téléphone",
      "nom de personne",
    ]);
  });

  it("lets through the names of bodies, a code, a checksum, a SIREN, a year or a postal code", () => {
    for (const texte of [
      "Ministère de l’Exemple",
      "M. le maire de la commune",
      "Lycée Madame de Staël",
      "Collège Mme de Sévigné",
      "Lycée Marie Curie",
      "DMME",
      "Mairie de Mme-sur-Mer",
      "SIREN 123456789",
      "SIRET 12345678901234",
      "0612345678abcdef0612345678abcdef",
      "Loi du 11 février 2005, 75001 Paris",
      "AS64496 EXEMPLE-HEBERGEUR",
    ]) {
      expect(motifsPersonnels(texte), texte).toEqual([]);
    }
  });

  it("leaves out a text that holds one, counts it by source and kind, and keeps the others whole", () => {
    const ecarts: Ecarts = {};
    expect(garderTexteLibre("Direction de l’exemple", "dila", ecarts)).toBe("Direction de l’exemple");
    expect(garderTexteLibre("Secrétariat de Mme Exemple", "dila", ecarts)).toBeNull();
    expect(garderTexteLibre("Accueil 01 23 45 67 89", "dila", ecarts)).toBeNull();
    expect(garderTexteLibre(null, "dila", ecarts)).toBeNull();
    expect(garderTexteLibre(`Contact ${adresse}`, "ripe", ecarts)).toBeNull();
    expect(ecarts).toEqual({ dila: { "nom de personne": 1, téléphone: 1 }, ripe: { "adresse e-mail": 1 } });
    expect(ajouterEcarts(ecarts, { dila: { téléphone: 2 }, iptoasn: { téléphone: 1 } })).toEqual({
      dila: { "nom de personne": 1, téléphone: 3 },
      ripe: { "adresse e-mail": 1 },
      iptoasn: { téléphone: 1 },
    });
  });
});
