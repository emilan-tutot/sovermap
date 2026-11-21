// Tests of the site's reading of the data (brief B.9, lib/donnees/lecture.ts): a made-up branch « donnees », no network,
// a made-up account name, and a stand-in for Next's data cache.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  adresseDonnees,
  ATTENTE_MS,
  DUREE_ETAT_S,
  LecteurDonnees,
  lireEtatPublie,
  type Memoriser,
} from "@/lib/donnees/lecture";

const COMPTE = "compte-exemple";
const OUVERT = { SITE_PUBLIC: "open", SOVERMAP_GITHUB_OWNER: COMPTE };
const RACINE = `https://raw.githubusercontent.com/${COMPTE}/sovermap/donnees/`;
const HEURE = DUREE_ETAT_S * 1000;
const sha = (texte: string) => createHash("sha256").update(texte, "utf8").digest("hex");

/** A made-up branch « donnees »: a path gives a body, an HTTP code or a network error; every read is recorded. */
function github() {
  const fichiers = new Map<string, string | number | Error>();
  const lus: string[] = [];
  const agents: string[] = [];
  const lire = (async (entree: string | URL | Request, init?: RequestInit) => {
    const chemin = String(entree).replace(RACINE, "");
    lus.push(chemin);
    agents.push(new Headers(init?.headers).get("User-Agent") ?? "");
    const fichier = fichiers.get(chemin);
    if (fichier instanceof Error) throw fichier;
    if (fichier === undefined) return new Response("Not Found", { status: 404 });
    if (typeof fichier === "number") return new Response("", { status: fichier });
    return new Response(fichier, { status: 200 });
  }) as typeof fetch;
  return { fichiers, lus, agents, fetch: lire, combien: (chemin: string) => lus.filter((l) => l === chemin).length };
}
type GitHub = ReturnType<typeof github>;

/** A published state: etat.json → noms/ab/sommes.json → noms/ab/cd.json, and an aggregate. */
function publier(g: GitHub, date: string, contenu: unknown = { nom: "www.d0.example" }) {
  const fragment = JSON.stringify([contenu]);
  const table = JSON.stringify({ "cd.json": sha(fragment) });
  const chiffres = JSON.stringify({ domaines: 1 });
  const sommes = { "noms/ab/sommes.json": sha(table), "agregats/chiffres.json": sha(chiffres) };
  g.fichiers.set("etat.json", JSON.stringify({ statut: "preparation", date, sommes }));
  g.fichiers.set("noms/ab/sommes.json", table);
  g.fichiers.set("noms/ab/cd.json", fragment);
  g.fichiers.set("agregats/chiffres.json", chiffres);
  return { fragment };
}

/** No shared cache: every call reads GitHub (the memory of the reader alone). */
const direct: Memoriser = (f) => f;

/** A stand-in for Next's data cache: a fresh entry is served; a stale one is served while read again, kept on failure. */
function partage(horloge: { t: number }) {
  const entrees = new Map<string, { valeur: unknown; a: number }>();
  const memoriser: Memoriser =
    (f, cle, { revalidate }) =>
    async (...args) => {
      const k = JSON.stringify([cle, args]);
      const entree = entrees.get(k);
      if (entree === undefined) {
        const valeur = await f(...args);
        entrees.set(k, { valeur: structuredClone(valeur), a: horloge.t });
        return valeur;
      }
      if (revalidate !== false && horloge.t - entree.a >= revalidate * 1000) {
        try {
          entrees.set(k, { valeur: structuredClone(await f(...args)), a: horloge.t });
        } catch {
          // Next keeps the stale entry when its revalidation fails.
        }
      }
      return structuredClone(entree.valeur) as Awaited<ReturnType<typeof f>>;
    };
  return { entrees, memoriser };
}

function lecteur(
  g: GitHub,
  options: { env?: Record<string, string>; memoriser?: Memoriser; horloge?: { t: number } } = {},
) {
  const journal: string[] = [];
  const horloge = options.horloge ?? { t: Date.UTC(2026, 10, 22, 6) };
  const l = new LecteurDonnees({
    fetch: g.fetch,
    maintenant: () => horloge.t,
    env: options.env ?? OUVERT,
    journal: (ligne) => journal.push(ligne),
    memoriser: options.memoriser ?? direct,
  });
  return { l, journal, horloge };
}

describe("the site's reading of the data (B.9)", () => {
  it("reads nothing at all behind the closed door", async () => {
    for (const env of [{ SOVERMAP_GITHUB_OWNER: COMPTE }, { SITE_PUBLIC: "Open", SOVERMAP_GITHUB_OWNER: COMPTE }]) {
      const g = github();
      publier(g, "2026-11-22");
      const { l, journal } = lecteur(g, { env });
      expect(await l.etat()).toEqual({ statut: "porte fermée" });
      expect(await l.fichier("noms/ab/cd.json")).toEqual({ statut: "porte fermée" });
      expect(g.lus).toEqual([]);
      expect(journal).toEqual([]);
    }
  });

  it("takes the account from the configuration, and reads only data paths", async () => {
    expect(adresseDonnees("etat.json", OUVERT)).toBe(`${RACINE}etat.json`);
    expect(adresseDonnees("noms/ab/cd.1.json", OUVERT)).toBe(`${RACINE}noms/ab/cd.1.json`);
    for (const chemin of ["../etat.json", "noms/../etat.json", "Etat.json", "etat.txt", "/etat.json", "noms/ab/"]) {
      expect(adresseDonnees(chemin, OUVERT)).toBeNull();
    }
    for (const compte of ["", " ", "a/b", "-a", "a.b", "a".repeat(40)]) {
      expect(adresseDonnees("etat.json", { ...OUVERT, SOVERMAP_GITHUB_OWNER: compte })).toBeNull();
    }
    // No account configured: nothing is read, and the failure is logged.
    const g = github();
    publier(g, "2026-11-22");
    const { l, journal } = lecteur(g, { env: { SITE_PUBLIC: "open" } });
    expect(await l.etat()).toEqual({ statut: "indisponible" });
    expect(g.lus).toEqual([]);
    expect(journal).toEqual(["donnees : lecture en échec (etat.json : configuration)"]);
  });

  it("reads etat.json at most once an hour, as Sovermap-bot", async () => {
    const g = github();
    publier(g, "2026-11-22");
    const { l, horloge } = lecteur(g);
    expect(await l.etat()).toMatchObject({ statut: "ok", date: "2026-11-22" });
    horloge.t += HEURE - 60_000;
    await l.etat();
    expect(g.combien("etat.json")).toBe(1);
    horloge.t += 60_000;
    await l.etat();
    expect(g.combien("etat.json")).toBe(2);
    expect(g.agents[0]).toMatch(/^Sovermap-bot\/\d+\.\d+\.\d+ \(\+https:\/\/sovermap\.vercel\.app\)$/);
  });

  it("serves the last state read well, with its date, when a read fails, and logs every failure", async () => {
    const pannes: [string | number | Error, string][] = [
      [429, "HTTP 429"],
      [503, "HTTP 503"],
      [new TypeError("fetch failed"), "TypeError"],
      ["<!doctype html><title>Erreur</title>", "fichier illisible"],
      [JSON.stringify({ statut: "preparation", date: "hier", sommes: {} }), "fichier illisible"],
    ];
    for (const [panne, raison] of pannes) {
      const g = github();
      publier(g, "2026-11-21");
      const { l, journal, horloge } = lecteur(g);
      await l.etat();
      g.fichiers.set("etat.json", panne);
      horloge.t += HEURE;
      expect(await l.etat()).toMatchObject({ statut: "ok", date: "2026-11-21" });
      expect(journal).toEqual([`donnees : lecture en échec (etat.json : ${raison})`]);
      // Asked again a minute later at most, then the new state is served.
      publier(g, "2026-11-22");
      horloge.t += ATTENTE_MS - 1000;
      expect(await l.etat()).toMatchObject({ date: "2026-11-21" });
      expect(g.combien("etat.json")).toBe(2);
      horloge.t += 1000;
      expect(await l.etat()).toMatchObject({ statut: "ok", date: "2026-11-22" });
    }
  });

  it("says the data is unavailable when no state was ever read, and does not hammer GitHub", async () => {
    const g = github();
    g.fichiers.set("etat.json", 500);
    const { l, horloge } = lecteur(g);
    expect(await l.etat()).toEqual({ statut: "indisponible" });
    expect(await l.fichier("noms/ab/cd.json")).toEqual({ statut: "indisponible" });
    horloge.t += ATTENTE_MS - 1000;
    await l.etat();
    expect(g.lus).toEqual(["etat.json"]);
  });

  it("reads a fragment through its folder's checksums, once per checksum", async () => {
    const g = github();
    publier(g, "2026-11-22");
    const { l } = lecteur(g);
    expect(await l.fichier("noms/ab/cd.json")).toEqual({
      statut: "ok",
      donnees: [{ nom: "www.d0.example" }],
      date: "2026-11-22",
    });
    expect(g.lus).toEqual(["etat.json", "noms/ab/sommes.json", "noms/ab/cd.json"]);
    await l.fichier("noms/ab/cd.json");
    expect(g.lus).toHaveLength(3);
    expect(await l.fichier("agregats/chiffres.json")).toMatchObject({ statut: "ok", donnees: { domaines: 1 } });
    // Not published, or not a data path: nothing is read.
    expect(await l.fichier("noms/ab/ef.json")).toEqual({ statut: "indisponible" });
    expect(await l.fichier("agregats/absent.json")).toEqual({ statut: "indisponible" });
    expect(await l.fichier("../etat.json")).toEqual({ statut: "indisponible" });
    expect(g.lus).toEqual(["etat.json", "noms/ab/sommes.json", "noms/ab/cd.json", "agregats/chiffres.json"]);
  });

  it("never keeps a file that does not match its checksum (a stale copy right after a publication)", async () => {
    const horloge = { t: Date.UTC(2026, 10, 22, 6) };
    const cache = partage(horloge);
    const g = github();
    const { fragment } = publier(g, "2026-11-22");
    g.fichiers.set("noms/ab/cd.json", "[]");
    const { l, journal } = lecteur(g, { memoriser: cache.memoriser, horloge });
    expect(await l.fichier("noms/ab/cd.json")).toEqual({ statut: "indisponible" });
    expect(journal).toEqual(["donnees : lecture en échec (noms/ab/cd.json : somme différente)"]);
    expect([...cache.entrees.keys()].some((k) => k.includes("cd.json"))).toBe(false);
    // Read again at the next request, and served once it matches.
    g.fichiers.set("noms/ab/cd.json", fragment);
    expect(await l.fichier("noms/ab/cd.json")).toMatchObject({ statut: "ok", date: "2026-11-22" });
  });

  it("reads a changed file again; an unchanged one is not read, and takes the new day", async () => {
    const g = github();
    publier(g, "2026-11-21", { nom: "a" });
    const { l, horloge } = lecteur(g);
    await l.fichier("noms/ab/cd.json");
    // The next day, the same content: only etat.json is read.
    publier(g, "2026-11-22", { nom: "a" });
    horloge.t += HEURE;
    expect(await l.fichier("noms/ab/cd.json")).toEqual({ statut: "ok", donnees: [{ nom: "a" }], date: "2026-11-22" });
    expect(g.lus).toEqual(["etat.json", "noms/ab/sommes.json", "noms/ab/cd.json", "etat.json"]);
    // A new content that cannot be read: the copy read for the day before, with that day.
    publier(g, "2026-11-23", { nom: "b" });
    g.fichiers.set("noms/ab/cd.json", 503);
    horloge.t += HEURE;
    expect(await l.fichier("noms/ab/cd.json")).toEqual({ statut: "ok", donnees: [{ nom: "a" }], date: "2026-11-22" });
    // Once it can be read: the new content, with its day.
    publier(g, "2026-11-23", { nom: "b" });
    expect(await l.fichier("noms/ab/cd.json")).toEqual({ statut: "ok", donnees: [{ nom: "b" }], date: "2026-11-23" });
  });

  it("serves a new function instance from the shared cache, and keeps it when GitHub fails", async () => {
    const horloge = { t: Date.UTC(2026, 10, 22, 6) };
    const cache = partage(horloge);
    const g = github();
    publier(g, "2026-11-22");
    await lecteur(g, { memoriser: cache.memoriser, horloge }).l.fichier("noms/ab/cd.json");
    expect(g.lus).toHaveLength(3);
    // GitHub fails; a new instance (a cold start) still serves the state, without reading GitHub.
    for (const chemin of ["etat.json", "noms/ab/sommes.json", "noms/ab/cd.json"]) g.fichiers.set(chemin, 429);
    const froid = lecteur(g, { memoriser: cache.memoriser, horloge });
    expect(await froid.l.fichier("noms/ab/cd.json")).toMatchObject({ statut: "ok", date: "2026-11-22" });
    expect(g.lus).toHaveLength(3);
    // An hour later: the shared copy is served while GitHub is asked again (once, failing, logged), then not for a minute.
    horloge.t += HEURE;
    expect(await froid.l.etat()).toMatchObject({ statut: "ok", date: "2026-11-22" });
    expect(g.combien("etat.json")).toBe(2);
    expect(froid.journal).toEqual(["donnees : lecture en échec (etat.json : HTTP 429)"]);
    horloge.t += ATTENTE_MS - 1000;
    await froid.l.etat();
    expect(g.combien("etat.json")).toBe(2);
  });

  it("keeps a bounded number of files in memory", async () => {
    const g = github();
    publier(g, "2026-11-22");
    const horloge = { t: Date.UTC(2026, 10, 22, 6) };
    const journal: string[] = [];
    const l = new LecteurDonnees({
      fetch: g.fetch,
      maintenant: () => horloge.t,
      env: OUVERT,
      journal: (ligne) => journal.push(ligne),
      memoriser: direct,
      fichiersEnMemoire: 2,
    });
    await l.fichier("noms/ab/cd.json");
    await l.fichier("agregats/chiffres.json");
    // Three files for two places: the least recently used leaves first (the folder's checksums, then the fragment
    // when they come back), and is read again when it is asked for.
    await l.fichier("noms/ab/cd.json");
    expect(g.combien("noms/ab/sommes.json")).toBe(2);
    expect(g.combien("noms/ab/cd.json")).toBe(2);
    expect(g.combien("agregats/chiffres.json")).toBe(1);
  });

  it("checks etat.json at the border", () => {
    const somme = "a".repeat(64);
    expect(lireEtatPublie(null)).toBeNull();
    expect(lireEtatPublie([])).toBeNull();
    expect(lireEtatPublie({ statut: "ok", date: "22/11/2026", sommes: {} })).toBeNull();
    expect(lireEtatPublie({ statut: 1, date: "2026-11-22", sommes: {} })).toBeNull();
    expect(lireEtatPublie({ statut: "ok", date: "2026-11-22", sommes: [] })).toBeNull();
    const etat = lireEtatPublie({
      statut: "ok",
      date: "2026-11-22",
      sommes: { "noms/ab/sommes.json": somme, "../x.json": somme, "noms/cd/sommes.json": "nope", "a.json": 1 },
    });
    expect(etat?.sommes).toEqual({ "noms/ab/sommes.json": somme });
  });
});
