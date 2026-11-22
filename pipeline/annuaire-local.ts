// The DILA's local administrations directory (docs/sources.md, card 50), through the copy the DINUM publishes on
// Hugging Face: two Parquet files, read by byte ranges, one useful column at a time. No range ever leaves the useful
// columns (checked before it is asked): never the people in charge, the e-mails, the phone numbers, the text or the
// vectors. The footer's statistics hold one value of every column, e-mails included: they are dropped as soon as the
// footer is parsed, and never printed or written. Every request goes through the collection's polite downloader
// (robots.txt of every host and every hop, one second at least between two requests to one host).
import { parquetMetadata, parquetReadObjects } from "hyparquet";
import type { AsyncBuffer, ColumnMetaData, FileMetaData } from "hyparquet";
import { zstdDecompressSync } from "node:zlib";
import type { Reponse } from "./sources";

export const JEU = "AgentPublic/local-administrations-directory";
export const DOSSIER = "data/local-administrations-directory-latest";
/** The useful columns (brief C.6), and nothing else. */
export const COLONNES = ["name", "types", "urls", "siren", "siret", "addresses", "modification_date"] as const;
type Colonne = (typeof COLONNES)[number];

/** The polite downloader of the collection (pipeline/sources.ts), or a stand-in in the tests. */
export type Obtenir = (adresse: string, entetes?: Record<string, string>) => Promise<Reponse>;

export type FichierCopie = { chemin: string; taille: number; sha256: string; commit: string; date: string };

/** A local office as Sovermap keeps it: what links a website to a place, nothing about people. */
export type Guichet = {
  nom: string;
  type: string;
  /** Host names of its websites (lower case), from the « urls » column. */
  hotes: string[];
  siren: string | null;
  siret: string | null;
  commune: string | null;
  codePostal: string | null;
  /** Date of the office's last change in the directory (YYYY-MM-DD). */
  modification: string | null;
};

const texte = (v: unknown, max = 300): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;

/** The files of the current copy: path, size, SHA-256 and commit (to read each file by its commit, never by « main »). */
export async function copieCourante(obtenir: Obtenir): Promise<FichierCopie[]> {
  const r = await obtenir(`https://huggingface.co/api/datasets/${JEU}/tree/main/${DOSSIER}?expand=true`);
  if (r.statut !== 200) throw new Error(`liste de la copie : HTTP ${r.statut}`);
  const liste: unknown = JSON.parse(r.corps.toString("utf8"));
  if (!Array.isArray(liste)) throw new Error("liste de la copie illisible");
  const fichiers: FichierCopie[] = [];
  for (const f of liste) {
    if (typeof f !== "object" || f === null) continue;
    const o = f as Record<string, unknown>;
    const lfs = o["lfs"] as Record<string, unknown> | undefined;
    const commit = o["lastCommit"] as Record<string, unknown> | undefined;
    const chemin = texte(o["path"], 500);
    if (chemin === null || !/^data\/local-administrations-directory-latest\/[a-z0-9_]+\.parquet$/.test(chemin))
      continue;
    const sha256 = lfs?.["oid"];
    const id = commit?.["id"];
    const date = commit?.["date"];
    const taille = o["size"];
    if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`${chemin} : somme illisible`);
    if (typeof id !== "string" || !/^[0-9a-f]{40}$/.test(id)) throw new Error(`${chemin} : commit illisible`);
    // The date goes into a commit message and a summary: an exact ISO time, never in the future (a copy dated ahead
    // would make every later copy look older to the publishing job), or the copy is refused.
    const dateLisible =
      typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(date) &&
      !Number.isNaN(Date.parse(date)) &&
      Date.parse(date) <= Date.now() + 24 * 3600 * 1000;
    if (!dateLisible || typeof taille !== "number" || !Number.isSafeInteger(taille) || taille < 12) {
      throw new Error(`${chemin} : date ou taille illisible`);
    }
    fichiers.push({ chemin, taille, sha256, commit: id, date });
  }
  if (fichiers.length === 0) throw new Error("copie vide");
  return fichiers.sort((a, b) => a.chemin.localeCompare(b.chemin));
}

/** The footer's metadata, without any statistics (they hold values of the personal columns). */
export function sansStatistiques(meta: FileMetaData): FileMetaData {
  for (const groupe of meta.row_groups) {
    for (const morceau of groupe.columns) {
      if (morceau.meta_data === undefined) continue;
      delete morceau.meta_data.statistics;
      delete (morceau.meta_data as { size_statistics?: unknown }).size_statistics;
      delete (morceau.meta_data as { geospatial_statistics?: unknown }).geospatial_statistics;
    }
  }
  return meta;
}

/** A column chunk's byte range, where hyparquet reads it: from its dictionary page when it has one, else its data. */
function plageDe(m: ColumnMetaData): [number, number] {
  const debut = Number(m.dictionary_page_offset || m.data_page_offset);
  const fin = debut + Number(m.total_compressed_size);
  if (!Number.isSafeInteger(debut) || !Number.isSafeInteger(fin) || debut < 4 || fin <= debut) {
    throw new Error(`colonne ${m.path_in_schema[0] ?? "?"} : position illisible`);
  }
  return [debut, fin];
}

/**
 * The byte range of each useful column, in every row group: the only ranges that may be asked. The footer is not
 * trusted: a useful column's range that overlaps any other column's is refused, since it could hold that column's
 * values (people's names, e-mails).
 */
export function plagesPermises(meta: FileMetaData): Map<Colonne, [number, number][]> {
  const plages = new Map<Colonne, [number, number][]>();
  const autres: [number, number][] = [];
  for (const groupe of meta.row_groups) {
    for (const morceau of groupe.columns) {
      const m = morceau.meta_data;
      if (m === undefined) continue;
      const nom = m.path_in_schema[0] ?? "";
      if (!(COLONNES as readonly string[]).includes(nom)) {
        autres.push(plageDe(m));
        continue;
      }
      plages.set(nom as Colonne, [...(plages.get(nom as Colonne) ?? []), plageDe(m)]);
    }
  }
  for (const colonne of COLONNES) if (!plages.has(colonne)) throw new Error(`colonne absente : ${colonne}`);
  for (const [colonne, liste] of plages) {
    if (liste.some(([a, b]) => autres.some(([c, d]) => a < d && c < b))) {
      throw new Error(`colonne ${colonne} : sa plage chevauche celle d'une autre colonne`);
    }
  }
  return plages;
}

/** The file read by ranges, refusing any range that is not inside the allowed ones (fail closed). */
export function fichierParPlages(
  lire: (debut: number, fin: number) => Promise<ArrayBuffer>,
  taille: number,
  permises: readonly [number, number][],
): AsyncBuffer {
  return {
    byteLength: taille,
    async slice(debut: number, fin = taille) {
      if (!permises.some(([a, b]) => debut >= a && fin <= b)) {
        throw new Error(`plage refusée : ${debut}-${fin} sort des colonnes utiles`);
      }
      return lire(debut, fin);
    },
  };
}

/** The host names of a list of web addresses (http and https only, lower case, without duplicates). */
export function hotesDe(urls: unknown): string[] {
  const liste = Array.isArray(urls) ? urls : typeof urls === "string" && urls.startsWith("[") ? safeJson(urls) : [urls];
  const hotes = new Set<string>();
  for (const u of Array.isArray(liste) ? liste : []) {
    const adresse = texte(u, 2000);
    if (adresse === null) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(adresse) ? adresse : `https://${adresse}`);
      if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".")) {
        hotes.add(url.hostname.toLowerCase().replace(/\.$/, ""));
      }
    } catch {
      // Not an address: left out.
    }
  }
  return [...hotes].sort();
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** The town and postcode of an office: the first address that has a town; nothing else of the address is kept. */
export function lieuDe(adresses: unknown): { commune: string | null; codePostal: string | null } {
  const liste = typeof adresses === "string" ? safeJson(adresses) : adresses;
  if (!Array.isArray(liste)) return { commune: null, codePostal: null };
  for (const a of liste) {
    if (typeof a !== "object" || a === null) continue;
    const commune = texte((a as Record<string, unknown>)["commune"], 120);
    const code = texte((a as Record<string, unknown>)["code_postal"], 10);
    if (commune !== null) return { commune, codePostal: code !== null && /^\d{5}$/.test(code) ? code : null };
  }
  return { commune: null, codePostal: null };
}

/** One office from the values of its row (the useful columns only). */
export function guichetDe(ligne: Partial<Record<Colonne, unknown>>): Guichet | null {
  const nom = texte(ligne.name);
  const type = texte(ligne.types, 120);
  if (nom === null || type === null) return null;
  const siren = texte(ligne.siren, 20);
  const siret = texte(ligne.siret, 20);
  const modification = texte(ligne.modification_date, 40);
  return {
    nom,
    type,
    hotes: hotesDe(ligne.urls),
    siren: siren !== null && /^\d{9}$/.test(siren) ? siren : null,
    siret: siret !== null && /^\d{14}$/.test(siret) ? siret : null,
    ...lieuDe(ligne.addresses),
    modification: modification !== null && /^\d{4}-\d{2}-\d{2}/.test(modification) ? modification.slice(0, 10) : null,
  };
}

const COMPRESSEURS = { ZSTD: (entree: Uint8Array) => new Uint8Array(zstdDecompressSync(entree)) };

/** Reads one file of the copy: its footer, then each useful column on its own; returns its offices. */
export async function lireFichier(obtenir: Obtenir, fichier: FichierCopie): Promise<Guichet[]> {
  const adresse = `https://huggingface.co/datasets/${JEU}/resolve/${fichier.commit}/${fichier.chemin}`;
  const lire = async (debut: number, fin: number): Promise<ArrayBuffer> => {
    const r = await obtenir(adresse, { range: `bytes=${debut}-${fin - 1}` });
    if (r.statut !== 206 || r.corps.byteLength !== fin - debut) {
      throw new Error(`${fichier.chemin} : plage ${debut}-${fin} : HTTP ${r.statut}, ${r.corps.byteLength} octets`);
    }
    return r.corps.buffer.slice(r.corps.byteOffset, r.corps.byteOffset + r.corps.byteLength) as ArrayBuffer;
  };
  const queue = new DataView(await lire(fichier.taille - 8, fichier.taille));
  if (queue.getUint32(4, true) !== 0x31524150) throw new Error(`${fichier.chemin} : ce n'est pas un fichier Parquet`);
  const longueur = queue.getUint32(0, true);
  if (longueur <= 0 || longueur > 1024 * 1024 || longueur + 12 > fichier.taille) {
    throw new Error(`${fichier.chemin} : pied illisible`);
  }
  const meta = sansStatistiques(parquetMetadata(await lire(fichier.taille - 8 - longueur, fichier.taille)));
  const plages = plagesPermises(meta);
  const colonnes = new Map<Colonne, unknown[]>();
  for (const colonne of COLONNES) {
    const lignes = await parquetReadObjects({
      file: fichierParPlages(lire, fichier.taille, plages.get(colonne) ?? []),
      metadata: meta,
      columns: [colonne],
      compressors: COMPRESSEURS,
    });
    colonnes.set(
      colonne,
      lignes.map((l) => (l as Record<string, unknown>)[colonne]),
    );
  }
  const total = Number(meta.num_rows);
  const guichets: Guichet[] = [];
  for (let i = 0; i < total; i += 1) {
    const ligne: Partial<Record<Colonne, unknown>> = {};
    for (const colonne of COLONNES) ligne[colonne] = colonnes.get(colonne)?.[i];
    const g = guichetDe(ligne);
    if (g !== null) guichets.push(g);
  }
  return guichets;
}

/**
 * What the « donnees » branch keeps of a copy: its files, its number of offices, the date of its state (its offices'
 * most recent change, which the attribution of card 50 names), and when it was read.
 */
export type CopieAnnuaire = { fichiers: FichierCopie[]; guichets: number; etat: string | null; lue: string };

/** The date of the directory's state: its offices' most recent change (YYYY-MM-DD), or null. */
export function dateEtat(guichets: readonly Guichet[]): string | null {
  let etat: string | null = null;
  for (const g of guichets)
    if (g.modification !== null && (etat === null || g.modification > etat)) etat = g.modification;
  return etat;
}

/** The published copy's description, read back from « donnees » and checked at the border: null when it is not one. */
export function lireCopieAnnuaire(texte: string): CopieAnnuaire | null {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return null;
  }
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return null;
  const o = brut as Record<string, unknown>;
  const { fichiers, guichets, etat, lue } = o;
  if (!Array.isArray(fichiers) || typeof lue !== "string") return null;
  if (typeof guichets !== "number" || !Number.isSafeInteger(guichets) || guichets < 0) return null;
  if (etat !== undefined && etat !== null && (typeof etat !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(etat)))
    return null;
  const lus: FichierCopie[] = [];
  for (const f of fichiers) {
    if (typeof f !== "object" || f === null) return null;
    const { chemin, taille, sha256, commit, date } = f as Record<string, unknown>;
    if (typeof chemin !== "string" || typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) return null;
    if (typeof commit !== "string" || typeof date !== "string" || typeof taille !== "number") return null;
    lus.push({ chemin, taille, sha256, commit, date });
  }
  return { fichiers: lus, guichets, etat: typeof etat === "string" ? etat : null, lue };
}

/** Is it the copy already published: the same files, with the same SHA-256? */
export function memeCopie(fichiers: readonly FichierCopie[], publiee: CopieAnnuaire | null): boolean {
  if (publiee === null || publiee.fichiers.length !== fichiers.length) return false;
  const connues = new Map(publiee.fichiers.map((f) => [f.chemin, f.sha256]));
  return fichiers.every((f) => connues.get(f.chemin) === f.sha256);
}

/** A new copy's number of offices may differ from the published one's by this share at most. */
export const ECART_MAX = 0.1;

/** The guard of a new copy: a broken or truncated file never replaces a good copy (null: within the limit). */
export function ecartVolume(guichets: number, publiee: CopieAnnuaire | null): string | null {
  if (guichets === 0) return "aucun guichet lu";
  if (publiee === null || publiee.guichets === 0) return null;
  const ecart = Math.abs(guichets - publiee.guichets) / publiee.guichets;
  return ecart > ECART_MAX
    ? `${guichets} guichets contre ${publiee.guichets} dans la copie publiée (écart de ${Math.round(ecart * 100)} %, plus de ${ECART_MAX * 100} %)`
    : null;
}

/**
 * The offices, one JSON object per line, sorted (by name, then by SIRET and hosts): a new copy changes only the lines
 * that changed, so the « donnees » branch grows by small deltas.
 */
export function lignesGuichets(guichets: readonly Guichet[]): string {
  const cle = (g: Guichet) => `${g.nom}\u0000${g.siret ?? ""}\u0000${g.hotes.join(" ")}\u0000${g.type}`;
  const tries = [...guichets].sort((a, b) => (cle(a) < cle(b) ? -1 : cle(a) > cle(b) ? 1 : 0));
  return tries.map((g) => `${JSON.stringify(g)}\n`).join("");
}
