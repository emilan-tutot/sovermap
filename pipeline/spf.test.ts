// Tests of the SPF reading (couche 10): a simulated resolver, documentation names and addresses only.
import { describe, expect, it } from "vitest";
import { EchecRecherche, etendreSpf, lireSpf, type ResolveurSpf } from "./spf";

const resolveur = (
  spf: Record<string, string>,
  adresses: Record<string, string[]> = {},
  mx: Record<string, string[]> = {},
) =>
  ({
    spf: async (d: string) => spf[d] ?? null,
    adresses: async (n: string) => adresses[n] ?? [],
    mx: async (d: string) => mx[d] ?? [],
  }) satisfies ResolveurSpf;

describe("SPF", () => {
  it("reads mechanisms and modifiers, and keeps macros unevaluated", () => {
    expect(lireSpf("v=spf1 ip4:192.0.2.0/24 ip6:2001:db8::/32 include:spf.fournisseur.example ~all")).toEqual([
      { type: "ip4", reseau: "192.0.2.0/24" },
      { type: "ip6", reseau: "2001:db8::/32" },
      { type: "include", domaine: "spf.fournisseur.example" },
      { type: "all", qualificatif: "~" },
    ]);
    expect(lireSpf("v=spf1 exists:%{i}.liste.example -all")[0]).toEqual({
      type: "macro",
      texte: "exists:%{i}.liste.example",
    });
    expect(lireSpf("v=spf2 ip4:192.0.2.1")).toEqual([]);
  });

  it("says « echec » when a lookup fails, never « lu » with a partial list", async () => {
    const enPanne: ResolveurSpf = {
      spf: async (d) => {
        if (d === "panne.example") throw new EchecRecherche("panne.example : SERVFAIL");
        return d === "site.example" ? "v=spf1 ip4:192.0.2.1 include:panne.example -all" : null;
      },
      adresses: async () => [],
      mx: async () => [],
    };
    expect((await etendreSpf("site.example", enPanne)).statut).toBe("echec");
  });

  it("never takes a zone index, letters or a length too long for an address", () => {
    expect(lireSpf("v=spf1 ip6:fe80::%x ip6:2001:db8::/200 ip4:192.0.2.1 ip4:999.1.1.1 -all")).toEqual([
      { type: "ip4", reseau: "192.0.2.1/32" },
      { type: "all", qualificatif: "-" },
    ]);
  });

  it("follows include, redirect, a and mx, and names the networks with the record that gives them", async () => {
    const r = await etendreSpf(
      "site.example",
      resolveur(
        {
          "site.example": "v=spf1 a mx include:spf.fournisseur.example redirect=reste.example",
          "spf.fournisseur.example": "v=spf1 ip4:198.51.100.0/24 -all",
          "reste.example": "v=spf1 ip6:2001:db8::/48 -all",
        },
        { "site.example": ["192.0.2.1"], "mx.site.example": ["192.0.2.25"] },
        { "site.example": ["mx.site.example"] },
      ),
    );
    expect(r.statut).toBe("lu");
    expect(r.reseaux).toEqual([
      { reseau: "192.0.2.1/32", depuis: "site.example" },
      { reseau: "192.0.2.25/32", depuis: "site.example" },
      { reseau: "198.51.100.0/24", depuis: "spf.fournisseur.example" },
      { reseau: "2001:db8::/48", depuis: "reste.example" },
    ]);
    expect(r.inclus).toEqual(["spf.fournisseur.example", "reste.example"]);
    expect(r.recherches).toBe(4);
  });

  it("stops at 10 lookups and says so, and detects a loop", async () => {
    const chaine: Record<string, string> = {};
    for (let i = 0; i < 12; i += 1) chaine[`n${i}.example`] = `v=spf1 include:n${i + 1}.example`;
    expect((await etendreSpf("n0.example", resolveur(chaine))).statut).toBe("limite dépassée");
    const boucle = { "a.example": "v=spf1 include:b.example", "b.example": "v=spf1 include:a.example" };
    expect((await etendreSpf("a.example", resolveur(boucle))).statut).toBe("boucle");
    expect((await etendreSpf("rien.example", resolveur({}))).statut).toBe("absent");
  });
});
