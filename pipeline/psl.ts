// The registrable domain of a name (decision D1, b2), by the Public Suffix List: a dated, pinned copy in
// referentiels/psl/ (MPL 2.0, docs/sources.md). The algorithm of publicsuffix.org, both sections (ICANN and private):
// the longest matching rule wins, a wildcard « *.x » matches one more label, an exception « !y.x » wins over both and
// gives up its leftmost label; with no rule, the default rule is « * » (one label).
import { domainToASCII } from "node:url";

export type ListeSuffixes = {
  /** The version line of the file, e.g. « 2026-11-19_08-30-20_UTC ». */
  version: string;
  regles: ReadonlySet<string>;
  /** « *.ck » is kept as « ck »: any one label under it is a public suffix. */
  jokers: ReadonlySet<string>;
  /** « !www.ck » is kept as « www.ck ». */
  exceptions: ReadonlySet<string>;
};

/** A rule's labels in ASCII (punycode), as the measured names are written; null when it cannot be converted. */
function enAscii(regle: string): string | null {
  const ascii = domainToASCII(regle);
  return ascii === "" ? null : ascii.toLowerCase();
}

/** Reads the list file: one rule per line (its first word), comments « // » and blank lines ignored. */
export function lireListeSuffixes(contenu: string): ListeSuffixes {
  const regles = new Set<string>();
  const jokers = new Set<string>();
  const exceptions = new Set<string>();
  let version = "";
  for (const brute of contenu.split(/\r?\n/)) {
    const ligne = brute.trim();
    const v = /^\/\/ VERSION: (\S+)$/.exec(ligne);
    if (v?.[1] !== undefined) version = v[1];
    if (ligne === "" || ligne.startsWith("//")) continue;
    const regle = ligne.split(/\s/)[0] ?? "";
    if (regle.startsWith("!")) {
      const a = enAscii(regle.slice(1));
      if (a !== null) exceptions.add(a);
    } else if (regle.startsWith("*.")) {
      const a = enAscii(regle.slice(2));
      if (a !== null) jokers.add(a);
    } else {
      const a = enAscii(regle);
      if (a !== null) regles.add(a);
    }
  }
  if (version === "") throw new Error("Public Suffix List sans ligne VERSION");
  if (regles.size < 1000) throw new Error("Public Suffix List trop courte");
  return { version, regles, jokers, exceptions };
}

/**
 * The copy kept in the repository: the licence notice (the first comment lines, up to the first blank line), the
 * VERSION and COMMIT lines, the section markers, and every rule — every other comment line is dropped, since many
 * name a contributor and give an e-mail address.
 */
export function reduireListeSuffixes(contenu: string): string {
  const lignes = contenu.split(/\r?\n/);
  const sortie: string[] = [];
  let entete = true;
  for (const brute of lignes) {
    const ligne = brute.trim();
    if (entete) {
      if (ligne === "") {
        entete = false;
        sortie.push(
          "// Copie réduite par Sovermap : l'en-tête de licence, la version et les règles, sans les autres commentaires",
          "// (qui nomment des contributeurs). Les règles sont inchangées. Voir docs/sources.md, fiche 42.",
          "",
        );
        continue;
      }
      sortie.push(ligne);
      continue;
    }
    if (/^\/\/ (VERSION|COMMIT): \S+$/.test(ligne) || /^\/\/ ===(BEGIN|END) (ICANN|PRIVATE) DOMAINS===$/.test(ligne)) {
      sortie.push(ligne);
    } else if (ligne !== "" && !ligne.startsWith("//")) {
      sortie.push(ligne.split(/\s/)[0] ?? "");
    }
  }
  return `${sortie.join("\n")}\n`;
}

/** How many labels at the right of a name form its public suffix. */
export function longueurSuffixe(labels: readonly string[], liste: ListeSuffixes): number {
  for (let i = 0; i < labels.length; i += 1) {
    if (liste.exceptions.has(labels.slice(i).join("."))) return labels.length - i - 1;
  }
  let meilleure = 1;
  for (let i = 0; i < labels.length; i += 1) {
    const n = labels.length - i;
    if (liste.regles.has(labels.slice(i).join("."))) meilleure = Math.max(meilleure, n);
    if (i + 1 < labels.length && liste.jokers.has(labels.slice(i + 1).join("."))) meilleure = Math.max(meilleure, n);
  }
  return meilleure;
}

/** The registrable domain of a name (`www.service.gouv.fr` → `service.gouv.fr`), or null for a public suffix itself. */
export function domaineEnregistrable(nom: string, liste: ListeSuffixes): string | null {
  const labels = nom.trim().toLowerCase().replace(/\.$/, "").split(".");
  if (labels.some((l) => l === "")) return null;
  const n = longueurSuffixe(labels, liste);
  return labels.length > n ? labels.slice(-(n + 1)).join(".") : null;
}
