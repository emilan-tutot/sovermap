// Tests of the measurement point's pilot: made-up records, documentation addresses (RFC 5737), AS (RFC 5398) and names
// (RFC 2606) only; a fake fetch and a fake clock, as in the polite downloader's own tests: no network.
import { describe, expect, it } from "vitest";
import type { ReferentielCdn } from "@/pipeline/cdn";
import type { Contexte } from "@/pipeline/classement";
import { coucheReseauPubliable } from "@/pipeline/couches";
import type { EnregistrementDomaine, EnregistrementNom } from "@/pipeline/publication";
import { TableIpToAsn, TableRis } from "@/pipeline/reseau";
import type { ReferentielAs, ReferentielSocietes } from "@/pipeline/societes";
import { agentUtilisateur, Telechargeur } from "@/pipeline/sources";
import {
  adresseDeQuestion,
  bilanDuPilote,
  changeDeSociete,
  COMPARES_AU_MOINS,
  type DomaineDuPilote,
  domainesDuPilote,
  lireReponse,
  mesureVide,
  mesurer,
  observationDe,
  plagesOfficielles,
  type ResultatDomaine,
  SANS_REPONSE_DE_SUITE_AU_PLUS,
  societesDe,
  SOUS_RESEAUX,
} from "@/scripts/lib/pilote-ecs";

// ---------------------------------------------------------------------------------------------------------------
// A small world: a CDN (its own AS, and a cache inside a French access network), a French host, an American cloud.

const IPTOASN = [
  "192.0.2.0\t192.0.2.255\t64496\tFR\tEXEMPLE-HEBERGEUR",
  "198.51.100.0\t198.51.100.127\t64500\tNL\tEXEMPLE-CDN",
  "198.51.100.128\t198.51.100.255\t64501\tFR\tEXEMPLE-FAI",
  "203.0.113.0\t203.0.113.255\t64502\tUS\tEXEMPLE-CLOUD",
].join("\n");
const source = (hote: string) => ({ titre: hote, url: `https://${hote}/fiche`, lu_le: "2026-11-23" });
const deux = [source("registre.example"), source("societes.example")];
const societes: ReferentielSocietes = {
  version: "test",
  societes: {
    "hebergeur-fr": { nom: "Hébergeur Exemple SAS", pays: "FR", mere: null, sources: deux, sources_mere: deux },
    "cdn-nl": { nom: "CDN Exemple B.V.", pays: "NL", mere: "cdn-us", sources: deux, sources_mere: deux },
    "cdn-us": { nom: "CDN Exemple, Inc.", pays: "US", mere: null, sources: deux, sources_mere: deux },
    "fai-fr": { nom: "Accès Exemple SA", pays: "FR", mere: null, sources: deux, sources_mere: deux },
    "cloud-us": { nom: "Cloud Exemple, Inc.", pays: "US", mere: null, sources: deux, sources_mere: deux },
  },
};
const tableAs: ReferentielAs = {
  version: "test",
  as: {
    "64496": { societe: "hebergeur-fr", titulaire_registre: "EXEMPLE-HEBERGEUR", sources: deux },
    "64500": { societe: "cdn-nl", titulaire_registre: "EXEMPLE-CDN", sources: deux },
    "64501": { societe: "fai-fr", titulaire_registre: "EXEMPLE-FAI", sources: deux },
    "64502": { societe: "cloud-us", titulaire_registre: "EXEMPLE-CLOUD", sources: deux },
  },
};
const cdn: ReferentielCdn = {
  version: "test",
  fournisseurs: [
    {
      id: "cdn-exemple",
      nom: "CDN Exemple",
      societe: "cdn-nl",
      suffixes: [{ suffixe: ".cdn.example", source: "https://cdn.example/doc", lu_le: "2026-11-23" }],
      as: [{ numero: 64500, suffit_seul: true, source: "https://cdn.example/doc", lu_le: "2026-11-23" }],
    },
  ],
};
const contexte: Contexte = {
  iptoasn: new TableIpToAsn(IPTOASN),
  ris: new TableRis([]),
  cdn,
  plages: {},
  coucheReseau: coucheReseauPubliable,
  tableAs,
  societes,
};

/** One answer of the JSON API: a CNAME chain then its addresses. */
const reponse = (cname: string[], a: string[], code = 0) =>
  lireReponse(
    JSON.stringify({
      Status: code,
      Answer: [
        ...cname.map((c) => ({ name: "precedent.example.", type: 5, data: `${c}.` })),
        ...a.map((x) => ({ name: "dernier.example.", type: 1, data: x })),
      ],
    }),
  );
const observation = (cname: string[], a: string[], code = 0) => {
  const r = reponse(cname, a, code);
  if (r === null) throw new Error("réponse illisible");
  return observationDe("www.exemple.example", r, "essai", "2026-11-23T10:00:00.000Z");
};

describe("the pilot's question and its answer", () => {
  it("always gives the subnet: France and the United States, never none", () => {
    expect(SOUS_RESEAUX.map((s) => [s.pays, s.prefixe])).toEqual([
      ["France", "90.0.0.0/24"],
      ["États-Unis", "24.0.0.0/24"],
    ]);
    const [france] = SOUS_RESEAUX;
    if (france === undefined) throw new Error("sous-réseau absent");
    expect(adresseDeQuestion("www.exemple.example", france)).toBe(
      "https://dns.google/resolve?name=www.exemple.example&type=A&edns_client_subnet=90.0.0.0%2F24",
    );
    for (const s of SOUS_RESEAUX) {
      const u = new URL(adresseDeQuestion("a&b.example", s));
      expect(u.searchParams.get("name")).toBe("a&b.example");
      expect(u.searchParams.get("type")).toBe("A");
      expect(u.searchParams.get("edns_client_subnet")).toBe(s.prefixe);
    }
  });

  it("reads the API's answer at the border: the CNAME chain in order, IPv4 addresses only, the ECS scope", () => {
    const r = lireReponse(
      JSON.stringify({
        Status: 0,
        Answer: [
          { name: "www.a.example.", type: 5, data: "A.Cdn.Example." },
          { name: "a.cdn.example.", type: 5, data: "b.cdn.example." },
          { name: "b.cdn.example.", type: 1, data: "198.51.100.7" },
          { name: "b.cdn.example.", type: 1, data: "pas-une-adresse" },
          { name: "b.cdn.example.", type: 28, data: "2001:db8::1" },
        ],
        edns_client_subnet: "90.0.0.0/24/0",
      }),
    );
    expect(r).toEqual({
      code: 0,
      chaineCname: ["a.cdn.example", "b.cdn.example"],
      a: ["198.51.100.7"],
      portee: "90.0.0.0/24/0",
    });
    for (const illisible of ["<html>défi</html>", "{}", "[]", '{"Status":"0"}', "null"])
      expect(lireReponse(illisible)).toBeNull();
    expect(observation([], [], 3).statut).toBe("NXDOMAIN");
    expect(observation([], [], 0).statut).toBe("NODATA");
    expect(observation([], [], 2).statut).toBe("SERVFAIL");
  });
});

describe("the pilot's companies, by the method", () => {
  it("finds the same company when the CDN is the same, though its addresses sit in other networks", () => {
    // From France, the CDN answers from a cache inside a French access network; from the United States, from its own
    // AS: the method names the CDN on both sides (its CNAME suffix first), so the company does not change.
    const france = observation(["x.cdn.example"], ["198.51.100.200"]);
    const etatsUnis = observation(["y.cdn.example"], ["198.51.100.7"]);
    expect(societesDe(france, "État", contexte)).toEqual(["cdn-nl"]);
    expect(societesDe(etatsUnis, "État", contexte)).toEqual(["cdn-nl"]);
    expect(changeDeSociete([france, etatsUnis], "État", contexte)).toBe(false);
  });

  it("sees a change when the companies differ, and compares nothing when a side got no address", () => {
    const france = observation([], ["192.0.2.10"]);
    const etatsUnis = observation([], ["203.0.113.5"]);
    expect(societesDe(france, "hors État", contexte)).toEqual(["hebergeur-fr"]);
    expect(changeDeSociete([france, etatsUnis], "hors État", contexte)).toBe(true);
    expect(changeDeSociete([observation(["x.cdn.example"], ["198.51.100.7"]), etatsUnis], "État", contexte)).toBe(true);
    expect(changeDeSociete([france, observation([], [], 3)], "État", contexte)).toBeNull();
    expect(changeDeSociete([france, null], "État", contexte)).toBeNull();
    expect(changeDeSociete([france], "État", contexte)).toBeNull();
    expect(societesDe(observation([], [], 2), "État", contexte)).toBeNull();
  });

  it("reads the CDNs' official ranges as the collection does, and leaves out a list of another shape", () => {
    const plages = plagesOfficielles(
      ["192.0.2.0/24\n\n2001:db8::/32\npas-une-plage\n", "198.51.100.0/25"],
      '{"addresses":["203.0.113.0/24"],"ipv6_addresses":["2001:db8:1::/48"]}',
    );
    expect(plages["cloudflare"]?.plages).toEqual(["192.0.2.0/24", "2001:db8::/32", "198.51.100.0/25"]);
    expect(plages["fastly"]?.plages).toEqual(["203.0.113.0/24", "2001:db8:1::/48"]);
    expect(plagesOfficielles([], '{"addresses":"203.0.113.0/24"}')).toEqual({});
    expect(plagesOfficielles([], "<html>")).toEqual({});
  });
});

describe("the pilot's draw and its count", () => {
  const domaine = (d: string, perimetre: "État" | "hors État"): EnregistrementDomaine =>
    ({ domaine: d, nomWeb: `www.${d}`, perimetre }) as unknown as EnregistrementDomaine;
  const nom = (d: string, cdnPresent: boolean, etat = "ok"): EnregistrementNom =>
    ({
      nom: `www.${d}`,
      domaine: d,
      etat,
      cdn: cdnPresent ? { id: "cdn-exemple", methode: "cname" } : null,
      exploitants: [{ role: "diffusé par", societe: "cdn-nl", preuve: "CNAME *.cdn.example", niveau: "confirmé" }],
    }) as unknown as EnregistrementNom;

  it("draws only the web names that answered behind a CDN, the same for a seed, at most n", () => {
    const domaines = ["a", "b", "c", "d", "e", "f"].map((x, i) => domaine(`${x}.example`, i % 2 === 0 ? "État" : "hors État"));
    const noms = new Map(
      [
        nom("a.example", true),
        nom("b.example", true),
        nom("c.example", false),
        nom("d.example", true, "échec"),
        nom("e.example", true),
        nom("f.example", true),
      ].map((n) => [n.nom, n]),
    );
    const tous = domainesDuPilote(domaines, noms, 20261123, 10);
    expect(tous.map((d) => d.domaine).sort()).toEqual(["a.example", "b.example", "e.example", "f.example"]);
    const trois = domainesDuPilote(domaines, noms, 20261123, 3);
    expect(trois).toHaveLength(3);
    expect(domainesDuPilote(domaines, noms, 20261123, 3)).toEqual(trois);
    expect(trois[0]?.publiees).toEqual(["cdn-nl"]);
  });

  const resultat = (d: string, change: boolean | null, perimetre: "État" | "hors État" = "hors État"): ResultatDomaine => ({
    domaine: d,
    nomWeb: `www.${d}`,
    perimetre,
    publiees: ["cdn-nl"],
    sousReseaux: SOUS_RESEAUX.map((s) => ({ pays: s.pays, reponse: null, societes: change === null ? null : ["cdn-nl"] })),
    change,
  });
  const serie = (n: number, change: boolean | null, prefixe: string) =>
    Array.from({ length: n }, (_, i) => resultat(`${prefixe}${i}.example`, change));

  it("judges the threshold on the exact counts, never on the rounded share", () => {
    // 3 on 290 is 1.03 %: beyond 1 %, though the share shown is rounded to 1.0.
    const au = bilanDuPilote([...serie(3, true, "c"), ...serie(287, false, "s"), ...serie(10, null, "n")]);
    expect(au).toMatchObject({ domaines: 300, compares: 290, changent: 3, partPourcent: 1, decision: "au-delà du seuil" });
    expect(au.exemples.map((e) => e.domaine)).toEqual(["c0.example", "c1.example", "c2.example"]);
    const tenu = bilanDuPilote([...serie(1, true, "c"), ...serie(99, false, "s")]);
    expect(tenu).toMatchObject({ compares: 100, changent: 1, partPourcent: 1, decision: "seuil tenu" });
  });

  it("leaves the share undetermined below 100 compared domains, and counts each perimeter apart", () => {
    expect(COMPARES_AU_MOINS).toBe(100);
    const peu = bilanDuPilote([...serie(1, true, "c"), ...serie(98, false, "s"), ...serie(201, null, "n")]);
    expect(peu).toMatchObject({ domaines: 300, compares: 99, decision: "non déterminé" });
    expect(bilanDuPilote([])).toMatchObject({ compares: 0, partPourcent: null, decision: "non déterminé" });
    const parts = bilanDuPilote([
      resultat("e1.example", true, "État"),
      resultat("e2.example", false, "État"),
      resultat("h1.example", false),
      resultat("h2.example", null, "État"),
    ]).parPerimetre;
    expect(parts).toEqual({ État: { compares: 2, changent: 1 }, "hors État": { compares: 1, changent: 0 } });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The questions themselves, through the project's polite downloader, with a fake network and a fake clock.

type Appel = { url: string; agent: string | null; quand: number };

function reseauFaux(repondre: (url: string, rang: number) => { status: number; corps?: string }) {
  const appels: Appel[] = [];
  let horloge = 0;
  let enCours = 0;
  let auPlus = 0;
  const fetchFaux = (async (entree: string | URL | Request, init?: RequestInit) => {
    enCours += 1;
    auPlus = Math.max(auPlus, enCours);
    const url = entree.toString();
    appels.push({ url, agent: new Headers(init?.headers).get("user-agent"), quand: horloge });
    await Promise.resolve();
    enCours -= 1;
    const r = repondre(url, appels.length);
    return new Response(r.corps ?? "", { status: r.status });
  }) as typeof fetch;
  const vraieDate = Date.now;
  Date.now = () => horloge;
  const telechargeur = new Telechargeur({
    agent: agentUtilisateur("1"),
    fetch: fetchFaux,
    dormir: async (ms) => {
      horloge += ms;
    },
  });
  return {
    appels,
    auPlus: () => auPlus,
    obtenir: (adresse: string) => telechargeur.obtenir(adresse),
    retablir: () => {
      Date.now = vraieDate;
    },
  };
}

/** The API's answer for one question: the CDN from both subnets, from a cache in France, from its own AS elsewhere. */
function reponseApi(url: string): string {
  const u = new URL(url);
  const france = u.searchParams.get("edns_client_subnet") === "90.0.0.0/24";
  const cible = france ? "x.cdn.example" : "y.cdn.example";
  return JSON.stringify({
    Status: 0,
    Answer: [
      { name: `${u.searchParams.get("name") ?? ""}.`, type: 5, data: `${cible}.` },
      { name: `${cible}.`, type: 1, data: france ? "198.51.100.200" : "198.51.100.7" },
    ],
    edns_client_subnet: `${u.searchParams.get("edns_client_subnet") ?? ""}/24`,
  });
}

const tires: DomaineDuPilote[] = ["a", "b", "c", "d", "e"].map((x) => ({
  domaine: `${x}.example`,
  nomWeb: `www.${x}.example`,
  perimetre: "État",
  publiees: ["cdn-nl"],
}));
const ROBOTS = "https://dns.google/robots.txt";

describe("the pilot's questions", () => {
  it("reads robots.txt first, then asks one question at a time, one second apart, with the project's agent", async () => {
    const f = reseauFaux((url) => (url === ROBOTS ? { status: 404 } : { status: 200, corps: reponseApi(url) }));
    try {
      const m = await mesurer(tires.slice(0, 2), f.obtenir, contexte, mesureVide());
      expect(f.appels[0]?.url).toBe(ROBOTS);
      const questions = f.appels.slice(1);
      expect(questions).toHaveLength(4);
      for (const q of questions) expect(new URL(q.url).searchParams.get("edns_client_subnet")).toMatch(/^[0-9.]+[/]24$/);
      for (const a of f.appels) expect(a.agent).toBe(agentUtilisateur("1"));
      for (let i = 1; i < f.appels.length; i += 1)
        expect((f.appels[i]?.quand ?? 0) - (f.appels[i - 1]?.quand ?? 0)).toBeGreaterThanOrEqual(1_000);
      expect(f.auPlus()).toBe(1);
      expect(m).toMatchObject({ questions: 4, sansReponse: 0, sansAdresse: 0, arret: null });
      expect(m.resultats.map((r) => r.change)).toEqual([false, false]);
      expect(m.resultats[0]?.sousReseaux.map((s) => s.reponse?.portee)).toEqual(["90.0.0.0/24/24", "24.0.0.0/24/24"]);
    } finally {
      f.retablir();
    }
  });

  it("asks nothing when robots.txt closes /resolve, or cannot be read for a server error", async () => {
    for (const robots of [
      { status: 200, corps: "User-agent: *\nDisallow: /resolve # pas de robots\n" },
      { status: 503, corps: "" },
    ]) {
      const f = reseauFaux((url) => (url === ROBOTS ? robots : { status: 200, corps: reponseApi(url) }));
      try {
        const m = await mesurer(tires, f.obtenir, contexte, mesureVide());
        expect(f.appels.map((a) => a.url)).toEqual([ROBOTS]);
        expect(m).toMatchObject({ questions: 0, resultats: [], arret: "le robots.txt de dns.google interdit ces questions" });
      } finally {
        f.retablir();
      }
    }
  });

  it("stops after five questions in a row without the API's answer, and keeps what it measured", async () => {
    expect(SANS_REPONSE_DE_SUITE_AU_PLUS).toBe(5);
    // robots.txt, then two good answers, then only refusals (429) and a page that is not the API's answer.
    const f = reseauFaux((url, rang) =>
      url === ROBOTS
        ? { status: 404 }
        : rang <= 3
          ? { status: 200, corps: reponseApi(url) }
          : rang === 5
            ? { status: 200, corps: "<html>défi</html>" }
            : { status: 429 },
    );
    try {
      const m = await mesurer(tires, f.obtenir, contexte, mesureVide());
      expect(m).toMatchObject({ questions: 7, sansReponse: 5, arret: "5 questions de suite sans réponse de l'API" });
      expect(m.resultats.map((r) => r.change)).toEqual([false, null, null]);
      expect(f.appels).toHaveLength(8);
    } finally {
      f.retablir();
    }
  });
});
