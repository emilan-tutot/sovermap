// The search (D.2, R4): one index of the day's domains, companies, ministries and countries, loaded whole at its first
// use (never piecemeal, which would tell what is typed), searched in the browser. The beginnings of words first, then,
// from 3 characters only, the inside of words; each result with its real category (a public body is never « Société »:
// its category is the one the index gives). Pure: shared by the server, which builds the index, and the browser.

/** d: a registered domain (« 1 »: of the « État » perimeter); s: a company; m: a ministry; p: a country. */
export type Entree = ["d", string, 0 | 1] | ["s", string, string] | ["m", string, string] | ["p", string, string];
export type Resultat = { type: Entree[0]; libelle: string; adresse: string; etat: boolean };

/** A text, comparable: no accents, no case, œ and æ spelt out. */
export function comparable(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

const adresseDe = (e: Entree): string => {
  switch (e[0]) {
    case "d":
      return `/radiographie/${e[1]}`;
    case "s":
      return `/societes/${e[2]}`;
    case "m":
      return `/ministeres/${e[2]}`;
    case "p":
      return `/pays/${e[2]}`;
    default: {
      const jamais: never = e;
      return jamais;
    }
  }
};

/** The small words that never count as a word's beginning: « Ét » must not find « Ministère de l'Action et… ». */
const MOTS_VIDES = new Set([
  "a",
  "au",
  "aux",
  "d",
  "de",
  "des",
  "du",
  "en",
  "et",
  "l",
  "la",
  "le",
  "les",
  "pour",
  "sur",
]);

/** Does a word of the text begin with the query? Words are cut at spaces, hyphens, dots, apostrophes and slashes. */
function debutDeMot(texte: string, saisie: string): boolean {
  return (
    texte.startsWith(saisie) ||
    texte.split(/[\s\-.'’/()]+/).some((mot) => !MOTS_VIDES.has(mot) && mot.startsWith(saisie))
  );
}

/**
 * The results for a query: first the entries one word of which begins with it; then, from 3 characters only, those
 * that contain it. Within each group, ministries, companies and countries before domains, the « État » domains before
 * the others, then the alphabetical order. At most `limite` results.
 */
export function chercher(entrees: readonly Entree[], brute: string, limite = 20): Resultat[] {
  const saisie = comparable(brute.trim());
  if (saisie.length === 0) return [];
  const rang = (e: Entree) => (e[0] === "d" ? (e[2] === 1 ? 3 : 4) : e[0] === "m" ? 0 : e[0] === "s" ? 1 : 2);
  const debuts: Entree[] = [];
  const dedans: Entree[] = [];
  for (const e of entrees) {
    const texte = comparable(e[1]);
    if (debutDeMot(texte, saisie)) debuts.push(e);
    else if (saisie.length >= 3 && texte.includes(saisie)) dedans.push(e);
  }
  const ordre = (a: Entree, b: Entree) => rang(a) - rang(b) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
  return [...debuts.sort(ordre), ...dedans.sort(ordre)].slice(0, limite).map((e) => ({
    type: e[0],
    libelle: e[1],
    adresse: adresseDe(e),
    etat: e[0] === "d" && e[2] === 1,
  }));
}

/** The index as the server sends it, checked in the browser: entries that are not one are left out. */
export function lireIndexRecherche(valeur: unknown): Entree[] {
  if (typeof valeur !== "object" || valeur === null || !Array.isArray((valeur as { entrees?: unknown }).entrees))
    return [];
  const sur = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
  return (valeur as { entrees: unknown[] }).entrees.filter((e): e is Entree => {
    if (!Array.isArray(e) || e.length !== 3) return false;
    const [type, libelle, x] = e as unknown[];
    if (!sur(libelle, 253)) return false;
    if (type === "d") return (x === 0 || x === 1) && /^[a-z0-9_.-]+$/.test(libelle as string);
    return (type === "s" || type === "m" || type === "p") && sur(x, 100) && /^[a-z0-9-]+$/.test(x as string);
  });
}
