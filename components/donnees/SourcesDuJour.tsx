import type { DonneesOuvertes } from "@/lib/donnees/ouvertes";
import { dateFr } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.donneesOuvertes;

/** The day's sources (F.1): each download with its card of the registry, the date of its file and its state. */
export function SourcesDuJour({ donnees }: { donnees: DonneesOuvertes }) {
  return (
    <section className="texte-section" aria-labelledby="sources-du-jour">
      <h2 id="sources-du-jour">{t.sources}</h2>
      {donnees.methode === null ? null : <p>{t.methode(donnees.methode)}</p>}
      <ul>
        {donnees.sources.map((s) => (
          <li key={`${s.id}-${s.fiche}`}>
            {t.source(s.id, s.fiche, s.date === null ? t.sansDate : dateFr(s.date), s.etat)}
          </li>
        ))}
      </ul>
    </section>
  );
}
