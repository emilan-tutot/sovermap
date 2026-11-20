// No text written in a component: every word shown by the site comes from the one dictionary (lib/i18n/), French
// first, English in T11 (owner's rule, ARRÊT 2 quater). Read through the TypeScript syntax tree, not line by line:
// a JSX text with a letter, a string with a letter given to an attribute that people read or hear (aria-label, alt,
// title, placeholder…), or a string with a letter placed between braces in JSX.
import ts from "typescript";

export type TexteEnDur = { line: number; excerpt: string };

/** Attributes whose value is read or heard by people. */
const ATTRIBUTS_LUS = new Set(["aria-label", "aria-description", "aria-roledescription", "aria-valuetext", "aria-placeholder", "alt", "title", "placeholder", "label"]);
const LETTRE = /\p{L}/u;
/** HTML entities are spaces or signs, not words: « &nbsp;· » is no text. */
const ENTITE = /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/giu;

export function findHardcodedTexts(filePath: string, source: string): TexteEnDur[] {
  if (!filePath.endsWith(".tsx")) return [];
  const fichier = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const trouves: TexteEnDur[] = [];
  const noter = (noeud: ts.Node, texte: string) => {
    const { line } = fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier));
    trouves.push({ line: line + 1, excerpt: texte.trim().slice(0, 80) });
  };
  const parcourir = (noeud: ts.Node): void => {
    if (ts.isJsxText(noeud) && LETTRE.test(noeud.text.replace(ENTITE, " "))) noter(noeud, noeud.text);
    if (ts.isJsxAttribute(noeud) && ATTRIBUTS_LUS.has(noeud.name.getText(fichier))) {
      const valeur = noeud.initializer;
      if (valeur && ts.isStringLiteral(valeur) && LETTRE.test(valeur.text)) noter(valeur, valeur.text);
      if (valeur && ts.isJsxExpression(valeur) && valeur.expression && (ts.isStringLiteral(valeur.expression) || ts.isNoSubstitutionTemplateLiteral(valeur.expression)) && LETTRE.test(valeur.expression.text)) noter(valeur, valeur.expression.text);
    }
    if (ts.isJsxExpression(noeud) && noeud.parent && (ts.isJsxElement(noeud.parent) || ts.isJsxFragment(noeud.parent)) && noeud.expression) {
      const e = noeud.expression;
      if ((ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && LETTRE.test(e.text)) noter(e, e.text);
    }
    ts.forEachChild(noeud, parcourir);
  };
  parcourir(fichier);
  return trouves;
}
