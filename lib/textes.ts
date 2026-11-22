// The text pages of the site (part E): their structure, shared by the dictionary that holds their words
// (lib/i18n/fr-textes.ts), the component that shows them (components/texte/PageTexte.tsx) and the tests. A text is
// never HTML: plain sentences, raw values and links of the site, nothing else.

/** A piece of a sentence: plain text, a raw value (never broken in the middle), or a link to a page of the site. */
export type Segment = string | { valeur: string } | { lien: string; vers: string };

export type Bloc = { paragraphe: readonly Segment[] } | { liste: readonly (readonly Segment[])[] };

export type Section = { titre?: string; ancre?: string; blocs: readonly Bloc[] };

export type PageDeTexte = {
  /** The address of the page (spec.md, EX-26). */
  chemin: string;
  titre: string;
  /** The page's description for the engines, about 155 characters. */
  description: string;
  chapo: string;
  sections: readonly Section[];
  /** Where each fact comes from: at least one source a page. */
  sources: readonly (readonly Segment[])[];
  /** The day of its last revision (YYYY-MM-DD). */
  revision: string;
  /**
   * Read again by the publisher, who takes responsibility for it (brief E.3 and E.5). Until then, the page says by its
   * title that the text was written with the help of an AI and has not been read again.
   */
  relu: boolean;
};

/** Every link of a text, for the tests: each must lead to a page of the site. */
export function liensDe(page: PageDeTexte): string[] {
  const segments = [
    ...page.sections.flatMap((s) => s.blocs.flatMap((b) => ("paragraphe" in b ? b.paragraphe : b.liste.flat()))),
    ...page.sources.flat(),
  ];
  return segments.flatMap((s) => (typeof s === "object" && "vers" in s ? [s.vers] : []));
}
