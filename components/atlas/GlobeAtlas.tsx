"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Globe } from "@/components/globe/Globe";
import type { Fil } from "@/components/globe/geo";
import { fr } from "@/lib/i18n/fr";

const t = fr.atlas;
/** The width under which the panel takes the whole height of the screen (DESIGN.md §9; the computer's breakpoint). */
const TELEPHONE = "(max-width: 61.99rem)";

/**
 * The globe of the Atlas with the day's threads, and the panel of the country chosen on it (R7; DESIGN.md §9): on the
 * side at the computer; on a phone, the whole height under the header, the page not scrolling under it. Its edge never
 * cuts a word: the globe's labels, which it would cover, fade while it is open. Closed by its button or by Escape.
 */
export function GlobeAtlas({ fils, origine, liens }: { fils: Fil[]; origine: Fil; liens: Record<string, string> }) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const titre = useRef<HTMLHeadingElement>(null);
  const pays = fils.find((f) => f.code === choisi) ?? null;
  const ouvert = pays !== null;

  useEffect(() => {
    if (!ouvert) return;
    titre.current?.focus();
    const fermer = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChoisi(null);
    };
    window.addEventListener("keydown", fermer);
    // On a phone, the page does not scroll under the panel.
    const racine = document.documentElement;
    const avant = racine.style.overflow;
    if (window.matchMedia(TELEPHONE).matches) racine.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fermer);
      racine.style.overflow = avant;
    };
  }, [ouvert]);

  return (
    <div className="atlas-globe" data-panneau={ouvert ? "ouvert" : undefined}>
      <Globe fils={fils} origine={origine} choisi={choisi} onChoisir={setChoisi} />
      {pays === null ? null : (
        <section className="atlas-panneau" aria-labelledby="atlas-panneau-titre">
          <h2 id="atlas-panneau-titre" ref={titre} tabIndex={-1}>
            {pays.nom}
          </h2>
          <p>{t.panneau(String(pays.sites))}</p>
          <p className={pays.horsUE ? "hors-ue" : undefined}>{pays.horsUE ? t.horsUE : t.dansUE}</p>
          {liens[pays.code] === undefined ? null : (
            <Link href={`/pays/${liens[pays.code]}`} prefetch={false}>
              {t.voirPays}
            </Link>
          )}
          <button type="button" className="bouton" onClick={() => setChoisi(null)}>
            {t.fermer}
          </button>
        </section>
      )}
    </div>
  );
}
