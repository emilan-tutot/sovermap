// Tests of the freshness of the data (plan § 6, point 2): late past 36 hours, never earlier.
import { describe, expect, it } from "vitest";
import { fraicheurDe, RETARD_HEURES } from "@/lib/donnees/fraicheur";

const FIN = "2026-11-21T21:18:08.728Z";
const etat = (fin: string | null) => ({
  date: "2026-11-21",
  collecte: { debut: null, fin, dureeMinutes: null, pointDeMesure: null },
});

describe("the freshness of the data", () => {
  it("is late only past 36 hours after the collection's end", () => {
    const a36h = Date.parse(FIN) + RETARD_HEURES * 3_600_000;
    expect(fraicheurDe(etat(FIN), a36h)).toEqual({ derniereCollecte: FIN, ageHeures: 36, enRetard: false });
    expect(fraicheurDe(etat(FIN), a36h + 1000).enRetard).toBe(true);
  });

  it("takes the start of the day when etat.json does not say when the collection ended", () => {
    const f = fraicheurDe(etat(null), Date.parse("2026-11-22T12:00:01.000Z"));
    expect(f).toMatchObject({ derniereCollecte: "2026-11-21T00:00:00.000Z", enRetard: true });
  });

  it("never gives a negative age (a clock behind the collection's)", () => {
    expect(fraicheurDe(etat(FIN), Date.parse("2026-11-21T20:00:00.000Z")).ageHeures).toBe(0);
  });
});
