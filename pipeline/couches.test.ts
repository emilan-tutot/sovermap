// Tests of the layers v1: a made-up context (essai-contexte.ts), documentation names, addresses and AS numbers only.
import { describe, expect, it } from "vitest";
import { coucheAdresses, coucheHotes, coucheSpf } from "./couches";
import { contexteEssai } from "./essai-contexte";
import type { MesureNom } from "./mesure";

const contexte = contexteEssai();
const mesure = (nom: string, adresses: string[], cname: string[] = []): MesureNom => ({
  nom,
  etat: "ok",
  echec: null,
  cname,
  a: adresses.filter((a) => !a.includes(":")).map((adresse) => ({ adresse, ttl: 60 })),
  aaaa: adresses.filter((a) => a.includes(":")).map((adresse) => ({ adresse, ttl: 60 })),
  ad: true,
});

describe("the layers v1", () => {
  it("keeps the AS and its IPtoASN range, never RIS's prefix, and confirms with the control resolver", () => {
    const m = mesure("www.mairie.example", ["192.0.2.10", "2001:db8::10"]);
    const c = coucheAdresses(m, { resolveur: "quad9", mesure: m }, "hors État", contexte, "2026-11-21T03:17:00Z");
    expect(c.reseaux).toEqual([
      {
        as: 64496,
        plage: "192.0.2.0-192.0.2.255",
        descriptionAs: "EXEMPLE-HEBERGEUR",
        paysEnregistrement: "FR",
      },
      {
        as: 64496,
        plage: "2001:db8:0:0:0:0:0:0-2001:db8:ffff:ffff:ffff:ffff:ffff:ffff",
        descriptionAs: "EXEMPLE-HEBERGEUR",
        paysEnregistrement: "FR",
      },
    ]);
    expect(c).toMatchObject({ categorie: "France", horsUE: false, niveau: "confirmé", dnssec: true });
    expect(JSON.stringify(c)).not.toContain("/24");
  });

  it("stays « probable » without the control resolver, and names the CDN that serves a name", () => {
    const sansControle = coucheAdresses(mesure("a.example", ["192.0.2.10"]), null, "hors État", contexte, "t");
    expect(sansControle.niveau).toBe("probable");
    const cdn = coucheAdresses(
      mesure("www.site.example", ["198.51.100.7"], ["site.cdn.example"]),
      null,
      "hors État",
      contexte,
      "t",
    );
    expect(cdn.cdn).toMatchObject({ id: "cdn-exemple", methode: "cname" });
    expect(cdn).toMatchObject({ horsUE: true, categorie: "hors d'Europe" });
  });

  it("classifies a domain's hosts: the farthest category wins, one host outside the EU is enough", () => {
    const mesures = new Map([
      ["ns1.hebergeur.example", mesure("ns1.hebergeur.example", ["192.0.2.53"])],
      ["ns2.nuage.example", mesure("ns2.nuage.example", ["203.0.113.53"])],
    ]);
    const c = coucheHotes(["ns1.hebergeur.example", "ns2.nuage.example"], mesures, new Map(), "État", contexte, "t");
    expect(c).toMatchObject({ categorie: "hors d'Europe", horsUE: true, niveau: "probable" });
    expect(c.hotes.map((h) => h.hote)).toEqual(["ns1.hebergeur.example", "ns2.nuage.example"]);
    const fr = coucheHotes(["ns1.hebergeur.example"], mesures, new Map(), "État", contexte, "t");
    expect(fr).toMatchObject({ categorie: "France", horsUE: false });
  });

  it("reduces the SPF networks to their AS", () => {
    const c = coucheSpf(
      {
        statut: "lu",
        reseaux: [
          { reseau: "192.0.2.0/24", depuis: "mairie.example" },
          { reseau: "203.0.113.8/29", depuis: "spf.nuage.example" },
        ],
        inclus: ["spf.nuage.example"],
        nonEvalues: [],
        recherches: 1,
      },
      contexte,
    );
    expect(c).toEqual({
      statut: "lu",
      inclus: ["spf.nuage.example"],
      reseaux: [
        { as: 64496, descriptionAs: "EXEMPLE-HEBERGEUR" },
        { as: 64501, descriptionAs: "EXEMPLE-CLOUD" },
      ],
      nonEvalues: 0,
    });
  });
});
