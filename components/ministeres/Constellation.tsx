import type { Groupe } from "@/lib/donnees/ministeres";
import { fr } from "@/lib/i18n/fr";
import { nombre } from "@/lib/i18n/format";

const t = fr.ministeres.constellation;
const RAYON = 6;
const PAS = 15;

/** How a group's discs are drawn: filled with the accent outside the Union, outlined inside it, dashed when unknown. */
type Genre = "hors-ue" | "ue" | "inconnu";
const genreDe = (g: Groupe): Genre =>
  g.societe === null || g.categorie === "non déterminé"
    ? "inconnu"
    : g.categorie === "hors d'Europe" || g.categorie === "Europe hors UE"
      ? "hors-ue"
      : "ue";

/** One group: its discs in rows (as square as can be), its name under them (« son nom contre son groupe »). */
function Groupe_({ g }: { g: Groupe }) {
  const n = g.domaines.length;
  const colonnes = Math.max(1, Math.ceil(Math.sqrt(n)));
  const lignes = Math.ceil(n / colonnes);
  const largeur = colonnes * PAS + 2;
  const hauteur = lignes * PAS + 2;
  const genre = genreDe(g);
  const nom = g.nom ?? fr.ministeres.sansSociete;
  return (
    <figure className="constellation-groupe">
      <svg
        className={`constellation-disques constellation-${genre}`}
        viewBox={`0 0 ${largeur} ${hauteur}`}
        width={largeur}
        height={hauteur}
        role="img"
        aria-label={t.libelleGroupe(nom, n, t.genres[genre])}
      >
        {g.domaines.map((d, i) => (
          <circle
            key={d}
            cx={1 + (i % colonnes) * PAS + PAS / 2}
            cy={1 + Math.floor(i / colonnes) * PAS + PAS / 2}
            r={RAYON}
          />
        ))}
      </svg>
      <figcaption>
        <span>{nom}</span>
        <span className="valeur">{nombre(n)}</span>
      </figcaption>
    </figure>
  );
}

/**
 * The constellation of a ministry (DESIGN.md §5): one disc per site, grouped by the company that serves it, its name
 * against its group; a disc filled with the accent when the company's ultimate parent is outside the European Union;
 * a legend that says what the colour and the size mean. The list that follows is its text alternative.
 */
export function Constellation({ groupes }: { groupes: readonly Groupe[] }) {
  return (
    <div className="constellation">
      <ul className="constellation-legende" aria-label={t.legende}>
        <li>
          <svg viewBox="0 0 14 14" width="14" height="14" className="constellation-hors-ue" aria-hidden="true">
            <circle cx="7" cy="7" r={RAYON} />
          </svg>
          <span>{t.genres["hors-ue"]}</span>
        </li>
        <li>
          <svg viewBox="0 0 14 14" width="14" height="14" className="constellation-ue" aria-hidden="true">
            <circle cx="7" cy="7" r={RAYON} />
          </svg>
          <span>{t.genres.ue}</span>
        </li>
        <li>
          <svg viewBox="0 0 14 14" width="14" height="14" className="constellation-inconnu" aria-hidden="true">
            <circle cx="7" cy="7" r={RAYON} />
          </svg>
          <span>{t.genres.inconnu}</span>
        </li>
        <li>
          <span>{t.taille}</span>
        </li>
      </ul>
      <div className="constellation-groupes">
        {groupes.map((g) => (
          <Groupe_ key={g.societe ?? "aucune"} g={g} />
        ))}
      </div>
    </div>
  );
}
