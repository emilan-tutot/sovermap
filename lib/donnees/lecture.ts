// The site reads Sovermap's data (brief B.9, plan § 4 and § 11): by the server only, from the published branch
// « donnees » on raw.githubusercontent.com, never from the browser. Two caches, and both keep only what was read well:
// - Next's data cache (`unstable_cache`: on Vercel, shared by the functions and kept across deployments): etat.json is
//   read from GitHub at most once an hour, every other file once per checksum; when a read fails, the last state read
//   well keeps being served (Next keeps a stale entry when its revalidation fails). The entry of etat.json also carries
//   the state of the day before, so that a function that has just started can serve yesterday's version of a file that
//   cannot be read today;
// - a copy in the function's memory in front of it, so that a page does not read the shared cache for etat.json and the
//   folders' checksums at every request (the free plan's quotas, plan § 11).
// Every file is checked against its checksum (etat.json gives those of the folders' sommes.json and of the top-level
// files, a folder's sommes.json those of its fragments): a file that does not match is never kept. Every failed read (a
// 429, a 5xx, a network error, a file that does not match) is written to the server's logs; after it, GitHub is left
// alone for a minute (all of it after a 429, a 5xx or a network error; that file only otherwise). Behind the closed
// production door, nothing is read at all (lib/porte.ts).
import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import paquet from "@/package.json";
import { agentUtilisateur } from "@/pipeline/sources";
import { sitePublic } from "@/lib/site";

type Env = Readonly<Record<string, string | undefined>>;

/** What a page gets: the data and the day of the collection it comes from (the Quality page says it), or nothing. */
export type Lecture<T> =
  { statut: "ok"; donnees: T; date: string } | { statut: "porte fermée" } | { statut: "indisponible" };

/** etat.json, checked at the border: its day, its status, and the checksums of the files it publishes. */
export type EtatPublie = {
  date: string;
  statut: string;
  /** Path of a published file (a folder's sommes.json, an aggregate, an index, the journal) → its SHA-256. */
  sommes: Readonly<Record<string, string>>;
  /** The whole file, for the pages that show more of it (the Quality page). */
  brut: Record<string, unknown>;
};

/**
 * Next's data cache, or a stand-in in the tests: keeps what `f` returns, never what it throws, under `cle` and the
 * arguments; after `revalidate` seconds, the entry is served once more while it is read again, and kept if that fails.
 */
export type Memoriser = <A extends string[], T>(
  f: (...args: A) => Promise<T>,
  cle: string[],
  options: { revalidate: number | false },
) => (...args: A) => Promise<T>;

export type Dependances = {
  fetch: typeof fetch;
  /** Milliseconds since 1970. */
  maintenant: () => number;
  env: Env;
  /** The server's logs. */
  journal: (ligne: string) => void;
  memoriser: Memoriser;
  /** Files kept in memory at most (the least recently used one leaves first). */
  fichiersEnMemoire?: number;
};

/** etat.json is read from GitHub at most once an hour. */
export const DUREE_ETAT_S = 3600;
/** After a failed read, GitHub is left alone for a minute; so is the shared cache, when its etat.json is old. */
export const ATTENTE_MS = 60_000;
export const FICHIERS_EN_MEMOIRE = 2000;
const DELAI_LECTURE_MS = 8000;
const TAILLE_MAX = 2 * 1024 * 1024;

const MOTIF_COMPTE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const MOTIF_CHEMIN = /^[a-z0-9_-]+(?:\/[a-z0-9_.-]+)*\.json$/;
const MOTIF_SOMME = /^[0-9a-f]{64}$/;
const MOTIF_FRAGMENT = /^((?:noms|domaines)\/[0-9a-f]{2})\/([0-9a-f]{2}(?:\.\d+)?\.json)$/;

/** The address of a published file, or null when the account (configuration) or the path is not as expected. */
export function adresseDonnees(chemin: string, env: Env): string | null {
  const compte = env["SOVERMAP_GITHUB_OWNER"]?.trim() ?? "";
  if (!MOTIF_COMPTE.test(compte) || !MOTIF_CHEMIN.test(chemin) || chemin.includes("..")) return null;
  return `https://raw.githubusercontent.com/${compte}/sovermap/donnees/${chemin}`;
}

const sha256 = (texte: string) => createHash("sha256").update(texte, "utf8").digest("hex");
const propre = (table: unknown, cle: string): unknown =>
  typeof table === "object" && table !== null && Object.hasOwn(table, cle)
    ? (table as Record<string, unknown>)[cle]
    : undefined;

/** etat.json checked field by field; a checksum that is not one, or a path that is not a data path, is left out. */
export function lireEtatPublie(valeur: unknown): EtatPublie | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const brut = valeur as Record<string, unknown>;
  const date = propre(brut, "date");
  const statut = propre(brut, "statut");
  const sommes = propre(brut, "sommes");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof statut !== "string") return null;
  if (typeof sommes !== "object" || sommes === null || Array.isArray(sommes)) return null;
  const propres: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [chemin, somme] of Object.entries(sommes)) {
    if (MOTIF_CHEMIN.test(chemin) && typeof somme === "string" && MOTIF_SOMME.test(somme)) propres[chemin] = somme;
  }
  return { date, statut, sommes: propres, brut };
}

/** etat.json as read from GitHub, when, and the state of the day before (to serve yesterday's files if need be). */
type EtatLu = { brut: unknown; luA: number; precedent: unknown };
type EtatRetenu = { etat: EtatPublie; luA: number; precedent: EtatPublie | null };

export class LecteurDonnees {
  #etat: EtatRetenu | null = null;
  #essaiSuivant = 0;
  #etatEnCours: Promise<void> | null = null;
  /** No read from GitHub before this time (after a 429, a 5xx, a network error, a missing configuration). */
  #pause = 0;
  readonly #pausesChemin = new Map<string, number>();
  /** Files read well, by path and checksum (the least recently used one leaves first). */
  readonly #fichiers = new Map<string, unknown>();
  readonly #fichiersEnCours = new Map<string, Promise<unknown>>();
  readonly #deps: Dependances;
  readonly #etatPartage: () => Promise<EtatLu>;
  readonly #fichierPartage: (chemin: string, somme: string) => Promise<unknown>;

  constructor(deps: Dependances) {
    this.#deps = deps;
    // The keys name the account by a fingerprint (what is read depends on it; Next may print a key in the logs) and a
    // version, changed when what is kept changes: an entry kept by an older deployment is never misread.
    const compte = sha256(deps.env["SOVERMAP_GITHUB_OWNER"]?.trim() ?? "").slice(0, 16);
    this.#etatPartage = deps.memoriser(() => this.#lireEtat(), ["sovermap-donnees", "etat", "2", compte], {
      revalidate: DUREE_ETAT_S,
    });
    this.#fichierPartage = deps.memoriser(
      (chemin: string, somme: string) => this.#lireFichier(chemin, somme),
      ["sovermap-donnees", "fichier", "2", compte],
      { revalidate: false },
    );
  }

  /** A failed read, written to the server's logs (a path and a code: nothing personal). */
  #echec(chemin: string, raison: string): Error {
    this.#deps.journal(`donnees : lecture en échec (${chemin} : ${raison})`);
    return new Error(`lecture en échec : ${chemin}`);
  }

  /** A pause on this path only: the file was there but wrong (unreadable, another checksum, missing). */
  #pauserChemin(chemin: string, maintenant: number) {
    if (this.#pausesChemin.size >= 1000) {
      for (const [cle, fin] of this.#pausesChemin) if (fin <= maintenant) this.#pausesChemin.delete(cle);
    }
    this.#pausesChemin.set(chemin, maintenant + ATTENTE_MS);
  }

  async #lire(chemin: string): Promise<string> {
    const maintenant = this.#deps.maintenant();
    // Within a pause, nothing is asked (the failure that started it was logged).
    if (maintenant < this.#pause || maintenant < (this.#pausesChemin.get(chemin) ?? 0)) {
      throw new Error(`en pause : ${chemin}`);
    }
    const adresse = adresseDonnees(chemin, this.#deps.env);
    if (adresse === null) {
      this.#pause = maintenant + ATTENTE_MS;
      throw this.#echec(chemin, "configuration");
    }
    let raison: string;
    try {
      const reponse = await this.#deps.fetch(adresse, {
        redirect: "error",
        headers: { "User-Agent": agentUtilisateur(paquet.version) },
        signal: AbortSignal.timeout(DELAI_LECTURE_MS),
      });
      if (reponse.ok) {
        const texte = await reponse.text();
        if (texte.length <= TAILLE_MAX) return texte;
        this.#pauserChemin(chemin, maintenant);
        throw this.#echec(chemin, "fichier trop grand");
      }
      raison = `HTTP ${reponse.status}`;
      if (reponse.status === 429 || reponse.status >= 500) this.#pause = maintenant + ATTENTE_MS;
      else this.#pauserChemin(chemin, maintenant);
    } catch (erreur) {
      if (erreur instanceof Error && erreur.message.startsWith("lecture en échec")) throw erreur;
      raison = erreur instanceof Error ? erreur.name : "erreur";
      this.#pause = maintenant + ATTENTE_MS;
    }
    throw this.#echec(chemin, raison);
  }

  async #lireEtat(): Promise<EtatLu> {
    const texte = await this.#lire("etat.json");
    let brut: unknown = null;
    try {
      brut = JSON.parse(texte);
    } catch {
      brut = null;
    }
    const etat = lireEtatPublie(brut);
    if (etat === null) {
      this.#pauserChemin("etat.json", this.#deps.maintenant());
      throw this.#echec("etat.json", "fichier illisible");
    }
    // The state of the day before goes with it: the one this function serves, if it is of an older day; else the one
    // that one carries. A function that has read nothing yet has none.
    const memoire = this.#etat;
    const precedent =
      memoire === null ? null : memoire.etat.date < etat.date ? memoire.etat.brut : (memoire.precedent?.brut ?? null);
    return { brut, luA: this.#deps.maintenant(), precedent };
  }

  async #lireFichier(chemin: string, somme: string): Promise<unknown> {
    const texte = await this.#lire(chemin);
    const maintenant = this.#deps.maintenant();
    if (sha256(texte) !== somme) {
      this.#pauserChemin(chemin, maintenant);
      throw this.#echec(chemin, "somme différente");
    }
    try {
      return JSON.parse(texte) as unknown;
    } catch {
      this.#pauserChemin(chemin, maintenant);
      throw this.#echec(chemin, "fichier illisible");
    }
  }

  /** Takes a state from the shared cache; never goes back to an older day (a stale copy of raw.githubusercontent.com). */
  #retenir(lu: EtatLu) {
    const etat = lireEtatPublie(lu.brut);
    if (etat === null || typeof lu.luA !== "number") return;
    const memoire = this.#etat;
    if (memoire !== null && etat.date < memoire.etat.date) {
      this.#etat = { ...memoire, luA: Math.max(memoire.luA, lu.luA) };
      return;
    }
    if (memoire !== null && etat.date === memoire.etat.date && lu.luA < memoire.luA) return;
    const porte = lireEtatPublie(lu.precedent);
    const precedent =
      porte !== null && porte.date < etat.date
        ? porte
        : memoire !== null && memoire.etat.date < etat.date
          ? memoire.etat
          : (memoire?.precedent ?? null);
    this.#etat = { etat, luA: lu.luA, precedent };
  }

  async #rafraichir(maintenant: number): Promise<void> {
    try {
      const lu = await this.#etatPartage();
      this.#retenir(lu);
      // A shared copy older than an hour: GitHub is being read again, or failing; the shared cache is asked a minute
      // later.
      if (maintenant - lu.luA >= DUREE_ETAT_S * 1000) this.#essaiSuivant = maintenant + ATTENTE_MS;
    } catch {
      // No shared copy, and GitHub failed (logged by the read): the copy in memory, if any.
      this.#essaiSuivant = maintenant + ATTENTE_MS;
    }
  }

  /** The published state, or the last one read well; read from GitHub at most once an hour. */
  async etat(): Promise<Lecture<EtatPublie>> {
    if (!sitePublic(this.#deps.env)) return { statut: "porte fermée" };
    const maintenant = this.#deps.maintenant();
    const memoire = this.#etat;
    const frais = memoire !== null && maintenant - memoire.luA < DUREE_ETAT_S * 1000;
    if (!frais && maintenant >= this.#essaiSuivant) {
      // One read at a time: the requests that come meanwhile wait for it.
      this.#etatEnCours ??= this.#rafraichir(maintenant).finally(() => {
        this.#etatEnCours = null;
      });
      await this.#etatEnCours;
    }
    const copie = this.#etat;
    return copie === null ? { statut: "indisponible" } : { statut: "ok", donnees: copie.etat, date: copie.etat.date };
  }

  #garder(cle: string, valeur: unknown) {
    this.#fichiers.delete(cle);
    this.#fichiers.set(cle, valeur);
    if (this.#fichiers.size > (this.#deps.fichiersEnMemoire ?? FICHIERS_EN_MEMOIRE)) {
      const premier = this.#fichiers.keys().next();
      if (premier.done !== true) this.#fichiers.delete(premier.value);
    }
  }

  /** A file for this checksum, from memory, from a read under way, or from the shared cache; undefined if unreadable. */
  async #fichierLu(chemin: string, somme: string): Promise<unknown> {
    const cle = `${chemin}\n${somme}`;
    if (this.#fichiers.has(cle)) {
      const valeur = this.#fichiers.get(cle);
      this.#garder(cle, valeur);
      return valeur;
    }
    let enCours = this.#fichiersEnCours.get(cle);
    if (enCours === undefined) {
      enCours = this.#fichierPartage(chemin, somme)
        .then(
          (valeur) => {
            this.#garder(cle, valeur);
            return valeur;
          },
          () => undefined,
        )
        .finally(() => this.#fichiersEnCours.delete(cle));
      this.#fichiersEnCours.set(cle, enCours);
    }
    return enCours;
  }

  /** The checksum of a published file in a state: from etat.json, or from its folder's sommes.json. */
  async #somme(chemin: string, etat: EtatPublie): Promise<string | null> {
    const directe = propre(etat.sommes, chemin);
    if (typeof directe === "string") return directe;
    const fragment = MOTIF_FRAGMENT.exec(chemin);
    if (fragment === null) return null;
    const [, dossier = "", nom = ""] = fragment;
    const sommeDossier = propre(etat.sommes, `${dossier}/sommes.json`);
    if (typeof sommeDossier !== "string") return null;
    const table = await this.#fichierLu(`${dossier}/sommes.json`, sommeDossier);
    const somme = propre(table, nom);
    return typeof somme === "string" && MOTIF_SOMME.test(somme) ? somme : null;
  }

  async #version(chemin: string, etat: EtatPublie): Promise<{ valeur: unknown; date: string } | null> {
    const somme = await this.#somme(chemin, etat);
    if (somme === null) return null;
    const valeur = await this.#fichierLu(chemin, somme);
    return valeur === undefined ? null : { valeur, date: etat.date };
  }

  /**
   * A published file: an aggregate, an index, the journal, or a folder's fragment (noms/<aa>/<bb>.json, and its parts
   * <bb>.1.json…), checked against its checksum; if today's version cannot be read, yesterday's, with its day.
   */
  async fichier(chemin: string): Promise<Lecture<unknown>> {
    if (!MOTIF_CHEMIN.test(chemin) || chemin === "etat.json") {
      return sitePublic(this.#deps.env) ? { statut: "indisponible" } : { statut: "porte fermée" };
    }
    const etat = await this.etat();
    if (etat.statut !== "ok") return etat;
    const precedent = this.#etat?.precedent ?? null;
    const lu =
      (await this.#version(chemin, etat.donnees)) ??
      (precedent === null ? null : await this.#version(chemin, precedent));
    return lu === null ? { statut: "indisponible" } : { statut: "ok", donnees: lu.valeur, date: lu.date };
  }
}

/** The server's reader: one per function instance, in front of Next's data cache. */
export const lecteur = new LecteurDonnees({
  fetch: (entree, init) => fetch(entree, init),
  maintenant: () => Date.now(),
  env: process.env,
  journal: (ligne) => console.warn(ligne),
  memoriser: (f, cle, options) => unstable_cache(f, cle, options),
});
