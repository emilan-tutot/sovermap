// A measured domain writes its own DNS records: none may stop the publication of the others. Made-up records,
// documentation names and AS numbers only (RFC 2606, RFC 5398).
import { describe, expect, it } from "vitest";
import { bornerDomaine, bornerNom, TAILLE_MAX_ENREGISTREMENT } from "./borner";
import { type EnregistrementDomaine, type EnregistrementNom, jsonStable } from "./publication";
import { DOMAINE, NOM, valider } from "./schemas";

const long = (i: number) => `${"x".repeat(60)}${i}.${"y".repeat(60)}.${"z".repeat(60)}.example`;
const exploitant = {
  role: "hébergé par",
  societe: "hebergeur-fr",
  preuve: "AS64496",
  niveau: "probable" as const,
  niveauSociete: "probable" as const,
};

const nom: EnregistrementNom = {
  nom: "www.mairie.example",
  domaine: "mairie.example",
  provenances: ["dinum:2026-11-19"],
  types: [],
  etat: "ok",
  echec: null,
  cname: ["<script>.example", ...Array.from({ length: 10 }, (_, i) => long(i))],
  dnssec: false,
  familleEnEchec: null,
  reseaux: Array.from({ length: 40 }, (_, i) => ({ as: 64496 + (i % 16), plage: `192.0.2.${i}-192.0.2.${i}` })),
  cdn: null,
  exploitants: Array.from({ length: 30 }, () => exploitant),
  categorie: "France",
  horsUE: false,
  niveau: "probable",
  controle: null,
};

const hoteLong = (i: number) => ({
  hote: long(i),
  etat: "ok" as const,
  as: Array.from({ length: 30 }, (_, k) => 64496 + k),
  exploitants: Array.from({ length: 30 }, () => exploitant),
  categorie: "France" as const,
  horsUE: false,
  niveau: "probable" as const,
});

const domaine: EnregistrementDomaine = {
  domaine: "mairie.example",
  nomWeb: "www.mairie.example",
  perimetre: "hors État",
  raisons: [],
  plateforme: false,
  organismes: 0,
  ministeres: [],
  noms: 1,
  zone: {
    etat: "ok",
    echec: null,
    ns: Array.from({ length: 40 }, (_, i) => long(i)),
    soa: "pas un nom !",
    ds: false,
    caa: [],
  },
  serveursDeNoms: {
    hotes: Array.from({ length: 40 }, (_, i) => hoteLong(i)),
    categorie: "France",
    horsUE: false,
    niveau: "probable",
  },
  messagerie: {
    etat: "ok",
    mx: Array.from({ length: 100 }, (_, i) => ({ preference: i, hote: long(i) })),
    hotes: Array.from({ length: 100 }, (_, i) => hoteLong(i)),
    categorie: "France",
    horsUE: false,
    niveau: "probable",
    spf: { statut: "lu", inclus: ["%{d}.macro.example", "spf.example"], reseaux: [], reseauxTotal: 0, nonEvalues: 1 },
  },
};

describe("the bounds of a record", () => {
  it("keep a name's record small and valid, whatever its domain writes in the DNS", () => {
    const b = bornerNom(nom);
    expect(Buffer.byteLength(jsonStable(b))).toBeLessThanOrEqual(TAILLE_MAX_ENREGISTREMENT);
    expect(b.cname).not.toContain("<script>.example");
    expect(b.tronque).toBe(true);
    expect(valider(b, NOM)).toEqual([]);
  });

  it("keep a domain's record small and valid: invalid names dropped, lists capped, marked « tronque »", () => {
    const b = bornerDomaine(domaine);
    expect(Buffer.byteLength(jsonStable(b))).toBeLessThanOrEqual(TAILLE_MAX_ENREGISTREMENT);
    expect(b.zone.soa).toBeNull();
    expect(b.messagerie.spf?.inclus ?? []).not.toContain("%{d}.macro.example");
    expect(b.tronque).toBe(true);
    expect(valider(b, DOMAINE)).toEqual([]);
  });

  it("keep the valid names of a small record", () => {
    const petit: EnregistrementDomaine = {
      ...domaine,
      zone: { ...domaine.zone, ns: ["ns1.mairie.example"], soa: "ns1.mairie.example" },
      serveursDeNoms: { ...domaine.serveursDeNoms, hotes: [] },
      messagerie: { ...domaine.messagerie, mx: [{ preference: 10, hote: "mx.mairie.example" }], hotes: [] },
    };
    const b = bornerDomaine(petit);
    expect(b.messagerie.spf?.inclus).toEqual(["spf.example"]);
    expect(b.zone.soa).toBe("ns1.mairie.example");
    expect(b.tronque).toBeUndefined();
  });

  it("leave an ordinary record as it is", () => {
    const ordinaire = {
      ...nom,
      cname: ["mairie.cdn.example"],
      reseaux: nom.reseaux.slice(0, 2),
      exploitants: [exploitant],
    };
    expect(bornerNom(ordinaire)).toEqual(ordinaire);
  });
});
