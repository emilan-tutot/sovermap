// Tests of the day's records, from a whole made-up collection: simulated resolver, made-up context, documentation
// names, addresses and AS numbers only (RFC 2606, RFC 5737, RFC 5398).
import { describe, expect, it } from "vitest";
import { collecter, POLITESSE } from "./collecte";
import { contexteEssai } from "./essai-contexte";
import { construireEtat } from "./etat-du-jour";
import type { ListeReference } from "./perimetre";
import { generateur } from "./politesse";
import { fragments } from "./publication";
import { ResolveurSimule } from "./resolveur-simule";
import { NOM, schemaDe, valider } from "./schemas";

const zoneDe = (nom: string) => nom.split(".").slice(-2).join(".");

const liste: ListeReference = {
  noms: new Map([
    [
      "www.ministere.example",
      {
        nom: "www.ministere.example",
        domaine: "ministere.example",
        provenances: ["dinum:2026-11-19"],
        types: ["Gouvernement"],
        organismes: [],
      },
    ],
  ]),
  domaines: new Map([
    [
      "ministere.example",
      {
        domaine: "ministere.example",
        noms: ["www.ministere.example"],
        nomWeb: "www.ministere.example",
        perimetre: "État",
        raisons: ["gouv.fr"],
        plateforme: false,
        organismes: [],
        ministeres: [],
      },
    ],
  ]),
  exclus: new Map(),
};

const zone = {
  "www.ministere.example": { A: [{ type: "A" as const, adresse: "192.0.2.10" }] },
  "ministere.example": {
    NS: [{ type: "NS" as const, cible: "ns1.nuage.example" }],
    SOA: [{ type: "SOA" as const, mname: "ns1.nuage.example", serial: 1 }],
    MX: [{ type: "MX" as const, preference: 10, hote: "mx.nuage.example" }],
    TXT: [{ type: "TXT" as const, spf: "v=spf1 ip4:203.0.113.0/24 -all" }],
  },
  "ns1.nuage.example": { A: [{ type: "A" as const, adresse: "203.0.113.53" }] },
  "mx.nuage.example": { A: [{ type: "A" as const, adresse: "203.0.113.25" }] },
};

describe("the records of a day", () => {
  it("hold the addresses, the name servers and the mail, and pass their schemas", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      {
        ...POLITESSE,
        zoneDe,
        aleatoire: generateur(1),
        horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) },
      },
    );
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t");
    expect(etat.noms.get("www.ministere.example")).toMatchObject({ etat: "ok", categorie: "France", horsUE: false });
    const d = etat.domaines.get("ministere.example");
    expect(d?.serveursDeNoms).toMatchObject({ categorie: "hors d'Europe", horsUE: true });
    expect(d?.messagerie).toMatchObject({ etat: "ok", horsUE: true, spf: { statut: "lu", reseaux: [{ as: 64501 }] } });
    for (const [chemin, texte] of [...fragments("noms", etat.noms), ...fragments("domaines", etat.domaines)]) {
      const schema = schemaDe(chemin);
      if (schema !== null) expect(valider(JSON.parse(texte), schema), chemin).toEqual([]);
    }
  });

  it("publishes a failure Quad9 confirmed as the domain's own breakdown, never as « no site »", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe, new Set(["www.ministere.example"])),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const pannes = { noms: new Set(["www.ministere.example"]), zones: new Set<string>(), resolveur: "quad9" };
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t", pannes);
    expect(etat.noms.get("www.ministere.example")).toMatchObject({
      etat: "echec",
      echec: { code: "SERVFAIL", confirmePar: "quad9" },
    });
    for (const [chemin, texte] of fragments("noms", etat.noms)) {
      const schema = schemaDe(chemin);
      if (schema !== null) expect(valider(JSON.parse(texte), schema), chemin).toEqual([]);
    }
  });

  it("says DNSSEC from the resolver's validation of the zone, never from a DS question", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const z = mesures.domaines.get("ministere.example");
    const etat = construireEtat(liste, mesures, { noms: new Map(), mx: new Map() }, contexteEssai(), "t");
    expect(etat.domaines.get("ministere.example")?.zone.ds).toBe(z?.ad);
  });

  it("reduces a record that fails its schema, counts it, and goes on", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      { ...POLITESSE, zoneDe, horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) } },
    );
    const hostile: ListeReference = {
      ...liste,
      noms: new Map([
        [
          "www.ministere.example",
          {
            ...(liste.noms.get("www.ministere.example") as NonNullable<ReturnType<typeof liste.noms.get>>),
            provenances: [`dila:${"x".repeat(300)}`],
          },
        ],
      ]),
    };
    const rapport = { erreurs: 0, reduits: 0 };
    const etat = construireEtat(
      hostile,
      mesures,
      { noms: new Map(), mx: new Map() },
      contexteEssai(),
      "t",
      undefined,
      rapport,
    );
    expect(rapport).toEqual({ erreurs: 0, reduits: 1 });
    const n = etat.noms.get("www.ministere.example");
    expect(n?.reduit).toBe(true);
    expect(n?.tronque).toBeUndefined();
    expect(valider(n, NOM)).toEqual([]);
    expect(etat.domaines.get("ministere.example")?.tronque).toBeUndefined();
  });

  it("shows a disagreement of the control resolver on the mail exchangers, never settles it", async () => {
    let t = 0;
    const mesures = await collecter(
      new Map([["www.ministere.example", "ministere.example"]]),
      new ResolveurSimule(zone, zoneDe),
      {
        ...POLITESSE,
        zoneDe,
        horloge: { maintenant: () => t, dormir: async (ms) => void (t += ms) },
      },
    );
    const controles = { noms: new Map(), mx: new Map([["ministere.example", ["autre.example"]]]) };
    const etat = construireEtat(liste, mesures, controles, contexteEssai(), "t");
    expect(etat.domaines.get("ministere.example")?.messagerie.niveau).toBe("non déterminé");
  });
});
