// The site reads Sovermap's data (brief B.9, plan § 4 and § 11): by the server only, from the published branch
// « donnees » on raw.githubusercontent.com, never from the browser. Two caches, and both keep only what was read well:
// - Next's data cache (`unstable_cache`: on Vercel, shared by the functions and kept across deployments): etat.json is
//   read from GitHub at most once an hour, every other file once per checksum, and the state of each day is kept under
//   its date; when a read fails, the last state read well keeps being served (Next keeps a stale entry when its
//   revalidation fails);
// - a copy in the function's memory in front of it, so that a page does not read the shared cache for etat.json and the
//   folders' checksums at every request (the free plan's quotas, plan § 11).
// Every file is checked against its checksum (etat.json gives those of the folders' sommes.json and of the top-level
// files, a folder's sommes.json those of its fragments): a file that does not match is never kept. A file of the day
// that cannot be read gives way to its version of the day before, from the caches only, with that day; a file that is
// no longer published is never served. Every failed read (a 429, a 5xx, a network error, a file that does not match) is
// written to the server's logs; after it, GitHub is left alone for a minute (all of it after a 429, a 5xx or a network
// error; that file only otherwise). Behind the closed production door, nothing is read at all (lib/porte.ts).
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
  /** Days published in a row, this one included (1 after a gap): from 2, the day before is the previous published. */
  jours: number;
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
const ANCIENS_EN_MEMOIRE = 3;

const MOTIF_COMPTE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const MOTIF_CHEMIN = /^[a-z0-9_-]+(?:\/[a-z0-9_.-]+)*\.json$/;
const MOTIF_SOMME = /^[0-9a-f]{64}$/;
const MOTIF_DATE = /^\d{4}-\d{2}-\d{2}$/;
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
/** The calendar day before a date (YYYY-MM-DD, UTC). */
const veilleDe = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** etat.json checked field by field; a checksum that is not one, or a path that is not a data path, is left out. */
export function lireEtatPublie(valeur: unknown): EtatPublie | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const brut = valeur as Record<string, unknown>;
  const date = propre(brut, "date");
  const statut = propre(brut, "statut");
  const sommes = propre(brut, "sommes");
  const jours = propre(brut, "jours");
  if (typeof date !== "string" || !MOTIF_DATE.test(date) || typeof statut !== "string") return null;
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return null;
  if (typeof sommes !== "object" || sommes === null || Array.isArray(sommes)) return null;
  const propres: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [chemin, somme] of Object.entries(sommes)) {
    if (MOTIF_CHEMIN.test(chemin) && typeof somme === "string" && MOTIF_SOMME.test(somme)) propres[chemin] = somme;
  }
  return {
    date,
    statut,
    jours: typeof jours === "number" && Number.isInteger(jours) && jours >= 1 ? jours : 1,
    sommes: propres,
    brut,
  };
}

/** etat.json as read from GitHub, and when (the age of a shared copy decides whether it is read again). */
type EtatLu = { brut: unknown; luA: number };
/** A version of a file: read, absent from that state (never served from another day), or unreadable. */
type Version = { valeur: unknown; date: string } | "absent" | "illisible";

export class LecteurDonnees {
  #etat: { etat: EtatPublie; luA: number } | null = null;
  /** The states of the days before, kept in memory when the day changes (the latest few). */
  readonly #anciens = new Map<string, EtatPublie>();
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
  readonly #etatDuJourPartage: (date: string) => Promise<unknown>;
  readonly #fichierPartage: (chemin: string, somme: string) => Promise<unknown>;

  constructor(deps: Dependances) {
    this.#deps = deps;
    // The keys name the account by a fingerprint (what is read depends on it; Next may print a key in the logs) and a
    // version, changed when what is kept changes: an entry kept by an older deployment is never misread.
    const compte = sha256(deps.env["SOVERMAP_GITHUB_OWNER"]?.trim() ?? "").slice(0, 16);
    this.#etatPartage = deps.memoriser(() => this.#lireEtat(), ["sovermap-donnees", "etat", "3", compte], {
      revalidate: DUREE_ETAT_S,
    });
    this.#etatDuJourPartage = deps.memoriser(
      (date: string) => this.#etatEnMemoire(date),
      ["sovermap-donnees", "etat-du-jour", "3", compte],
      { revalidate: false },
    );
    this.#fichierPartage = deps.memoriser(
      (chemin: string, somme: string) => this.#lireFichier(chemin, somme),
      ["sovermap-donnees", "fichier", "3", compte],
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
    if (lireEtatPublie(brut) === null) {
      this.#pauserChemin("etat.json", this.#deps.maintenant());
      throw this.#echec("etat.json", "fichier illisible");
    }
    return { brut, luA: this.#deps.maintenant() };
  }

  /**
   * The state of a day, for the shared cache: given only by a function that serves that very day, from its memory
   * (never read again from GitHub); for any other day, nothing (the shared cache has it, or nobody does).
   */
  async #etatEnMemoire(date: string): Promise<unknown> {
    const memoire = this.#etat;
    if (memoire === null || memoire.etat.date !== date) throw new Error(`pas en cache : ${date}`);
    return memoire.etat.brut;
  }

  /** Is this version of a file part of the state this function serves? Only those are read from GitHub. */
  #duJour(chemin: string, somme: string): boolean {
    const etat = this.#etat?.etat;
    if (etat === undefined) return false;
    if (propre(etat.sommes, chemin) === somme) return true;
    const fragment = MOTIF_FRAGMENT.exec(chemin);
    if (fragment === null) return false;
    const [, dossier = "", nom = ""] = fragment;
    const sommeDossier = propre(etat.sommes, `${dossier}/sommes.json`);
    if (typeof sommeDossier !== "string") return false;
    return propre(this.#fichiers.get(`${dossier}/sommes.json\n${sommeDossier}`), nom) === somme;
  }

  async #lireFichier(chemin: string, somme: string): Promise<unknown> {
    // A version of another day is in the shared cache, or nowhere: GitHub only has today's.
    if (!this.#duJour(chemin, somme)) throw new Error(`pas en cache : ${chemin}`);
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
  #retenir(lu: EtatLu): boolean {
    const etat = lireEtatPublie(lu.brut);
    if (etat === null || typeof lu.luA !== "number") return false;
    const memoire = this.#etat;
    if (memoire !== null && etat.date < memoire.etat.date) {
      this.#etat = { ...memoire, luA: Math.max(memoire.luA, lu.luA) };
      return false;
    }
    if (memoire !== null && etat.date === memoire.etat.date && lu.luA < memoire.luA) return false;
    if (memoire !== null && memoire.etat.date < etat.date) {
      this.#anciens.set(memoire.etat.date, memoire.etat);
      for (const date of [...this.#anciens.keys()].sort().slice(0, -ANCIENS_EN_MEMOIRE)) this.#anciens.delete(date);
    }
    this.#etat = { etat, luA: lu.luA };
    return memoire === null || memoire.etat.date !== etat.date;
  }

  async #rafraichir(maintenant: number): Promise<void> {
    try {
      const lu = await this.#etatPartage();
      // A new day for this function: its state is kept in the shared cache under its date, for the days after.
      if (this.#retenir(lu) && this.#etat !== null)
        await this.#etatDuJourPartage(this.#etat.etat.date).catch(() => null);
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

  /** The state of the day before the one served: from memory, else from the shared cache; null if unknown. */
  async #veille(etat: EtatPublie): Promise<EtatPublie | null> {
    const anterieurs = [...this.#anciens.keys()].filter((date) => date < etat.date).sort();
    const date = etat.jours >= 2 ? veilleDe(etat.date) : anterieurs.at(-1);
    if (date === undefined) return null;
    const enMemoire = this.#anciens.get(date);
    if (enMemoire !== undefined) return enMemoire;
    try {
      const veille = lireEtatPublie(await this.#etatDuJourPartage(date));
      return veille !== null && veille.date === date ? veille : null;
    } catch {
      return null;
    }
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

  /** The checksum of a file in a state (from etat.json, or from its folder's sommes.json), or why there is none. */
  async #somme(chemin: string, etat: EtatPublie): Promise<string | "absent" | "illisible"> {
    const directe = propre(etat.sommes, chemin);
    if (typeof directe === "string") return directe;
    const fragment = MOTIF_FRAGMENT.exec(chemin);
    if (fragment === null) return "absent";
    const [, dossier = "", nom = ""] = fragment;
    const sommeDossier = propre(etat.sommes, `${dossier}/sommes.json`);
    if (typeof sommeDossier !== "string") return "absent";
    const table = await this.#fichierLu(`${dossier}/sommes.json`, sommeDossier);
    if (table === undefined) return "illisible";
    const somme = propre(table, nom);
    return typeof somme === "string" && MOTIF_SOMME.test(somme) ? somme : "absent";
  }

  async #version(chemin: string, etat: EtatPublie): Promise<Version> {
    const somme = await this.#somme(chemin, etat);
    if (somme === "absent" || somme === "illisible") return somme;
    const valeur = await this.#fichierLu(chemin, somme);
    return valeur === undefined ? "illisible" : { valeur, date: etat.date };
  }

  /**
   * A published file: an aggregate, an index, the journal, or a folder's fragment (noms/<aa>/<bb>.json, and its parts
   * <bb>.1.json…), checked against its checksum. If today's version cannot be read, yesterday's, from the caches only,
   * with its day; a file that is no longer published is never served.
   */
  async fichier(chemin: string): Promise<Lecture<unknown>> {
    if (!MOTIF_CHEMIN.test(chemin)) {
      return sitePublic(this.#deps.env) ? { statut: "indisponible" } : { statut: "porte fermée" };
    }
    const etat = await this.etat();
    if (etat.statut !== "ok") return etat;
    let lu = await this.#version(chemin, etat.donnees);
    if (lu === "illisible") {
      const veille = await this.#veille(etat.donnees);
      lu = veille === null ? "illisible" : await this.#version(chemin, veille);
    }
    return typeof lu === "object" ? { statut: "ok", donnees: lu.valeur, date: lu.date } : { statut: "indisponible" };
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
