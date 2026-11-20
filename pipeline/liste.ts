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
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/.test(nom) ? nom : null;
}

/**
 * The clean copy of an official list: only `name` and `type` (both columns must exist), names normalised, sorted,
 * without duplicates. Every other column is dropped as it is read — the « sources » column above all.
 */
export function nettoyerListe(texte: string): {
  csv: string;
  lignes: number;
  noms: number;
  types: Record<string, number>;
} {
  const iter = lignesCsv(texte.replace(/^﻿/, ""));
  const entete = iter.next().value ?? [];
  const iNom = entete.indexOf("name");
  const iType = entete.indexOf("type");
  if (iNom < 0 || iType < 0) throw new Error("colonnes « name » et « type » attendues");
  const parNom = new Map<string, string>();
  let lignes = 0;
  for (const ligne of iter) {
    if (ligne.length === 1 && ligne[0] === "") continue;
    lignes += 1;
    const nom = nomValide(ligne[iNom] ?? "");
    if (nom === null) continue;
    const type = (ligne[iType] ?? "").trim().slice(0, 80);
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
  return { csv, lignes, noms: noms.length, types };
}
