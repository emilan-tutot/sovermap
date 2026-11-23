// The Observatoire de la qualité des démarches en ligne (DINUM; docs/sources.md, card 55): one edition a quarter, one
// sheet (« T_VDE ») in an ODS file that the owner deposits (static.data.gouv.fr is closed to robots). It is read here
// without any XML library: a document type or an entity declaration is refused, and only the sheet's rows and cells
// are read. What Sovermap takes of a démarche: its name, its identifier, its ministerial perimeter, its administration,
// its volumes, and the name its address is on with its registered domain; never its marks (satisfaction,
// accessibility, clear language…): Sovermap describes dependencies, not the quality of a démarche. Pure.
import { nomValide } from "./liste";
import { domaineEnregistrable, type ListeSuffixes } from "./psl";

export type Demarche = {
  id: string;
  nom: string;
  perimetre: string;
  administration: string | null;
  /** The edition's volumes; null when the sheet gives none (« À venir », empty). */
  volumeTotal: number | null;
  volumeEnLigne: number | null;
  /** The name its address is on, and that name's registered domain; null without a usable address. */
  hote: string | null;
  domaine: string | null;
};

type Cellule = { texte: string; valeur: string | null };

const ENTITES: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** The five XML entities and the numeric character references; nothing else is expanded. */
function decoder(texte: string): string {
  return texte.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (tout, e: string) => {
    if (e.startsWith("#")) {
      const n = e[1] === "x" || e[1] === "X" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      return Number.isInteger(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : tout;
    }
    return Object.hasOwn(ENTITES, e.toLowerCase()) ? (ENTITES[e.toLowerCase()] ?? tout) : tout;
  });
}

/**
 * The text of a cell: its paragraphs, their spaces, tabs and line breaks as one space each; every tag removed; the
 * control and format characters (direction marks, zero-width spaces, soft hyphens) removed (the review of C.8).
 */
function texteCellule(xml: string): string {
  return [...xml.matchAll(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/g)]
    .map((p) => decoder((p[1] ?? "").replace(/<text:(?:s|tab|line-break)\b[^>]*\/>/g, " ").replace(/<[^>]*>/g, "")))
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** The bounds of a sheet Sovermap reads (about 250 rows of 30 columns today, in 627 KB): beyond, the file is refused. */
const TAILLE_MAX = 8 * 1024 * 1024;
const LIGNES_MAX = 5_000;
const CELLULES_MAX = 256;
const REPETITION_MAX = 64;

/**
 * The cells of a row, repeated columns expanded (64 copies at most: the row's trailing empty cells). A cell with text
 * after a repetition cut at 64 would be read in the wrong column: the row is refused (the review of C.8).
 */
function cellules(ligne: string): Cellule[] {
  const resultat: Cellule[] = [];
  const ouverture = /<table:(?:covered-)?table-cell\b([^>]*?)(\/?)>/g;
  const fermeture = /<\/table:(?:covered-)?table-cell>/g;
  let decalee = false;
  for (let m = ouverture.exec(ligne); m !== null; m = ouverture.exec(ligne)) {
    const attributs = m[1] ?? "";
    let contenu = "";
    if (m[2] !== "/") {
      // One search for the cell's end, from the end of its opening tag: never quadratic.
      fermeture.lastIndex = ouverture.lastIndex;
      const f = fermeture.exec(ligne);
      const fin = f === null ? ligne.length : f.index;
      contenu = ligne.slice(ouverture.lastIndex, fin);
      ouverture.lastIndex = f === null ? ligne.length : f.index + f[0].length;
    }
    const repete = Number(/table:number-columns-repeated="(\d+)"/.exec(attributs)?.[1] ?? "1");
    const valeur = /office:value="([^"]*)"/.exec(attributs)?.[1];
    const cellule = { texte: texteCellule(contenu), valeur: valeur === undefined ? null : decoder(valeur) };
    if (decalee && cellule.texte !== "") throw new Error("ODS : une cellule pleine suit une répétition trop longue");
    if (repete > REPETITION_MAX) decalee = true;
    for (let i = 0; i < Math.min(Math.max(repete, 1), REPETITION_MAX); i += 1) resultat.push(cellule);
    if (resultat.length > CELLULES_MAX) throw new Error(`ODS : plus de ${CELLULES_MAX} cellules dans une ligne`);
  }
  return resultat;
}

/**
 * The rows of the first sheet of an ODS file's content.xml, empty rows left out. A document type or an entity
 * declaration is refused: nothing in this file may ask for more than its own text. A file or a sheet larger than any
 * edition is refused too, before it is read.
 */
export function lignesOds(contenu: string): { feuille: string; lignes: Cellule[][] } {
  if (contenu.length > TAILLE_MAX) throw new Error("ODS : contenu trop grand pour une édition de l'Observatoire");
  if (/<!DOCTYPE|<!ENTITY/i.test(contenu)) throw new Error("ODS : déclaration de type ou d'entité refusée");
  // A cell's comment (office:annotation) or a note (text:note) would mix a remark, even a person's name, into a
  // démarche's text: an edition that has one is refused, to be read by hand first (the review of C.8).
  if (/<office:annotation[\s/>]|<text:note[\s/>]/.test(contenu))
    throw new Error("ODS : commentaire ou note de cellule refusé");
  const table = /<table:table\s[^>]*?table:name="([^"]*)"[^>]*>([\s\S]*?)<\/table:table>/.exec(contenu);
  if (table === null) throw new Error("ODS : aucune feuille");
  const lignes: Cellule[][] = [];
  for (const l of (table[2] ?? "").matchAll(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/g)) {
    const c = cellules(l[1] ?? "");
    if (c.some((x) => x.texte !== "")) lignes.push(c);
    if (lignes.length > LIGNES_MAX) throw new Error(`ODS : plus de ${LIGNES_MAX} lignes`);
  }
  return { feuille: decoder(table[1] ?? ""), lignes };
}

/** The columns Sovermap reads, by their headers in the sheet (card 55). */
const COLONNES = {
  nom: "Nom Démarche",
  id: "ID Démarche",
  perimetre: "Périmètre Ministériel (AC/SG)",
  administration: "Réf Administration",
  volumeTotal: "Volumétrie Totale",
  volumeEnLigne: "Volumétrie En Ligne",
  adresse: "URL Démarche",
} as const;

/** A volume: the cell's number, or its text's digits; null for « À venir », an empty cell, or anything else. */
function volume(c: Cellule | undefined): number | null {
  const brut = (c?.valeur ?? c?.texte ?? "").replace(/[\s  ]/g, "");
  return /^\d{1,12}$/.test(brut) ? Number(brut) : null;
}

/** The name an address is on, when it is a web address on a valid name (never an IP address). */
function hoteDe(adresse: string): string | null {
  try {
    const url = new URL(adresse);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // An address by its IP (« https://10.0.0.10/ ») names no host: never a unit of the list (the review of C.8).
    if (url.hostname.startsWith("[") || /^\d+(?:\.\d+){3}$/.test(url.hostname)) return null;
    return nomValide(url.hostname);
  } catch {
    return null;
  }
}

/** The démarches of an edition, in the order of their identifiers; the sheet's headers must be the expected ones. */
export function demarchesDe(lignes: readonly Cellule[][], suffixes: ListeSuffixes): Demarche[] {
  const entete = lignes.findIndex((l) => l.some((c) => c.texte === COLONNES.nom));
  const titres = (lignes[entete] ?? []).map((c) => c.texte);
  const index = Object.fromEntries(
    Object.entries(COLONNES).map(([cle, titre]) => [cle, titres.indexOf(titre)]),
  ) as Record<keyof typeof COLONNES, number>;
  const absentes = Object.entries(index).filter(([, i]) => i < 0);
  if (entete < 0 || absentes.length > 0) {
    throw new Error(
      `Observatoire : colonnes absentes (${absentes.map(([c]) => COLONNES[c as keyof typeof COLONNES]).join(", ")})`,
    );
  }
  const demarches: Demarche[] = [];
  for (const l of lignes.slice(entete + 1)) {
    const texte = (cle: keyof typeof COLONNES) => l[index[cle]]?.texte ?? "";
    const id = texte("id");
    const nom = texte("nom");
    if (!/^\d{1,9}$/.test(id) || nom === "") continue;
    const hote = hoteDe(texte("adresse"));
    demarches.push({
      id,
      nom,
      perimetre: texte("perimetre"),
      administration: texte("administration") || null,
      volumeTotal: volume(l[index.volumeTotal]),
      volumeEnLigne: volume(l[index.volumeEnLigne]),
      hote,
      domaine: hote === null ? null : domaineEnregistrable(hote, suffixes),
    });
  }
  return demarches.sort((a, b) => Number(a.id) - Number(b.id));
}
