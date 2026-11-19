// Tests of the collection pipeline v0. Only documentation values: addresses of RFC 5737 (192.0.2.0/24,
// 198.51.100.0/24, 203.0.113.0/24) and RFC 3849 (2001:db8::/32), AS numbers of RFC 5398 (64496-64511) and names under
// `.example` (RFC 2606). The resolver is simulated: no network.
import { describe, expect, it } from "vitest";
import { detecterCdn, type ReferentielCdn } from "./cdn";
import { chiffreTitre, classer, type Contexte } from "./classement";
import { observer } from "./dns";
import { domaineEnregistre, nomWeb, raisonExclusion } from "./noms";
import { adresseEnEntier, coucheReseau, TableIpToAsn, TableRis } from "./reseau";
import { readFileSync } from "node:fs";
import {
  categorie,
  chaineDepuisAs,
  MERE_INCONNUE,
  niveauSources,
  type ReferentielAs,
  type ReferentielSocietes,
  validerReferentiels,
} from "./societes";
import type { DnsAnswer, DnsClient, RecordType } from "./types";

class ResolveurSimule implements DnsClient {
  readonly id = "simulé";
  constructor(private readonly zone: Record<string, Partial<Record<RecordType, string[]>>>) {}
  async query(name: string, type: RecordType): Promise<DnsAnswer> {
    const entree = this.zone[name];
    if (entree === undefined) return { status: "NXDOMAIN", values: [] };
    // Like a real resolver, A, AAAA and NS follow an alias.
    if (type !== "CNAME" && entree.CNAME?.[0] !== undefined) return this.query(entree.CNAME[0], type);
    const values = entree[type] ?? [];
    return values.length > 0 ? { status: "NOERROR", values } : { status: "NODATA", values: [] };
  }
}

const IPTOASN = [
  "192.0.2.0\t192.0.2.255\t64496\tFR\tEXEMPLE-HEBERGEUR",
  "198.51.100.0\t198.51.100.255\t64500\tUS\tEXEMPLE-CDN",
  "203.0.113.0\t203.0.113.255\t64501\tUS\tEXEMPLE-CLOUD",
  "2001:db8::\t2001:db8:ffff:ffff:ffff:ffff:ffff:ffff\t64496\tFR\tEXEMPLE-HEBERGEUR",
].join("\n");
const RIS = [
  "64496\t192.0.2.0/24\t300",
  "64500\t198.51.100.0/24\t250",
  "64502\t203.0.113.0/24\t200",
  "64496\t2001:db8::/32\t150",
  "64499\t0.0.0.0/0\t4",
].join("\n");

const source = (hote: string) => ({ titre: hote, url: `https://${hote}/fiche`, lu_le: "2026-11-19" });
const deux = [source("registre.example"), source("societes.example")];
const une = [source("registre.example")];
const societes: ReferentielSocietes = {
  version: "test",
  societes: {
    "hebergeur-fr": { nom: "Hébergeur Exemple SAS", pays: "FR", mere: null, sources: deux, sources_mere: deux },
    "cdn-filiale-nl": { nom: "CDN Exemple B.V.", pays: "NL", mere: "cdn-us", sources: deux, sources_mere: deux },
    "cdn-us": { nom: "CDN Exemple, Inc.", pays: "US", mere: null, sources: deux, sources_mere: deux },
    "cloud-us": { nom: "Cloud Exemple, Inc.", pays: "US", mere: null, sources: une, sources_mere: une },
    "filiale-inconnue": {
      nom: "Filiale Exemple SARL",
      pays: "FR",
      mere: MERE_INCONNUE,
      sources: deux,
      sources_mere: [],
    },
  },
};
const tableAs: ReferentielAs = {
  version: "test",
  as: {
    "64496": { societe: "hebergeur-fr", titulaire_registre: "EXEMPLE-HEBERGEUR", sources: deux },
    "64500": { societe: "cdn-filiale-nl", titulaire_registre: "EXEMPLE-CDN", sources: deux },
    "64501": { societe: "cloud-us", titulaire_registre: "EXEMPLE-CLOUD", sources: une },
    "64502": { societe: "filiale-inconnue", titulaire_registre: "EXEMPLE-FILIALE", sources: deux },
  },
};
const cdn: ReferentielCdn = {
  version: "test",
  fournisseurs: [
    {
      id: "cdn-exemple",
      nom: "CDN Exemple",
      societe: "cdn-filiale-nl",
      suffixes: [{ suffixe: ".cdn.example", source: "https://cdn.example/doc", lu_le: "2026-11-19" }],
      as: [{ numero: 64500, suffit_seul: true, source: "https://cdn.example/doc", lu_le: "2026-11-19" }],
    },
  ],
};
const contexte: Contexte = {
  iptoasn: new TableIpToAsn(IPTOASN),
  ris: new TableRis([RIS]),
  cdn,
  plages: {},
  tableAs,
  societes,
};

describe("noms", () => {
  it("excludes internal and technical names, keeps public ones", () => {
    expect(raisonExclusion("acl-back.rie.gouv.fr")).toBe("zone interne");
    expect(raisonExclusion("preprod-site.ministere.gouv.fr")).toBe("environnement");
    expect(raisonExclusion("app.recette.service.example")).toBe("environnement");
    expect(raisonExclusion("grafana2.ministere.gouv.fr")).toBe("outil technique");
    expect(raisonExclusion("www.ministere.gouv.fr")).toBeNull();
    expect(raisonExclusion("labonnealternance.apprentissage.beta.gouv.fr")).toBeNull();
    expect(raisonExclusion("developpement-durable.gouv.fr")).toBeNull();
  });
  it("finds the registrable domain and the web name", () => {
    expect(domaineEnregistre("www.impots.gouv.fr")).toBe("impots.gouv.fr");
    expect(domaineEnregistre("www.ville.example")).toBe("ville.example");
    expect(nomWeb("ville.example", new Set(["www.ville.example"]))).toBe("www.ville.example");
    expect(nomWeb("ville.example", new Set(["ville.example"]))).toBe("ville.example");
  });
});

describe("réseau", () => {
  it("reads IPv4 and IPv6 addresses", () => {
    expect(adresseEnEntier("192.0.2.1").valeur).toBe(3221225985n);
    expect(adresseEnEntier("2001:db8::1")).toEqual({ famille: 6, valeur: 0x20010db8000000000000000000000001n });
  });
  it("is « confirmé » when IPtoASN and RIS agree, « non déterminé » when they disagree", () => {
    expect(coucheReseau("192.0.2.10", contexte.iptoasn, contexte.ris).niveau).toBe("confirmé");
    expect(coucheReseau("2001:db8::5", contexte.iptoasn, contexte.ris).niveau).toBe("confirmé");
    const desaccord = coucheReseau("203.0.113.7", contexte.iptoasn, contexte.ris);
    expect(desaccord.niveau).toBe("non déterminé");
    expect(desaccord.asns.sort()).toEqual([64501, 64502]);
  });
  it("ignores RIS prefixes seen by fewer than 5 peers", () => {
    expect(contexte.ris.chercher("100.64.0.1")).toBeNull();
  });
});

describe("sociétés et pays", () => {
  it("follows the chain to the ultimate parent and classifies its country", () => {
    const chaine = chaineDepuisAs(64500, tableAs, societes);
    expect(chaine.societe?.nom).toBe("CDN Exemple B.V.");
    expect(chaine.mere?.nom).toBe("CDN Exemple, Inc.");
    expect(chaine.categorie).toBe("hors d'Europe");
    expect(chaine.niveau).toBe("confirmé");
    expect(chaineDepuisAs(64501, tableAs, societes).niveau).toBe("probable");
    expect(chaineDepuisAs(64511, tableAs, societes).categorie).toBe("non déterminé");
  });
  it("counts two pages of the same producer as one source", () => {
    expect(
      niveauSources([
        source("registre.example"),
        { ...source("registre.example"), url: "https://registre.example/autre" },
      ]),
    ).toBe("probable");
    expect(niveauSources(deux)).toBe("confirmé");
    expect(niveauSources([])).toBe("non déterminé");
  });
  it("stops at « non déterminé » when the parent is unknown, never guessing a country", () => {
    const chaine = chaineDepuisAs(64502, tableAs, societes);
    expect(chaine.societe?.pays).toBe("FR");
    expect(chaine.mere).toBeNull();
    expect(chaine.categorie).toBe("non déterminé");
    expect(chaine.niveau).toBe("non déterminé");
  });
  it("validates the hand-kept tables, and the tables of the repository are valid", () => {
    expect(validerReferentiels(cdn, tableAs, societes)).toEqual([]);
    const casse: ReferentielAs = {
      version: "test",
      as: {
        "64510": {
          societe: "absente",
          titulaire_registre: "X",
          sources: [{ titre: "x", url: "http://x.example/", lu_le: "hier" }],
        },
      },
    };
    const erreurs = validerReferentiels(
      {
        version: "test",
        fournisseurs: [
          {
            ...cdn.fournisseurs[0]!,
            suffixes: [{ suffixe: "cdn.example", source: "https://cdn.example/doc", lu_le: "2026-11-19" }],
          },
        ],
      },
      casse,
      societes,
    );
    expect(erreurs).toEqual([
      "AS 64510 : société absente absente de la table",
      "AS 64510, source 1 : adresse absente ou non https",
      "AS 64510, source 1 : date de lecture absente",
      "CDN cdn-exemple : le suffixe cdn.example doit commencer par un point",
    ]);
    const lire = (nom: string) =>
      JSON.parse(readFileSync(new URL(`../referentiels/${nom}`, import.meta.url), "utf8")) as unknown;
    expect(
      validerReferentiels(
        lire("cdn.json") as ReferentielCdn,
        lire("as-societes.json") as ReferentielAs,
        lire("societes.json") as ReferentielSocietes,
      ),
    ).toEqual([]);
  });
  it("sorts countries into the five categories", () => {
    expect([categorie("FR"), categorie("DE"), categorie("CH"), categorie("US"), categorie(null)]).toEqual([
      "France",
      "UE hors France",
      "Europe hors UE",
      "hors d'Europe",
      "non déterminé",
    ]);
  });
});

describe("CDN", () => {
  it("recognises a CDN by its documented CNAME, then by a dedicated AS", () => {
    expect(detecterCdn(["site.cdn.example"], [], [], cdn)?.methode).toBe("cname");
    expect(detecterCdn([], ["198.51.100.4"], [64500], cdn)?.niveau).toBe("probable");
    expect(
      detecterCdn([], ["198.51.100.4"], [64500], cdn, {
        "cdn-exemple": { plages: ["198.51.100.0/24"], source: "x", date: "2026-11-19" },
      })?.methode,
    ).toBe("plage");
    expect(detecterCdn([], ["192.0.2.1"], [64496], cdn)).toBeNull();
  });
});

describe("observation et classement", () => {
  const zone = {
    "www.ministere.example": { CNAME: ["ministere.example"] },
    "ministere.example": { A: ["192.0.2.10"], AAAA: ["2001:db8::10"], NS: ["ns1.ministere.example"] },
    "ns1.ministere.example": { A: ["192.0.2.53"] },
    "www.agence.example": { CNAME: ["agence.cdn.example"] },
    "agence.cdn.example": { A: ["198.51.100.20"] },
    "agence.example": { NS: ["ns1.agence.example"] },
    "ns1.agence.example": { A: ["192.0.2.54"] },
  };
  const resolveur = new ResolveurSimule(zone);
  const fixe = () => new Date("2026-11-19T03:17:00Z");

  it("observes the CNAME chain, the addresses and the zone of a name", async () => {
    const o = await observer("www.ministere.example", resolveur, fixe);
    expect(o.chaineCname).toEqual(["ministere.example"]);
    expect(o.a).toEqual(["192.0.2.10"]);
    expect(o.aaaa).toEqual(["2001:db8::10"]);
    expect(o.zone).toBe("ministere.example");
    expect(o.adressesNs).toEqual({ "ns1.ministere.example": "192.0.2.53" });
    expect(o.statut).toBe("NOERROR");
    expect(o.heure).toBe("2026-11-19T03:17:00.000Z");
  });

  it("never confuses a missing name with a failure", async () => {
    expect((await observer("absent.example", resolveur, fixe)).statut).toBe("NXDOMAIN");
  });

  it("classifies a French host as not depending on a non-EU company, confirmed by the control resolver", async () => {
    const o = await observer("www.ministere.example", resolveur, fixe);
    const c = classer(o, o, "État", contexte);
    expect(c.horsUE).toBe(false);
    expect(c.categorie).toBe("France");
    expect(c.niveau).toBe("confirmé");
    expect(c.hebergePar).toBe("voir les sociétés");
  });

  it("classifies a site behind a CDN by the CDN's ultimate parent; the origin host is not observable", async () => {
    const o = await observer("www.agence.example", resolveur, fixe);
    const c = classer(o, o, "État", contexte);
    expect(c.cdn?.id).toBe("cdn-exemple");
    expect(c.hebergePar).toBe("non observable");
    expect(c.horsUE).toBe(true);
    expect(c.niveau).toBe("confirmé");
    // Without the control resolver, the address layer is at best « probable ».
    expect(classer(o, null, "État", contexte).niveau).toBe("probable");
  });

  it("reads the headline figure as « au moins X % », with the probable and undetermined shares beside it", async () => {
    const a = classer(await observer("www.ministere.example", resolveur, fixe), null, "État", contexte);
    const b = classer(
      await observer("www.agence.example", resolveur, fixe),
      await observer("www.agence.example", resolveur, fixe),
      "État",
      contexte,
    );
    const hors = classer(await observer("www.agence.example", resolveur, fixe), null, "hors État", contexte);
    const chiffre = chiffreTitre([a, b, hors]);
    expect(chiffre.domaines).toBe(2);
    expect(chiffre.horsUEConfirme).toBe(1);
    expect(chiffre.auMoinsPourcent).toBe(50);
  });
});
