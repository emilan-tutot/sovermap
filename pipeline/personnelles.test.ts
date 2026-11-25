// Tests of the guard against personal data in what is published (brief F.3). The examples are assembled at run time,
// so that the repository's privacy scan never meets an address written whole.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ajouterEcarts,
  donneesPersonnelles,
  type Ecarts,
  garderTexteLibre,
  masquer,
  motifsPersonnels,
  textesAs,
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

  it("finds each spelling of a civility or a title, a particle, an accented capital, a surname in Le or La", () => {
    for (const texte of [
      "Bureau de Madame Exemple",
      "Bureau de Mlle Exemple",
      "Bureau de Mlles Exemple",
      "Bureau de MM. Exemple et Exemple",
      "Bureau de Mmes Exemple",
      "Bureau de Messieurs Exemple",
      "Bureau de Mesdames Exemple",
      "Bureau de Mademoiselle Exemple",
      "BUREAU DE MME EXEMPLE",
      "BUREAU DE MMES EXEMPLE",
      "BUREAU DE MLLE EXEMPLE",
      "BUREAU DE MLLES EXEMPLE",
      "BUREAU DE MONSIEUR EXEMPLE",
      "BUREAU DE MESSIEURS EXEMPLE",
      "BUREAU DE MADAME EXEMPLE",
      "BUREAU DE MESDAMES EXEMPLE",
      "BUREAU DE MADEMOISELLE EXEMPLE",
      "Bureau de Mme. Exemple",
      "Cabinet de Mme de Exemple",
      "Cabinet de M. du Exemple",
      "Cabinet de Mme des Exemple",
      "Cabinet de M. d'Exemple",
      "Cabinet de M. d’Exemple",
      "Secrétariat de Mme Élise Exemple",
      // A surname in Le or La is a surname (the second review of PR 19), and « M. Le Maire » may be one.
      "Secrétariat de M. Le Exemple",
      "Cabinet de Mme La Exemple",
      "Cabinet de M. Le Maire",
      // A doctor's or a professor's title, when no company's legal form is beside it.
      "Cabinet du Dr Exemple",
      "Cabinet du Pr. Exemple",
      "Docteur Exemple",
      "Professeur Exemple",
      "DOCTEUR EXEMPLE",
      "PROFESSEUR EXEMPLE",
      // Initials before a name, without a company's legal form, often name a person (the registries' use).
      "J.A.M. Exemple",
      "C.N.A.M. Exemple",
      // A person named beside a company: a legal form excuses initials and titles only.
      "Cabinet de M. Exemple, Exemple SAS",
      // A historic name after a civility is left out too (the body keeps its acronym).
      "Lycée Madame de Staël",
      "Collège Mme de Sévigné",
    ]) {
      expect(motifsPersonnels(texte), texte).toEqual(["nom de personne"]);
    }
  });

  it("finds, in a registry's text only, how a registry writes a natural person who trades", () => {
    for (const texte of [
      "EXEMPLE Jean EI",
      "EXEMPLE Jean EIRL",
      "EXEMPLE Jean E.I.",
      "EXEMPLE Jean E.I.R.L.",
      "EXEMPLE Jean (EI)",
      "EXEMPLE Jean (EI) Exemple Hébergement",
      "EXEMPLE Jean EI.",
      "EI EXEMPLE Jean",
      "Exemple Jean e.K.",
      "Jean Exemple trading as Exemple Hosting",
      "Jean Exemple t/a Exemple Hosting",
      "Jean Exemple d/b/a Exemple Hosting",
      "Jean Exemple doing business as Exemple",
      "Individual entrepreneur Exemple",
      "Private entrepreneur Exemple",
      "Exemple Jean, entrepreneur individuel",
      "Exemple Jean, entrepreneur individuel",
      "Exemple, entreprise individuelle",
      "Exemple auto entrepreneur",
      "Exemple auto-entrepreneur",
      "Exemple micro-entrepreneur",
      "Exemple sole trader",
      "Exemple sole proprietor",
      "Private person",
      "Physical person Exemple",
    ]) {
      expect(motifsPersonnels(texte, true), texte).toEqual(["nom de personne"]);
    }
    // In a directory, these words name a subject (the second review of PR 19).
    expect(motifsPersonnels("Bureau de l'entreprise individuelle")).toEqual([]);
    expect(motifsPersonnels("Pôle auto-entrepreneur")).toEqual([]);
    // A company that trades under another name, a company's title or initials, a network's name.
    for (const texte of [
      "Exemple Ltd trading as Exemple Networks",
      "Exemple S.A. trading as Exemple",
      "EXEMPLE SASU, trading as Exemple",
      "EI-EXEMPLE TELECOM",
      "Dr. Exemple GmbH",
      "J.M. Exemple SE",
      "AS64496 EXEMPLE-HEBERGEUR",
    ]) {
      expect(motifsPersonnels(texte, true), texte).toEqual([]);
    }
  });

  it("finds an address disguised or spaced, a mailto: or tel: link alone, and the phone's other forms", () => {
    for (const texte of [
      ["Écrire à accueil", "[at]", "exemple.example"].join(" "),
      ["Écrire à accueil", "(at)", "exemple.example"].join(" "),
      ["Écrire à accueil", "(arobase)", "exemple.example"].join(" "),
      ["Écrire à accueil", "[arobase]", "exemple.example"].join(" "),
      ["Écrire à accueil", arobase, "exemple.example"].join(" "),
      ["Écrire à accueil", "", arobase, "", "exemple.example"].join(" "),
      "Écrire à mailto:accueil",
    ]) {
      expect(motifsPersonnels(texte), texte).toEqual(["adresse e-mail"]);
    }
    for (const texte of [
      "Appeler tel:+331",
      "Standard (+33) 1 23 45 67 89",
      "Accueil 01  23 45 67 89",
      "Accueil 01/23/45/67/89",
      "Accueil 09 12 34 56 78",
    ]) {
      expect(motifsPersonnels(texte), texte).toEqual(["téléphone"]);
    }
  });

  it("lets through the names of bodies and functions, a code, a checksum, a SIREN, a year or a postal code", () => {
    for (const texte of [
      "Ministère de l’Exemple",
      "M. le maire de la commune",
      "Monsieur Le Préfet de région",
      "MONSIEUR LE PREFET",
      "Madame La Directrice",
      "Monsieur l’Inspecteur général",
      "Lycée Marie Curie",
      "DMME",
      "ADM. Paris",
      "Mairie de Mme-sur-Mer",
      // Initials or a title beside a company's legal form (« J.M. Voith SE » was left out before the review of PR 19).
      "J.M. Exemple SE",
      "S.T.M. SRL",
      "Dr. Exemple GmbH",
      // An at sign in a company's name; an address cut short is no address (each text is controlled before its cut).
      `MEDI${arobase}EXEMPLE SAS`,
      `Exemple Net${arobase}Home`,
      `Écrire à accueil${arobase}exem`,
      "SIREN 123456789",
      "SIRET 12345678901234",
      // A phone's digits inside a longer number are never a phone (« 0201100044 » here).
      "SIRET 99000201100044",
      "0612345678abcdef0612345678abcdef",
      "Loi du 11 février 2005, 75001 Paris",
      "Arrêté du 01/12/2026",
      "AS64496 EXEMPLE-HEBERGEUR",
    ]) {
      expect(motifsPersonnels(texte), texte).toEqual([]);
    }
  });

  it("finds none in the texts written by hand in referentiels/ (a company's name and control, published every day; an AS's declared holder, in the public repository)", () => {
    const societes = (
      JSON.parse(readFileSync("referentiels/societes.json", "utf8")) as {
        societes: Record<string, { nom: string; controle?: string }>;
      }
    ).societes;
    const as = (
      JSON.parse(readFileSync("referentiels/as-societes.json", "utf8")) as {
        as: Record<string, { titulaire_registre: string }>;
      }
    ).as;
    const textes = [
      ...Object.values(societes).flatMap((s) => [s.nom, ...(s.controle === undefined ? [] : [s.controle])]),
      ...Object.values(as).map((a) => a.titulaire_registre),
    ];
    expect(textes.length).toBeGreaterThan(100);
    for (const texte of textes) expect(motifsPersonnels(texte, true), texte).toEqual([]);
  });

  it("publishes an AS's description and holder only for an AS of the referentials, after the control", () => {
    const ecarts: Ecarts = {};
    expect(textesAs(false, "Hébergeur Exemple", "Hébergeur Exemple SAS", ecarts)).toEqual({
      description: null,
      titulaire: null,
    });
    expect(ecarts).toEqual({});
    expect(textesAs(true, "Hébergeur Exemple", "Hébergeur Exemple SAS", ecarts)).toEqual({
      description: "Hébergeur Exemple",
      titulaire: "Hébergeur Exemple SAS",
    });
    expect(textesAs(true, "Hébergeur Exemple, 01 23 45 67 89", "EXEMPLE Jean EI", ecarts)).toEqual({
      description: null,
      titulaire: null,
    });
    expect(ecarts).toEqual({ iptoasn: { téléphone: 1 }, ripe: { "nom de personne": 1 } });
    // The holder's name is controlled whole, then cut to 200: an address across the 200th character is seen.
    const long = `Hébergeur ${"x".repeat(178)} ${["accueil", "exemple.example"].join(arobase)}`;
    expect(long.indexOf(arobase)).toBeLessThan(200);
    expect(long.length).toBeGreaterThan(200);
    expect(textesAs(true, null, long, ecarts).titulaire).toBeNull();
    expect(ecarts["ripe"]).toEqual({ "nom de personne": 1, "adresse e-mail": 1 });
    // A long name with no personal datum is cut to 200 characters; a description to 2,000.
    expect(textesAs(true, "d".repeat(3000), `Hébergeur ${"x".repeat(300)}`, {})).toEqual({
      description: "d".repeat(2000),
      titulaire: `Hébergeur ${"x".repeat(190)}`,
    });
  });

  it("leaves out a text that holds one, counts it by source and kind, and keeps the others whole", () => {
    const ecarts: Ecarts = {};
    expect(garderTexteLibre("Direction de l’exemple", "dila", ecarts)).toBe("Direction de l’exemple");
    expect(garderTexteLibre("Secrétariat de Mme Exemple", "dila", ecarts)).toBeNull();
    expect(garderTexteLibre("Accueil 01 23 45 67 89", "dila", ecarts)).toBeNull();
    expect(garderTexteLibre(null, "dila", ecarts)).toBeNull();
    expect(garderTexteLibre(`Contact ${adresse}`, "ripe", ecarts)).toBeNull();
    expect(ecarts).toEqual({ dila: { "nom de personne": 1, téléphone: 1 }, ripe: { "adresse e-mail": 1 } });
    // A text with two kinds counts each.
    expect(garderTexteLibre("Bureau de Mme Exemple, 01 23 45 67 89", "guichets", ecarts)).toBeNull();
    expect(ecarts["guichets"]).toEqual({ téléphone: 1, "nom de personne": 1 });
    delete ecarts["guichets"];
    expect(ajouterEcarts(ecarts, { dila: { téléphone: 2 }, iptoasn: { téléphone: 1 } })).toEqual({
      dila: { "nom de personne": 1, téléphone: 3 },
      ripe: { "adresse e-mail": 1 },
      iptoasn: { téléphone: 1 },
    });
  });
});
