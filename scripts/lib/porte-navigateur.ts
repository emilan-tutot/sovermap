// The script that asks the production door's list in a browser tab of the site (rule of point 01, chantier 2): in
// Edge, through Claude in Chrome, as a visitor's browser does — it passes Vercel's Security Checkpoint and the
// protection of the previews, which a script from the command line cannot and must not get round. Every address of
// lib/porte.ts, one at a time and one second apart, judged by the very functions probe:prod uses: their source is
// copied into the script, so both always apply the same rules.
import { ADRESSES_PORTE } from "../../lib/porte";
import { ecartsPorte, estHtml, SIGNES_DE_DONNEES, TEXTES_PORTE, texteLisible } from "./porte-controle";

/**
 * A text in ASCII only: every other UTF-16 unit becomes a « \u » escape, valid in the strings, templates and regular
 * expressions of the script (the only places where it holds such characters). The script is copied by hand into a
 * tool, where a non-breaking space or a typographic apostrophe could silently become another character.
 */
export function enAscii(texte: string): string {
  let sortie = "";
  for (let i = 0; i < texte.length; i += 1) {
    const code = texte.charCodeAt(i);
    sortie += code < 128 ? texte.charAt(i) : `\\u${code.toString(16).padStart(4, "0")}`;
  }
  return sortie;
}

/**
 * The text of the script; the browser tool returns its last value: `{ origine, version, adresses, ecarts }`.
 * `espacementMs`: the pause between two requests to the site (one second at least, brief § 0.2; the tests use 0).
 */
export function scriptNavigateur(espacementMs = 1_000): string {
  return enAscii(`await (async () => {
  // A script run by tsx names its functions with __name (specs/001-sovermap/pieges-connus.md, 30).
  const __name = (f) => f;
  const TEXTES_PORTE = ${JSON.stringify(TEXTES_PORTE)};
  const SIGNES_DE_DONNEES = [${SIGNES_DE_DONNEES.map(String).join(", ")}];
  const texteLisible = ${texteLisible.toString()};
  const estHtml = ${estHtml.toString()};
  const ecartsPorte = ${ecartsPorte.toString()};
  const adresses = ${JSON.stringify(ADRESSES_PORTE)};
  const ecarts = [];
  let derniere = 0;
  for (const adresse of adresses) {
    const attente = derniere + ${Math.max(0, Math.round(espacementMs))} - Date.now();
    if (attente > 0) await new Promise((resolve) => setTimeout(resolve, attente));
    derniere = Date.now();
    const r = await fetch(adresse.chemin, {
      cache: "no-store",
      redirect: adresse.entetes === undefined ? "manual" : "follow",
      headers: { ...adresse.entetes },
    });
    const version = document.querySelector('meta[name="sovermap-version"]')?.getAttribute("content") ?? null;
    // Vercel's Security Checkpoint: neither green nor red; stop at once and say where (CLAUDE.md).
    if (r.status === 403 && r.headers.get("x-vercel-mitigated") === "challenge") {
      return { origine: location.origin, version, adresses: adresses.length, checkpoint: adresse.chemin, ecarts };
    }
    const redirige = r.type === "opaqueredirect";
    ecarts.push(
      ...ecartsPorte(
        adresse,
        {
          status: redirige ? 300 : r.status,
          contentType: r.headers.get("content-type") ?? "",
          texte: redirige ? "" : await r.text(),
          origine: location.origin,
        },
        TEXTES_PORTE,
      ),
    );
  }
  const version = document.querySelector('meta[name="sovermap-version"]')?.getAttribute("content") ?? null;
  return { origine: location.origin, version, adresses: adresses.length, checkpoint: null, ecarts };
})()`);
}
