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
