"use client";

import Link from "next/link";
import { useState } from "react";
import { Globe } from "@/components/globe/Globe";
import type { Fil } from "@/components/globe/geo";
import { fr } from "@/lib/i18n/fr";

const t = fr.atlas;

/**
 * The globe of the Atlas with the day's threads, and the panel of the country chosen on it (R7): its name, its domains
 * of the « État » perimeter and the way to its page. First version: the panel follows the globe; DESIGN.md §9 places
 * it on the side at the computer.
 */
export function GlobeAtlas({ fils, origine, liens }: { fils: Fil[]; origine: Fil; liens: Record<string, string> }) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const pays = fils.find((f) => f.code === choisi) ?? null;
  return (
    <div className="atlas-globe">
      <Globe fils={fils} origine={origine} choisi={choisi} onChoisir={setChoisi} />
      {pays === null ? null : (
        <section className="atlas-panneau" aria-live="polite">
          <p>{t.panneau(pays.nom, String(pays.sites))}</p>
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
