// The Journal's Atom feed (point 13, § 10): made-up days, a documentation address (RFC 2606).
import { describe, expect, it } from "vitest";
import type { Jour } from "@/lib/donnees/journal";
import { CHEMIN_FLUX, fluxAtom, JOURS_DU_FLUX } from "@/lib/journal-flux";

const jour = (date: string, n: number, o: Partial<Jour> = {}): Jour => ({
  date,
  etatInitial: false,
  reglesChangees: false,
  changements: Array.from({ length: n }, (_, i) => ({
    domaine: `d${i}.example`,
    couche: "adresses" as const,
    avant: "a",
    apres: "b",
  })),
  ...o,
});

describe("the Journal's Atom feed", () => {
  it("gives the latest day first, each with its address and what the journal says of it", () => {
    const flux = fluxAtom("https://site.example", [
      jour("2026-11-20", 0, { etatInitial: true }),
      jour("2026-11-22", 3),
      jour("2026-11-21", 0, { reglesChangees: true }),
    ]);
    expect(flux.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    expect(flux).toContain(`<id>https://site.example${CHEMIN_FLUX}</id>`);
    expect(flux).toContain("<updated>2026-11-22T00:00:00Z</updated>");
    const ids = [...flux.matchAll(/<entry>[^]*?<id>([^<]+)<[/]id>/g)].map((m) => m[1]);
    expect(ids).toEqual([
      "https://site.example/journal/2026-11-22",
      "https://site.example/journal/2026-11-21",
      "https://site.example/journal/2026-11-20",
    ]);
    expect(flux).toContain("<summary>3 changements confirmés.</summary>");
    expect(flux).toContain("<summary>Règles nouvelles ce jour-là");
    expect(flux).toContain("<summary>État initial");
    // No domain name: the feed counts, the day's page shows.
    expect(flux).not.toContain("d0.example");
  });

  it("escapes every text for XML, and keeps the latest days only", () => {
    const flux = fluxAtom(
      "https://site.example/?a=1&b=<2>",
      Array.from({ length: JOURS_DU_FLUX + 5 }, (_, i) => jour(`2026-10-${String(i + 1).padStart(2, "0")}`, 1)),
    );
    expect(flux).toContain("https://site.example/?a=1&amp;b=&lt;2&gt;");
    expect(flux).not.toMatch(/&b=|<2>/);
    expect([...flux.matchAll(/<entry>/g)]).toHaveLength(JOURS_DU_FLUX);
    expect(flux).not.toContain("2026-10-01");
  });
});
