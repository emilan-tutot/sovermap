"use client";

import { erreur } from "@/lib/i18n/fr-erreur";

// A page whose data could not be read answers an error (lib/donnees/indisponible.ts): this page, with an error status
// that Vercel's CDN never keeps (D.4). No detail of the error is ever shown.
export default function Erreur() {
  return (
    <main id="contenu" className="contenu">
      <h1 className="titre-page">{erreur.titre}</h1>
      <p className="chapo">{erreur.texte}</p>
    </main>
  );
}
