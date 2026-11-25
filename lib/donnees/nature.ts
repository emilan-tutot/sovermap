// The nature of a public body that serves sites (brief D.3, correction 1; CLAUDE.md: a public body is never called
// « société », its nature is written instead). The operators' referential writes it at the start of their « controle »
// (« groupement d'intérêt public, opérateur de l'État », « établissement public de santé »…); a company's « controle »
// never starts so (« société cotée », « personnes physiques »…). Pure: shared by the server and the browser.

export type Nature = "administration" | "gip" | "etablissement" | "securiteSociale";

/** The beginnings of a « controle » that give a nature, in the referential's words. */
const DEBUTS: readonly (readonly [string, Nature])[] = [
  ["administration centrale de l'État", "administration"],
  ["groupement d'intérêt public", "gip"],
  ["établissement public", "etablissement"],
  ["organisme du régime général de la sécurité sociale", "securiteSociale"],
];

export const NATURES: readonly Nature[] = DEBUTS.map(([, n]) => n);

/** The nature a « controle » gives, or null (a company, or a public body whose nature is not one of these). */
export function natureDe(controle: string | null): Nature | null {
  if (controle === null) return null;
  const texte = controle.trim().replace(/’/g, "'").toLowerCase();
  return DEBUTS.find(([debut]) => texte.startsWith(debut.toLowerCase()))?.[1] ?? null;
}
