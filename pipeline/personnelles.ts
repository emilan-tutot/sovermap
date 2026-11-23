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
 * In a free text, an e-mail address: whole (a local part, an at sign and a domain; a space allowed on each side of
 * the at sign), disguised (« nom [at] exemple.fr ») or cut short by a length limit at the end of the text (« nom@exem »).
 * Never a company's name with an at sign inside (« MEDI@LYS SAS »).
 */
const ADRESSE_LIBRE =
  /[A-Za-z0-9._%+-]+\s?@\s?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}|[\p{L}\p{N}._%+-]+\s*(?:\[at\]|\(at\))\s*[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]*$/iu;
/**
 * A phone number: French (« 01 23 45 67 89 », « 0123456789 ») or international (« +33 1 23 45 67 89 », « 0033… »,
 * « (+33) 1… »), its groups apart by up to two spaces, dots or hyphens; never a run of digits inside a longer one, a
 * code or a checksum.
 */
const TELEPHONE =
  /(?<![\p{L}\p{N}+])(?:(?:\+|00)[1-9][0-9]{0,2}\)?[\s.-]{0,2}(?:\(0\)[\s.-]?)?[1-9](?:[\s.-]{0,2}[0-9]{2}){4}|0[1-9](?:[\s.-]{0,2}[0-9]{2}){4})(?![\p{L}\p{N}])/u;
/**
 * The form of a person's name in a directory's text: a civility, in any of its usual spellings, before a capitalised
 * word, maybe after a particle (« M. Dupont », « Mme Martin », « MME DUPONT », « Mme. Martin », « Mme de Martin », « M.
 * d'Exemple »). Never a function (« M. le maire », « Monsieur Le Préfet »), a name without a civility (« Lycée Marie
 * Curie »), initials (« J.M. Exemple SE », « C.N.A.M. Paris »: a dot before the « M. »), nor a title that companies
 * carry in their names (« Dr. Exemple GmbH »: measured on the RIPE, 23/11/2026). A historic name after a civility
 * (« Lycée Madame de Staël ») is left out too: rare in these sources, and the body keeps its acronym (the review of PR
 * 19).
 */
const CIVILITE =
  /(?<![\p{L}\p{N}.])(?:M\.|MM\.|(?:Mme|Mmes|Mlle|Mlles|MME|MMES|MLLE|MLLES)\.?|Monsieur|Messieurs|Madame|Mesdames|Mademoiselle|MONSIEUR|MESSIEURS|MADAME|MESDAMES|MADEMOISELLE)\s+(?:(?:de|du|des)\s+|d['’])?(?![Ll](?:[Ee][Ss]?|[Aa])\s)\p{Lu}/u;
/**
 * How a registry writes a natural person who trades: the RIPE's names of persons have no civility, but a mention at
 * their end (« DUPONT Jean EI », « … EIRL », « … E.I. ») or a phrase (« entrepreneur individuel », « individual
 * entrepreneur », « private person »), or « trading as » after a name that is not a company's (« Jean Exemple trading
 * as Exemple Hosting », never « Exemple Ltd trading as … »). Measured on the RIPE's 95,851 organisations (23/11/2026):
 * the 32 French persons who trade are all found, and two companies only are left out (a person's name in theirs).
 */
const ENTREPRENEUR_EN_FIN = /(?<![\p{L}\p{N}.])(?:EIRL|EI|E\.I\.R\.L\.|E\.I\.)\s*$/u;
const ENTREPRENEUR =
  /(?<![\p{L}\p{N}])(?:entrepreneur individuel|entreprise individuelle|auto-entrepreneur|micro-entrepreneur|individual entrepreneur|sole trader|sole proprietor|physical person|private person)(?![\p{L}\p{N}])/iu;
const TRADING_AS = /(?<![\p{L}\p{N}])trading as(?![\p{L}\p{N}])/iu;
const FORME_DE_SOCIETE =
  /(?<![\p{L}\p{N}])(?:Ltd|Limited|LLC|LLP|plc|Inc|GmbH|AG|SA|SAS|SASU|SARL|EURL|SRL|BV|NV|SE|CIC)(?![\p{L}\p{N}])/iu;

/** Does the text name a natural person who trades, as a registry writes one? */
function personneQuiExerce(texte: string): boolean {
  if (ENTREPRENEUR_EN_FIN.test(texte) || ENTREPRENEUR.test(texte)) return true;
  const m = TRADING_AS.exec(texte);
  return m !== null && !FORME_DE_SOCIETE.test(texte.slice(0, m.index));
}

export type MotifPersonnel = "adresse e-mail" | "téléphone" | "nom de personne";

/** The personal data that a free text holds, by kind: the forms this file knows (the owner's answer to point 13). */
export function motifsPersonnels(texte: string): MotifPersonnel[] {
  const motifs: MotifPersonnel[] = [];
  if (ADRESSE_LIBRE.test(texte) || /\bmailto:/i.test(texte)) motifs.push("adresse e-mail");
  if (TELEPHONE.test(texte) || /\btel:/i.test(texte)) motifs.push("téléphone");
  if (CIVILITE.test(texte) || personneQuiExerce(texte)) motifs.push("nom de personne");
  return motifs;
}

/**
 * The free text of an AS as published (index/as.json): its description and its holder's name, only for an AS of the
 * companies of referentiels/ (an AS held by an individual would name a person; MEGA § 0.2), each passing the control
 * (P13).
 */
export function textesAs(
  connu: boolean,
  description: string | null,
  titulaire: string | null,
  ecarts: Ecarts,
): { description: string | null; titulaire: string | null } {
  if (!connu) return { description: null, titulaire: null };
  return {
    description: garderTexteLibre(description, "iptoasn", ecarts),
    titulaire: garderTexteLibre(titulaire, "ripe", ecarts),
  };
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
