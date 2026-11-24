import { Valeur } from "@/components/texte/Valeur";

/** One step of the chain, from the site to the country of a seat; `horsUE` marks the country outside the Union. */
export type Etape = { couche: number; libelle: string; valeur: string; brute: boolean; horsUE: boolean | null };

/**
 * The chain of the Radiographie (DESIGN.md §5 and §8), on the right at the computer, each step leading to its layer;
 * the step of the layer being read lights up (CoucheLue). Its form is « le fil » (point 10, Q2 B, chosen by the owner on
 * 22/11/2026): a thread with a node per step, like the globe's threads.
 */
export function Chaine({ etapes }: { etapes: readonly Etape[] }) {
  return (
    <ol className="chaine chaine-b">
      {etapes.map((e) => (
        <li key={e.couche} data-hors-ue={e.horsUE === true ? "oui" : undefined}>
          <svg className="chaine-noeud" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" />
          </svg>
          <a href={`#couche-${e.couche}`}>{e.libelle}</a>
          <span className={e.brute ? "valeur" : undefined}>{e.brute ? <Valeur texte={e.valeur} /> : e.valeur}</span>
        </li>
      ))}
    </ol>
  );
}
