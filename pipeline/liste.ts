// The reference list (brief B.1 and C.5): the official lists of public-sector domain names (DINUM), as clean copies
// in referentiels/listes/ (`name,type`, one per dated file), merged with the complements of the State's open sources;
// every name keeps its provenance and its dates.
import { domainToASCII } from "node:url";

/** A minimal CSV reader (RFC 4180: quotes, doubled quotes, commas and line breaks inside quotes). */
export function* lignesCsv(texte: string): Generator<string[]> {
  let champ = "";
  let ligne: string[] = [];
  let guillemets = false;
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte.charAt(i);
    if (guillemets) {
      if (c === '"') {
        if (texte.charAt(i + 1) === '"') {
          champ += '"';
          i += 1;
        } else guillemets = false;
      } else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === ",") {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte.charAt(i + 1) === "\n") i += 1;
      ligne.push(champ);
      yield ligne;
      ligne = [];
      champ = "";
    } else champ += c;
  }
  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ);
    yield ligne;
  }
}

/**
 * A name of the list: a host name in lower case, without its final dot, an internationalised name in its ASCII form
 * (punycode, as the DNS asks it); anything else is not a name.
 */
export function nomValide(brut: string): string | null {
  const nom = domainToASCII(brut.trim().toLowerCase().replace(/\.$/, ""));
  // Every label, the last one included, begins and ends with a letter or a digit.
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(nom)
    ? nom
    : null;
}

/**
 * The types of the DINUM's list (its « type » column), as both dated copies give them. Any other value is dropped as it
 * is read: the column once held « Ajout Manuel » followed by a contributor's name, and Sovermap never keeps the name of
 * a contributor (brief § 0.2).
 */
export const TYPES_LISTE: ReadonlySet<string> = new Set([
  "APHP",
  "Académie",
  "Ambassade",
  "Bibliothèque",
  "Centre de gestion",
  "Collectivité",
  "Commune",
  "Conseil départemental",
  "Conseil régional",
  "EPCI",
  "Gouvernement",
  "Hôpital",
  "MDPH ou MDA",
  "Ministère",
  "Préfécture",
  "Santé",
  "Université",
  "Établissement scolaire",
]);

/** A type of the list, or "" for anything else (TYPES_LISTE). */
export const typeConnu = (brut: string | undefined): string => {
  const type = (brut ?? "").trim();
  return TYPES_LISTE.has(type) ? type : "";
};

/**
 * The clean copy of an official list: only `name` and `type` (both columns must exist), names normalised, sorted,
 * without duplicates, and only the known types (TYPES_LISTE). Every other column is dropped as it is read — the
 * « sources » column above all.
 */
export function nettoyerListe(texte: string): {
  csv: string;
  lignes: number;
  noms: number;
  types: Record<string, number>;
  /** Rows whose type was not empty but unknown, and was emptied: a new list may bring a legitimate one (read it by hand). */
  typesInconnus: number;
} {
  const iter = lignesCsv(texte.replace(/^﻿/, ""));
  const entete = iter.next().value ?? [];
  const iNom = entete.indexOf("name");
  const iType = entete.indexOf("type");
  if (iNom < 0 || iType < 0) throw new Error("colonnes « name » et « type » attendues");
  const parNom = new Map<string, string>();
  let lignes = 0;
  let typesInconnus = 0;
  for (const ligne of iter) {
    if (ligne.length === 1 && ligne[0] === "") continue;
    lignes += 1;
    const nom = nomValide(ligne[iNom] ?? "");
    if (nom === null) continue;
    const type = typeConnu(ligne[iType]);
    if (type === "" && (ligne[iType] ?? "").trim() !== "") typesInconnus += 1;
    if ((parNom.get(nom) ?? "") === "") parNom.set(nom, type);
  }
  const noms = [...parNom.keys()].sort();
  const types: Record<string, number> = {};
  for (const nom of noms) {
    const t = parNom.get(nom) ?? "";
    types[t] = (types[t] ?? 0) + 1;
  }
  const champ = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = `name,type\n${noms.map((n) => `${n},${champ(parNom.get(n) ?? "")}`).join("\n")}\n`;
  return { csv, lignes, noms: noms.length, types, typesInconnus };
}
