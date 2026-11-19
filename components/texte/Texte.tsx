import { Fragment, type ReactNode } from "react";

/** Compound names that never break at their hyphen: États-Unis, Royaume-Uni, Pays-Bas… */
const NOM_COMPOSE = /(\p{Lu}[\p{L}’']*(?:-\p{Lu}[\p{L}’']*)+)/u;
/** A word and its note calls, « Unis [1] », « Unis[1] » or « Unis[1][2] »: the calls stay glued to their word. */
const APPEL = /(\S+?)((?:\s?\[\d+\])+)/;

function noms(texte: string, cle: string): ReactNode[] {
  return texte.split(NOM_COMPOSE).map((morceau, i) =>
    i % 2 === 1 ? (
      <span key={`${cle}-${i}`} className="nb">
        {morceau}
      </span>
    ) : (
      morceau
    ),
  );
}

/** A sentence of the site: its compound names never break. */
export function Texte({ texte }: { texte: string }) {
  // A separator « · » never starts a line: a non-breaking space glues it to the word before it.
  return <>{noms(texte.replaceAll(" · ", "\u00a0· "), "t")}</>;
}

/**
 * A paragraph with note calls: each « [n] » becomes a call glued to the word before it, linked to note n, with its own
 * anchor for the way back. `appels` counts the calls of the page, paragraph after paragraph (call it in order).
 */
export function texteAvecAppels(texte: string, appels: Map<string, number>): ReactNode {
  const sortie: ReactNode[] = [];
  let reste = texte;
  let i = 0;
  for (let m = APPEL.exec(reste); m; m = APPEL.exec(reste)) {
    const [entier, mot = "", suite = ""] = m;
    sortie.push(<Fragment key={`a-${i}`}>{noms(reste.slice(0, m.index), `a-${i}`)}</Fragment>);
    const renvois = [...suite.matchAll(/\[(\d+)\]/g)].map((r, j) => {
      const numero = r[1] ?? "";
      const n = (appels.get(numero) ?? 0) + 1;
      appels.set(numero, n);
      return (
        <a key={`r-${i}-${j}`} id={n === 1 ? `appel-${numero}` : `appel-${numero}-${n}`} className="renvoi" href={`#note-${numero}`}>
          [{numero}]
        </a>
      );
    });
    sortie.push(
      <span key={`b-${i}`} className="nb">
        {noms(mot, `b-${i}`)}
        {renvois}
      </span>,
    );
    reste = reste.slice(m.index + entier.length);
    i += 1;
  }
  sortie.push(<Fragment key="fin">{noms(reste, "fin")}</Fragment>);
  return <>{sortie}</>;
}
