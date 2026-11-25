"use client";

import { useEffect } from "react";

/**
 * The layer being read lights up, and so does its step in the chain (DESIGN.md §5 and §8): the layer most in view, in
 * the middle band of the screen. No animation (a state, not a movement); without JavaScript, nothing changes and the
 * chain's links still lead to their layers.
 */
export function CoucheLue() {
  useEffect(() => {
    const couches = [...document.querySelectorAll<HTMLElement>(".couche")];
    const etapes = [...document.querySelectorAll<HTMLAnchorElement>(".chaine a")];
    if (couches.length === 0 || !("IntersectionObserver" in window)) return;
    const parts = new Map<string, number>();
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) parts.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let lue: string | null = null;
        let meilleure = 0;
        for (const [id, part] of parts) {
          if (part > meilleure) [lue, meilleure] = [id, part];
        }
        for (const c of couches) c.toggleAttribute("data-lue", c.id === lue);
        for (const a of etapes) a.closest("li")?.toggleAttribute("data-lue", a.hash === `#${lue ?? ""}`);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-25% 0px -45% 0px" },
    );
    for (const c of couches) observateur.observe(c);
    return () => observateur.disconnect();
  }, []);
  return null;
}
