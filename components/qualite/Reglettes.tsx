import type { Fraicheur } from "@/lib/donnees/fraicheur";
import type { Qualite } from "@/lib/donnees/qualite";
import { fr } from "@/lib/i18n/fr";
import { gardeFous } from "./garde-fous";

/** The width of a scale, in its own units: the limit sits in its middle, twice the limit at its end. */
const LARGEUR = 300;

/**
 * Proposal B, « les garde-fous »: each guard as a fine scale, from 0 to twice its limit; the limit is a tick, the value
 * a dot; its figures, its limit and its verdict are said in words beside it (the scale is a picture, hidden from
 * screen readers). A value beyond twice the limit stops at the end of the scale.
 */
export function Reglettes({ q, f }: { q: Qualite; f: Fraicheur }) {
  const g = fr.qualite.gardeFous;
  return (
    <section className="releve" aria-labelledby="q-gardes">
      <h2 id="q-gardes">{fr.qualite.sections.gardeFous}</h2>
      <ul className="reglettes">
        {gardeFous(q, f).map((gf) => {
          const x = gf.valeur === null ? null : Math.min(LARGEUR, (gf.valeur / (2 * gf.limite)) * LARGEUR);
          const verdict = gf.tenu === null ? fr.qualite.nonPublie : gf.tenu ? g.tenu : g.depasse;
          return (
            <li key={gf.cle} className="reglette">
              <p className="reglette-libelle">{gf.libelle}</p>
              <p className="reglette-chiffres">
                <span className="valeur">{gf.texte ?? fr.qualite.nonPublie}</span> · {g.limite(gf.texteLimite)} ·{" "}
                {verdict}
              </p>
              <svg className="reglette-echelle" viewBox={`0 0 ${LARGEUR} 20`} aria-hidden="true" focusable="false">
                <line className="reglette-base" x1="0" y1="10" x2={LARGEUR} y2="10" vectorEffect="non-scaling-stroke" />
                <line
                  className="reglette-limite"
                  x1={LARGEUR / 2}
                  y1="2"
                  x2={LARGEUR / 2}
                  y2="18"
                  vectorEffect="non-scaling-stroke"
                />
                {x === null ? null : <circle className="reglette-point" cx={x} cy="10" r="4" />}
              </svg>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
