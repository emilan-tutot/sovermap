// The script that asks the production door's list in a browser tab of the site (rule of point 01, chantier 2): in
// Edge, through Claude in Chrome, as a visitor's browser does — it passes Vercel's Security Checkpoint and the
// protection of the previews, which a script from the command line cannot and must not get round. Every address of
// lib/porte.ts, one at a time and one second apart, judged by the very functions probe:prod uses: their source is
// copied into the script, so both always apply the same rules.
import { ADRESSES_PORTE } from "../../lib/porte";
import { ecartsPorte, estHtml, SIGNES_DE_DONNEES, TEXTES_PORTE, texteLisible } from "./porte-controle";

/**
 * The text of the script; the browser tool returns its last value: `{ origine, version, adresses, ecarts }`.
 * `espacementMs`: the pause between two requests to the site (one second at least, brief § 0.2; the tests use 0).
 */
export function scriptNavigateur(espacementMs = 1_000): string {
  return `await (async () => {
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
    const redirige = r.type === "opaqueredirect";
    ecarts.push(
      ...ecartsPorte(
        adresse,
        {
          status: redirige ? 300 : r.status,
          contentType: r.headers.get("content-type") ?? "",
          texte: redirige ? "" : await r.text(),
        },
        TEXTES_PORTE,
      ),
    );
  }
  const version = document.querySelector('meta[name="sovermap-version"]')?.getAttribute("content") ?? null;
  return { origine: location.origin, version, adresses: adresses.length, ecarts };
})()`;
}
