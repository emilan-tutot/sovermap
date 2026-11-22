import type { Attributions } from "@/lib/donnees/attributions";
import { fr } from "@/lib/i18n/fr";

const t = fr.donneesOuvertes.attributions;

/**
 * The sources' attributions (F.1; docs/sources.md): those the licences or the conditions require, then those given by
 * courtesy, each with the real date of its file. Two sections, titled like every section of the text pages.
 */
export function ListeAttributions({ attributions }: { attributions: Attributions }) {
  return (
    <>
      <section className="texte-section" aria-labelledby="attributions-exigees">
        <h2 id="attributions-exigees">{t.exigees}</h2>
        <p>{t.exigeesIntro}</p>
        <ul className="attributions">
          {attributions.exigees.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
      <section className="texte-section" aria-labelledby="attributions-courtoisie">
        <h2 id="attributions-courtoisie">{t.courtoisie}</h2>
        <p>{t.courtoisieIntro}</p>
        <ul className="attributions">
          {attributions.courtoisie.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
