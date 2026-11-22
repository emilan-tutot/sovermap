// No personal data in what is published (brief F.3). The collection never reads the fields that would hold some (the
// SOA's RNAME, the CAA's iodef, the registries' contacts, the people in charge listed by the directories); this guard
// proves it, file by file, before anything is sent: an e-mail address, a « mailto: » or a « tel: » link stops the
// publication. What it reports is masked, since the logs are public.

const ADRESSE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const LIEN = /\b(?:mailto|tel):[^\s"',;<>)]+/gi;

export type Trouvaille = { fichier: string; extrait: string };

/** A finding as the logs may show it: its first two characters and its last three, never the whole. */
export const masquer = (texte: string) => `${texte.slice(0, 2)}…${texte.length > 8 ? texte.slice(-3) : ""}`;

/** The e-mail addresses and the « mailto: » or « tel: » links found in the files, masked. */
export function donneesPersonnelles(fichiers: Iterable<readonly [string, string]>): Trouvaille[] {
  const trouvees: Trouvaille[] = [];
  for (const [fichier, texte] of fichiers) {
    for (const motif of [ADRESSE, LIEN]) {
      for (const m of texte.matchAll(motif)) trouvees.push({ fichier, extrait: masquer(m[0]) });
    }
  }
  return trouvees;
}

/**
 * A phone number: French (« 01 23 45 67 89 », « 0123456789 ») or international (« +33 1 23 45 67 89 », « 0033… »);
 * never a run of digits inside a longer one, a code or a checksum.
 */
const TELEPHONE =
  /(?<![\p{L}\p{N}+])(?:(?:\+|00)[1-9][0-9]{0,2}[\s.-]?(?:\(0\)[\s.-]?)?[1-9](?:[\s.-]?[0-9]{2}){4}|0[1-9](?:[\s.-]?[0-9]{2}){4})(?![\p{L}\p{N}])/u;
/**
 * The form of a person's name in a directory's text: a civility before a capitalised word (« M. Dupont », « Mme
 * Martin », « Monsieur Jean »). Never « M. le maire », « Lycée Madame de Staël » or « Lycée Marie Curie »: there, no
 * civility comes right before a capitalised word.
 */
const CIVILITE =
  /(?<![\p{L}\p{N}])(?:M\.|MM\.|Mme|Mmes|Mlle|Mlles|Monsieur|Messieurs|Madame|Mesdames|Mademoiselle)\s+\p{Lu}/u;

export type MotifPersonnel = "adresse e-mail" | "téléphone" | "nom de personne";

/** The personal data that a free text holds, by kind: the forms this file knows (the owner's answer to point 13). */
export function motifsPersonnels(texte: string): MotifPersonnel[] {
  const motifs: MotifPersonnel[] = [];
  if (new RegExp(ADRESSE.source).test(texte) || /\bmailto:/i.test(texte)) motifs.push("adresse e-mail");
  if (TELEPHONE.test(texte) || /\btel:/i.test(texte)) motifs.push("téléphone");
  if (CIVILITE.test(texte)) motifs.push("nom de personne");
  return motifs;
}

/** The free text left out, by source and kind of personal datum: counted (etat.json), never copied. */
export type Ecarts = Record<string, Partial<Record<MotifPersonnel, number>>>;

/**
 * Every free text kept from a source (a body's or a company's name, an AS's description) passes here: one that holds
 * a personal datum is left out (null), and counted in `ecarts`.
 */
export function garderTexteLibre(texte: string | null, source: string, ecarts: Ecarts): string | null {
  if (texte === null) return null;
  const motifs = motifsPersonnels(texte);
  if (motifs.length === 0) return texte;
  const parMotif = (ecarts[source] ??= {});
  for (const motif of motifs) parMotif[motif] = (parMotif[motif] ?? 0) + 1;
  return null;
}

/** The sum of two counts of free text left out (two sources read apart). */
export function ajouterEcarts(a: Ecarts, b: Ecarts): Ecarts {
  const somme: Ecarts = {};
  for (const ecarts of [a, b]) {
    for (const [source, parMotif] of Object.entries(ecarts)) {
      const cible = (somme[source] ??= {});
      for (const [motif, n] of Object.entries(parMotif) as [MotifPersonnel, number][])
        cible[motif] = (cible[motif] ?? 0) + n;
    }
  }
  return somme;
}
