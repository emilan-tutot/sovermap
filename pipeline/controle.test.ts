// Tests of the controls: the plan of the day, the control resolver's pace, the witnesses. Simulated resolver, fake
// clock, documentation names, addresses and AS numbers only (RFC 2606, RFC 5737, RFC 5398).
import { describe, expect, it } from "vitest";
import { ClientCadence, conforme, ControleEnContinu, controler, planDeControle, verifierTemoins } from "./controle";
import type { MesureNom } from "./mesure";
import { generateur, type Horloge } from "./politesse";
import { ResolveurSimule } from "./resolveur-simule";

const zoneDe = (nom: string) => nom.split(".").slice(-2).join(".");

describe("the controls", () => {
  it("asks every « État » domain, 3 % of the others and the witnesses", () => {
    const domaines = [
      { domaine: "ministere.example", nomWeb: "www.ministere.example", perimetre: "État" as const },
      ...Array.from({ length: 100 }, (_, i) => ({
        domaine: `c${i}.example`,
        nomWeb: `c${i}.example`,
        perimetre: "hors État" as const,
      })),
    ];
    const plan = planDeControle(domaines, ["temoin.example"], generateur(7));
    expect(plan.mx).toEqual(["ministere.example"]);
    expect(plan.noms).toContain("www.ministere.example");
    expect(plan.noms).toContain("temoin.example");
    expect(plan.noms).toHaveLength(1 + 3 + 1);
  });

  it("asks the witnesses first, so that neither the deadline nor an emergency stop leaves them out", () => {
    const domaines = [
      { domaine: "a.example", nomWeb: "a.example", perimetre: "État" as const },
      { domaine: "z.example", nomWeb: "z.example", perimetre: "État" as const },
    ];
    const plan = planDeControle(domaines, ["temoin-b.example", "temoin-a.example"], generateur(7));
    expect(plan.noms).toEqual(["temoin-a.example", "temoin-b.example", "a.example", "z.example"]);
  });

  it("asks the control resolver at 2 questions per second at most", async () => {
    let t = 0;
    const horloge: Horloge = { maintenant: () => t, dormir: async (ms) => void (t += ms) };
    const zone = { "a.example": { A: [{ type: "A" as const, adresse: "192.0.2.1" }] } };
    const client = new ClientCadence(new ResolveurSimule(zone, zoneDe), 2, horloge);
    const r = await controler(client, ["a.example", "b.example"], ["a.example"]);
    expect(r.noms.get("a.example")?.etat).toBe("ok");
    expect(r.mx.get("a.example")).toEqual([]);
    // 5 questions (A and AAAA for two names, one MX): the last one starts 2 s after the first, at least.
    expect(t).toBeGreaterThanOrEqual(2000);
  });

  it("controls the names it is fed while the measurement runs, each one once, at the client's pace", async () => {
    let t = 0;
    const horloge: Horloge = { maintenant: () => t, dormir: async (ms) => void (t += ms) };
    const zone = {
      "a.example": { A: [{ type: "A" as const, adresse: "192.0.2.1" }] },
      "b.example": { A: [{ type: "A" as const, adresse: "192.0.2.2" }] },
    };
    const simule = new ResolveurSimule(zone, zoneDe);
    const client = new ClientCadence(simule, 2, horloge);
    const controle = new ControleEnContinu(client, 8);
    controle.ajouter(["a.example", "a.example"]);
    // Later, while the workers wait for more: they wake up and ask the new name.
    await new Promise((fin) => setTimeout(fin, 5));
    controle.ajouter(["b.example", "a.example"]);
    // Asked while the measurement runs, before the control is closed.
    await new Promise((fin) => setTimeout(fin, 20));
    expect(simule.questions).toContain("b.example A");
    const r = await controle.fermer();
    expect([...r.noms.keys()].sort()).toEqual(["a.example", "b.example"]);
    expect(r.noms.get("b.example")?.etat).toBe("ok");
    expect(controle.noms).toEqual(["a.example", "b.example"]);
    // Each name asked once (A and AAAA), at 2 questions per second at most.
    expect(simule.questions.filter((q) => q.startsWith("a.example "))).toHaveLength(2);
    expect(t).toBeGreaterThanOrEqual(1500);
  });

  it("never leaves a failure unhandled while the measurement runs: fermer() gives it", async () => {
    const enPanne = {
      id: "en-panne",
      demander: async () => {
        throw new Error("panne du client");
      },
    } as unknown as ConstructorParameters<typeof ControleEnContinu>[0];
    const rejets: unknown[] = [];
    const surveiller = (raison: unknown) => rejets.push(raison);
    process.on("unhandledRejection", surveiller);
    const controle = new ControleEnContinu(enPanne, 2);
    controle.ajouter(["a.example"]);
    await new Promise((fin) => setTimeout(fin, 20));
    process.off("unhandledRejection", surveiller);
    expect(rejets).toEqual([]);
    await expect(controle.fermer()).rejects.toThrow("panne du client");
  });

  it("stops controlling at its deadline: what is left is not asked", async () => {
    const simule = new ResolveurSimule({}, zoneDe);
    const controle = new ControleEnContinu(simule, 2, Date.now() - 1);
    controle.ajouter(["a.example"]);
    const r = await controle.fermer();
    expect(r.noms.size).toBe(0);
    expect(simule.questions).toEqual([]);
  });

  it("follows a deadline that moves: the emergency stop brings it to now, and nothing more is asked", async () => {
    // One question in flight at a time; the deadline comes once the first name is measured.
    let echeance = Number.POSITIVE_INFINITY;
    const simule = new ResolveurSimule({}, zoneDe);
    const demander = simule.demander.bind(simule);
    simule.demander = async (nom, type) => {
      const r = await demander(nom, type);
      echeance = Date.now() - 1;
      return r;
    };
    const r = await controler(simule, ["a.example", "b.example", "c.example"], [], 1, () => echeance);
    expect([...r.noms.keys()]).toEqual(["a.example"]);
    // The continuous control reads it each time too: built before the deadline moves, it asks one name, then stops.
    echeance = Number.POSITIVE_INFINITY;
    const continu = new ControleEnContinu(simule, 1, () => echeance);
    continu.ajouter(["d.example", "e.example", "f.example"]);
    expect([...(await continu.fermer()).noms.keys()]).toEqual(["d.example"]);
  });

  it("agrees only when every resolver finds every witness as it is known", () => {
    const temoins = [
      {
        nom: "temoin.example",
        attendu: { etat: "ok" as const, cdn: null, as: [64496] },
        releve: { le: "x", preuve: "y" },
      },
      { nom: "absent.invalid", attendu: { etat: "nxdomain" as const }, releve: { le: "x", preuve: "y" } },
    ];
    const vu = (nom: string, etat: MesureNom["etat"], adresse: string | null): MesureNom => ({
      nom,
      etat,
      echec: null,
      cname: [],
      a: adresse ? [{ adresse, ttl: 1 }] : [],
      aaaa: [],
      ad: false,
    });
    const profil = (m: MesureNom) => ({
      etat: m.etat,
      cdn: null,
      as: m.a.map((x) => (x.adresse === "192.0.2.1" ? 64496 : 64500)),
    });
    const bons = new Map([
      ["temoin.example", vu("temoin.example", "ok", "192.0.2.1")],
      ["absent.invalid", vu("absent.invalid", "nxdomain", null)],
    ]);
    const mauvais = new Map([...bons, ["temoin.example", vu("temoin.example", "ok", "198.51.100.1")]]);
    expect(verifierTemoins(temoins, [{ resolveur: "knot", noms: bons }], profil).concordants).toBe(true);
    const r = verifierTemoins(
      temoins,
      [
        { resolveur: "knot", noms: bons },
        { resolveur: "quad9", noms: mauvais },
      ],
      profil,
    );
    expect(r.concordants).toBe(false);
    expect(r.verdicts.filter((v) => !v.ok).map((v) => `${v.nom} ${v.resolveur}`)).toEqual(["temoin.example quad9"]);
    expect(conforme({ etat: "ok", cdn: "fournisseur" }, { etat: "ok", cdn: null, as: [] })).toBe(false);
  });
});
