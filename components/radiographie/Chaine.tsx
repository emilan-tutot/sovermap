import { Valeur } from "@/components/texte/Valeur";

/** One step of the chain, from the site to the country of a seat; `horsUE` marks the country outside the Union. */
export type Etape = { couche: number; libelle: string; valeur: string; brute: boolean; horsUE: boolean | null };
export type FormeChaine = "a" | "b" | "c";

/**
 * The chain of the Radiographie (DESIGN.md §5 and §8), on the right at the computer, each step leading to its layer;
 * the step of the layer being read lights up (CoucheLue). Three forms proposed at a point, until the owner chooses:
 * A « la liste » (steps on a fine rule), B « le fil » (a thread with a node per step, like the globe's), C « la coupe »
 * (strata, like a cross-section). The forms not chosen are then removed, with the « chaine » parameter.
 */
export function Chaine({ etapes, forme }: { etapes: readonly Etape[]; forme: FormeChaine }) {
  return (
    <ol className={`chaine chaine-${forme}`}>
      {etapes.map((e) => (
        <li key={e.couche} data-hors-ue={e.horsUE === true ? "oui" : undefined}>
          {forme === "b" ? (
            <svg className="chaine-noeud" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" />
            </svg>
          ) : null}
          <a href={`#couche-${e.couche}`}>{e.libelle}</a>
          <span className={e.brute ? "valeur" : undefined}>
            {forme === "c" && e.horsUE === true ? <span className="chaine-marque" aria-hidden="true" /> : null}
            {e.brute ? <Valeur texte={e.valeur} /> : e.valeur}
          </span>
        </li>
      ))}
    </ol>
  );
}
