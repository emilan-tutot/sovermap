"use client";

import { useSyncExternalStore } from "react";
import { fr } from "@/lib/i18n/fr";

const rienAEcouter = () => () => undefined;
const partageDisponible = () => typeof navigator.share === "function";
const jamaisSurLeServeur = () => false;

/**
 * « Partager » (the owner's point 13, § 10): the browser's own share sheet, with the page's title and address, when the
 * browser has one; otherwise nothing is shown. No third party, nothing written in the browser.
 */
export function Partager({ titre, adresse }: { titre: string; adresse: string }) {
  const possible = useSyncExternalStore(rienAEcouter, partageDisponible, jamaisSurLeServeur);
  if (!possible) return null;
  return (
    <button
      type="button"
      className="bouton"
      onClick={() => {
        // A cancelled share is not an error.
        navigator.share({ title: titre, url: adresse }).catch(() => undefined);
      }}
    >
      {fr.citer.partager}
    </button>
  );
}
