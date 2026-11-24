"use client";

import { useId, useState } from "react";
import type { JourPublie } from "@/lib/donnees/historique";
import { dateFr, pourcent } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.atlas.temps;

/**
 * The time slider of the Atlas (D.2), active from two published days: the headline figure of the chosen day, its
 * probable and undetermined shares, and, on a day of new rules, the warning that its change is not a move (B.7 bis).
 * A plain range input: the keyboard's arrows move it, and the figure it shows is read aloud.
 */
export function CurseurTemps({ jours }: { jours: readonly JourPublie[] }) {
  const [i, setI] = useState(jours.length - 1);
  const id = useId();
  const jour = jours[i];
  if (jours.length < 2 || jour === undefined) return null;
  const pc = (n: number) => pourcent(n, 1);
  return (
    <div className="curseur-temps">
      <label htmlFor={id}>{t.libelle}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={jours.length - 1}
        step={1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        aria-valuetext={dateFr(jour.date)}
      />
      <p aria-live="polite">
        {t.jour(
          dateFr(jour.date),
          pc(jour.chiffreTitre.auMoinsPourcent),
          pc(jour.chiffreTitre.probablePourcent),
          pc(jour.chiffreTitre.nonDeterminePourcent),
        )}
      </p>
      {jour.reglesChangees ? <p className="releve-note">{t.reglesChangees(jour.methode)}</p> : null}
    </div>
  );
}
