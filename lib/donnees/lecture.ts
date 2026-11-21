// The site reads Sovermap's data (brief B.9, plan § 4 and § 11): by the server only, from the published branch
// « donnees » on raw.githubusercontent.com, never from the browser. Two caches, and both keep only what was read well:
// - Next's data cache (`unstable_cache`: on Vercel, shared by the functions and kept across deployments): etat.json is
//   read from GitHub at most once an hour, every other file once per checksum; when a read fails, the last state read
//   well keeps being served (Next keeps a stale entry when its revalidation fails);
// - a copy in the function's memory in front of it, so that a page does not read the shared cache for etat.json and the
//   folders' checksums at every request (the free plan's quotas, plan § 11).
// Every file is checked against its checksum (etat.json gives those of the folders' sommes.json and of the top-level
// files, a folder's sommes.json those of its fragments): a file that does not match is never kept. Every failed read (a
// 429, a 5xx, a network error, a file that does not match) is written to the server's logs. Behind the closed
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
  sommes: Record<string, string>;
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
/** After a failed read, or a shared copy older than an hour, the shared cache is asked again a minute later at most. */
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

/** etat.json checked field by field; a checksum that is not one, or a path that is not a data path, is left out. */
export function lireEtatPublie(valeur: unknown): EtatPublie | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const brut = valeur as Record<string, unknown>;
  const { date, statut, sommes } = brut;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof statut !== "string") return null;
  if (typeof sommes !== "object" || sommes === null || Array.isArray(sommes)) return null;
  const propres: Record<string, string> = {};
  for (const [chemin, somme] of Object.entries(sommes)) {
    if (MOTIF_CHEMIN.test(chemin) && typeof somme === "string" && MOTIF_SOMME.test(somme)) propres[chemin] = somme;
  }
  return { date, statut, sommes: propres, brut };
}

/** etat.json as read from GitHub, and when: the age of a shared copy decides whether it is read again. */
type EtatLu = { brut: unknown; luA: number };
type Copie = { somme: string; valeur: unknown; date: string };

export class LecteurDonnees {
  #etat: { etat: EtatPublie; luA: number } | null = null;
  #essaiSuivant = 0;
  readonly #fichiers = new Map<string, Copie>();
  readonly #deps: Dependances;
  readonly #etatPartage: () => Promise<EtatLu>;
  readonly #fichierPartage: (chemin: string, somme: string) => Promise<unknown>;

  constructor(deps: Dependances) {
    this.#deps = deps;
    // The version in the keys changes when what is kept changes: an entry kept by an older deployment is never misread.
    this.#etatPartage = deps.memoriser(() => this.#lireEtat(), ["sovermap-donnees", "etat", "1"], {
      revalidate: DUREE_ETAT_S,
    });
    this.#fichierPartage = deps.memoriser(
      (chemin: string, somme: string) => this.#lireFichier(chemin, somme),
      ["sovermap-donnees", "fichier", "1"],
      { revalidate: false },
    );
  }

  /** A failed read, written to the server's logs (a path and a code: nothing personal). */
  #echec(chemin: string, raison: string): Error {
    this.#deps.journal(`donnees : lecture en échec (${chemin} : ${raison})`);
    return new Error(`lecture en échec : ${chemin}`);
  }

  async #lire(chemin: string): Promise<string> {
    const adresse = adresseDonnees(chemin, this.#deps.env);
    if (adresse === null) throw this.#echec(chemin, "configuration");
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
        raison = "fichier trop grand";
      } else {
        raison = `HTTP ${reponse.status}`;
      }
    } catch (erreur) {
      raison = erreur instanceof Error ? erreur.name : "erreur";
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
    if (lireEtatPublie(brut) === null) throw this.#echec("etat.json", "fichier illisible");
    return { brut, luA: this.#deps.maintenant() };
  }

  async #lireFichier(chemin: string, somme: string): Promise<unknown> {
    const texte = await this.#lire(chemin);
    if (sha256(texte) !== somme) throw this.#echec(chemin, "somme différente");
    try {
      return JSON.parse(texte) as unknown;
    } catch {
      throw this.#echec(chemin, "fichier illisible");
    }
  }

  /** The published state, or the last one read well; read from GitHub at most once an hour. */
  async etat(): Promise<Lecture<EtatPublie>> {
    if (!sitePublic(this.#deps.env)) return { statut: "porte fermée" };
    const maintenant = this.#deps.maintenant();
    const frais = (luA: number) => maintenant - luA < DUREE_ETAT_S * 1000;
    if ((this.#etat === null || !frais(this.#etat.luA)) && maintenant >= this.#essaiSuivant) {
      try {
        const lu = await this.#etatPartage();
        const etat = lireEtatPublie(lu.brut);
        if (etat !== null && typeof lu.luA === "number" && (this.#etat === null || lu.luA >= this.#etat.luA)) {
          this.#etat = { etat, luA: lu.luA };
        }
        // A shared copy older than an hour: GitHub is being read again, or failing; asked again in a minute.
        if (!frais(lu.luA)) this.#essaiSuivant = maintenant + ATTENTE_MS;
      } catch {
        // No shared copy, and GitHub failed (logged by the read): the copy in memory, if any.
        this.#essaiSuivant = maintenant + ATTENTE_MS;
      }
    }
    const copie = this.#etat;
    return copie === null ? { statut: "indisponible" } : { statut: "ok", donnees: copie.etat, date: copie.etat.date };
  }

  #garder(chemin: string, copie: Copie) {
    this.#fichiers.delete(chemin);
    this.#fichiers.set(chemin, copie);
    if (this.#fichiers.size > (this.#deps.fichiersEnMemoire ?? FICHIERS_EN_MEMOIRE)) {
      const premier = this.#fichiers.keys().next();
      if (premier.done !== true) this.#fichiers.delete(premier.value);
    }
  }

  /** A file for `somme`; if it cannot be read, the copy of an earlier checksum, with the day it was read for. */
  async #fichier(chemin: string, somme: string, date: string): Promise<Copie | null> {
    const copie = this.#fichiers.get(chemin);
    if (copie?.somme !== somme) {
      try {
        const valeur = await this.#fichierPartage(chemin, somme);
        this.#garder(chemin, { somme, valeur, date });
        return { somme, valeur, date };
      } catch {
        return copie ?? null;
      }
    }
    this.#garder(chemin, { ...copie, date });
    return { ...copie, date };
  }

  /**
   * A published file: an aggregate, an index, the journal, or a folder's fragment (noms/<aa>/<bb>.json, and its parts
   * <bb>.1.json…), each checked against its checksum.
   */
  async fichier(chemin: string): Promise<Lecture<unknown>> {
    const etat = await this.etat();
    if (etat.statut !== "ok") return etat;
    let date = etat.date;
    let somme = etat.donnees.sommes[chemin];
    const fragment = MOTIF_FRAGMENT.exec(chemin);
    if (somme === undefined && fragment !== null) {
      const [, dossier = "", nom = ""] = fragment;
      const sommeDossier = etat.donnees.sommes[`${dossier}/sommes.json`];
      const table =
        sommeDossier === undefined ? null : await this.#fichier(`${dossier}/sommes.json`, sommeDossier, date);
      const valeur =
        table !== null && typeof table.valeur === "object"
          ? (table.valeur as Record<string, unknown> | null)?.[nom]
          : undefined;
      if (table !== null && typeof valeur === "string" && MOTIF_SOMME.test(valeur)) {
        somme = valeur;
        date = table.date;
      }
    }
    if (somme === undefined) return { statut: "indisponible" };
    const lu = await this.#fichier(chemin, somme, date);
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
