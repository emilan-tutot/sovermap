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
 * In a free text, an e-mail address: whole (a local part, an at sign and a domain; up to two spaces on each side of
 * the at sign) or disguised (« nom [at] exemple.fr », « nom (arobase) exemple.fr »). Never a company's name with an
 * at sign inside (« MEDI@LYS SAS », « Exemple Net@Home »). Each text is controlled before any cut (2,000 characters at
 * most), so that no address is ever seen cut in two.
 */
const ADRESSE_LIBRE =
  /[A-Za-z0-9._%+-]+\s{0,2}@\s{0,2}[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}|[\p{L}\p{N}._%+-]+\s*(?:\[at\]|\(at\)|\[arobase\]|\(arobase\))\s*[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/iu;
/**
 * A phone number: French (« 01 23 45 67 89 », « 0123456789 », « 01/23/45/67/89 ») or international (« +33 1 23 45 67
 * 89 », « 0033… », « (+33) 1… »), its groups apart by up to two spaces, dots, slashes or hyphens; never a run of
 * digits inside a longer one, a code or a checksum.
 */
const TELEPHONE =
  /(?<![\p{L}\p{N}+])(?:(?:\+|00)[1-9][0-9]{0,2}\)?[\s./-]{0,2}(?:\(0\)[\s./-]?)?[1-9](?:[\s./-]{0,2}[0-9]{2}){4}|0[1-9](?:[\s./-]{0,2}[0-9]{2}){4})(?![\p{L}\p{N}])/u;
/**
 * The form of a person's name in a directory's text: a civility, in any of its usual spellings, before a capitalised
 * word, maybe after a particle (« M. Dupont », « Mme Martin », « MME DUPONT », « Mme. Martin », « Mme de Martin », « M.
 * d'Exemple », « M. Le Exemple »), or a doctor's or a professor's title before one (« Dr Martin »). Each match is then
 * judged by `nommePersonne`. A historic name after a civility (« Lycée Madame de Staël ») is left out too: rare in
 * these sources, and the body keeps its acronym.
 */
const CIVILITE =
  /(?<![\p{L}\p{N}])(?:M\.|MM\.|(?:Mme|Mmes|Mlle|Mlles|MME|MMES|MLLE|MLLES)\.?|Monsieur|Messieurs|Madame|Mesdames|Mademoiselle|MONSIEUR|MESSIEURS|MADAME|MESDAMES|MADEMOISELLE|(?:Dr|Pr)\.?|Docteur|Professeur|DOCTEUR|PROFESSEUR)\s+(?:(?:de|du|des)\s+|d['’])?\p{Lu}/gu;
/** A doctor's or a professor's title: companies carry it in their names (« Dr. Exemple GmbH », measured on the RIPE). */
const TITRE = /^(?:(?:Dr|Pr)\.?|Docteur|Professeur|DOCTEUR|PROFESSEUR)\s/u;
/**
 * A function after a civility written in full (« Monsieur le Préfet », « Madame la Directrice », « MONSIEUR LE
 * PREFET »): it names a post, never a person. A list, so that a surname that begins with Le or La (« M. Le Exemple »)
 * is never taken for one, and the civility in full, as a function is written: « M. Le Maire » may be a surname (the
 * second review of PR 19).
 */
const FONCTION =
  /^(?:Monsieur|Madame|Messieurs|Mesdames)\s+(?:le|la|les|l['’])\s*(?:pr[ée]fet|pr[ée]f[èe]te|sous-pr[ée]fet|sous-pr[ée]f[èe]te|maire|pr[ée]sident|pr[ée]sidente|vice-pr[ée]sident|vice-pr[ée]sidente|directeur|directrice|ministre|secr[ée]taire|recteur|rectrice|procureur|procureure|commissaire|haut-commissaire|s[ée]nateur|s[ée]natrice|d[ée]put[ée]|d[ée]put[ée]e|conseiller|conseill[èe]re|d[ée]l[ée]gu[ée]|d[ée]l[ée]gu[ée]e|chef|cheffe|inspecteur|inspectrice|gouverneur|ambassadeur|ambassadrice|consul|m[ée]diateur|m[ée]diatrice|d[ée]fenseur|d[ée]fenseure|premier|premi[èe]re|questeur|questeure|tr[ée]sorier|tr[ée]sori[èe]re|payeur|contr[ôo]leur|contr[ôo]leuse|adjoint|adjointe)(?![\p{L}-])/iu;
/**
 * A company's legal form: initials before a name (« J.M. Exemple SE ») and a title (« Dr. Exemple GmbH ») are a
 * company's name only beside one, and « X trading as Y » names a person only without one before it.
 */
const FORME_DE_SOCIETE =
  /(?<![\p{L}\p{N}])(?:Ltd\.?|LTD\.?|Limited|LIMITED|LLC|L\.L\.C\.|LLP|plc|PLC|Inc\.?|INC\.?|Corp\.?|CORP\.?|Corporation|CORPORATION|Co\.|CO\.|GmbH|GMBH|mbH|AG|KG|UG|GbR|OHG|SA|S\.A\.|SAS|S\.A\.S\.|SASU|SARL|Sarl|S\.A\.R\.L\.|EURL|SRL|Srl|S\.R\.L\.|S\.r\.l\.|SpA|SPA|S\.p\.A\.|BV|B\.V\.|NV|N\.V\.|SE|AB|A\/S|ApS|ASA|Oy|OY|Oyj|s\.r\.o\.|a\.s\.|Kft\.|Zrt\.|d\.o\.o\.|CIC|SCOP|SNC|GIE)(?![\p{L}\p{N}])/u;

/** Does this civility's match name a person, or a post, a company's initials or a company's title? */
function nommePersonne(texte: string, debut: number): boolean {
  const suite = texte.slice(debut);
  if (FONCTION.test(suite)) return false;
  // Initials (« J.M. Exemple SE ») and a title (« Dr. Exemple GmbH ») name a company only beside its legal form.
  const initiales = texte[debut - 1] === ".";
  if ((initiales || TITRE.test(suite)) && FORME_DE_SOCIETE.test(texte)) return false;
  return true;
}

/**
 * How a registry writes a natural person who trades: the RIPE's names of persons have no civility, but a mention
 * (« DUPONT Jean EI », « … EIRL », « … E.I. », « … (EI) », « EI DUPONT Jean », « … e.K. ») or a phrase (« entrepreneur
 * individuel », « individual entrepreneur », « private person »), or « trading as » (« t/a », « d/b/a ») after a name
 * that is not a company's (« Jean Exemple trading as Exemple Hosting », never « Exemple Ltd trading as … »). Only the
 * registries' texts are read so (the RIPE, IPtoASN, the referentials): in a directory, « entreprise individuelle »
 * names a subject (« Bureau de l'entreprise individuelle »).
 */
const ENTREPRENEUR_MENTION =
  /(?<![\p{L}\p{N}.])(?:EIRL|EI|E\.I\.R\.L\.|E\.I\.)\s*[.)]?\s*$|^\s*(?:EIRL|EI)\s|\((?:EIRL|EI)\)|(?<![\p{L}\p{N}])e\.\s?K\.?\s*$/u;
const ENTREPRENEUR =
  /(?<![\p{L}\p{N}])(?:entrepreneur\s+individuel|entreprise\s+individuelle|auto[-\s]?entrepreneur|micro[-\s]?entrepreneur|individual\s+entrepreneur|private\s+entrepreneur|sole\s+trader|sole\s+proprietor|physical\s+person|private\s+person)(?![\p{L}\p{N}])/iu;
const TRADING_AS = /(?<![\p{L}\p{N}])(?:trading\s+as|t\/a|d\/b\/a|doing\s+business\s+as)(?![\p{L}\p{N}])/iu;

/** Does a registry's text name a natural person who trades? */
function personneQuiExerce(texte: string): boolean {
  if (ENTREPRENEUR_MENTION.test(texte) || ENTREPRENEUR.test(texte)) return true;
  const m = TRADING_AS.exec(texte);
  return m !== null && !FORME_DE_SOCIETE.test(texte.slice(0, m.index));
}

export type MotifPersonnel = "adresse e-mail" | "téléphone" | "nom de personne";

/**
 * The personal data that a free text holds, by kind: the forms this file knows (the owner's answer to point 13).
 * `registre`: a registry's text (the RIPE, IPtoASN, the referentials), where a person who trades is written by a
 * mention rather than a civility.
 */
export function motifsPersonnels(texte: string, registre = false): MotifPersonnel[] {
  const motifs: MotifPersonnel[] = [];
  if (ADRESSE_LIBRE.test(texte) || /\bmailto:/i.test(texte)) motifs.push("adresse e-mail");
  if (TELEPHONE.test(texte) || /\btel:/i.test(texte)) motifs.push("téléphone");
  const civilite = [...texte.matchAll(CIVILITE)].some((m) => nommePersonne(texte, m.index));
  if (civilite || (registre && personneQuiExerce(texte))) motifs.push("nom de personne");
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
    // IPtoASN's description has no bound: its first 2,000 characters are controlled, and only they are published.
    description: garderTexteLibre(description?.slice(0, 2000) ?? null, "iptoasn", ecarts),
    // The RIPE's name is read whole (2,000 characters at most, pipeline/registres.ts), controlled, then cut to 200.
    titulaire: garderTexteLibre(titulaire, "ripe", ecarts)?.slice(0, 200).trim() ?? null,
  };
}

/** The sources whose free text is a registry's (`motifsPersonnels`, `registre`). */
const REGISTRES = new Set(["ripe", "iptoasn"]);

/** The free text left out, by source and kind of personal datum: counted (etat.json), never copied. */
export type Ecarts = Record<string, Partial<Record<MotifPersonnel, number>>>;

/**
 * Every free text kept from a source (a body's or a company's name, an AS's description) passes here: one that holds
 * a personal datum is left out (null), and counted in `ecarts`.
 */
export function garderTexteLibre(texte: string | null, source: string, ecarts: Ecarts): string | null {
  if (texte === null) return null;
  const motifs = motifsPersonnels(texte, REGISTRES.has(source));
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
