// The Journal's Atom feed (the owner's point 13, § 10; RFC 4287): one entry per published day, the latest first, with
// what the journal page says of it (the initial state, new rules, or its confirmed changes counted); its address and
// the day's page. Built from the published days only (lib/donnees/journal.ts checks each against its schema), every
// text escaped for XML; no domain name, no free text from the data.
import { type Jour } from "@/lib/donnees/journal";
import { dateFr, nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

/** The feed's address: a family of its own behind the production door (lib/porte.ts). */
export const CHEMIN_FLUX = "/journal/flux.xml";

/** How many days the feed carries (each one a file read). */
export const JOURS_DU_FLUX = 30;

const echapper = (texte: string): string =>
  texte
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/** What a day says, as the journal page says it. */
function resume(jour: Jour): string {
  const t = fr.journal;
  if (jour.etatInitial) return t.etatInitial;
  if (jour.reglesChangees) return t.reglesChangees;
  return `${t.changements(jour.changements.length, nombre(jour.changements.length))}.`;
}

export function fluxAtom(origine: string, jours: readonly Jour[]): string {
  const t = fr.journal;
  const tries = [...jours].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, JOURS_DU_FLUX);
  const derniere = tries[0]?.date ?? "1970-01-01";
  const entrees = tries.flatMap((jour) => {
    const adresse = echapper(`${origine}/journal/${jour.date}`);
    return [
      "  <entry>",
      `    <id>${adresse}</id>`,
      `    <title>${echapper(t.titreJour(dateFr(jour.date)))}</title>`,
      `    <updated>${jour.date}T00:00:00Z</updated>`,
      `    <link rel="alternate" type="text/html" href="${adresse}"/>`,
      `    <summary>${echapper(resume(jour))}</summary>`,
      "  </entry>",
    ];
  });
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr">',
    `  <id>${echapper(origine + CHEMIN_FLUX)}</id>`,
    `  <title>${echapper(t.flux.titre)}</title>`,
    `  <subtitle>${echapper(t.description)}</subtitle>`,
    `  <updated>${derniere}T00:00:00Z</updated>`,
    `  <link rel="self" type="application/atom+xml" href="${echapper(origine + CHEMIN_FLUX)}"/>`,
    `  <link rel="alternate" type="text/html" href="${echapper(`${origine}/journal`)}"/>`,
    `  <author><name>${echapper(t.flux.auteur)}</name></author>`,
    ...entrees,
    "</feed>",
    "",
  ].join("\n");
}
