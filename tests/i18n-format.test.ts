// Tests of the French formats (DESIGN.md § 6): narrow no-break spaces, decimal comma, dates and UTC times.
import { describe, expect, it } from "vitest";
import { dateFr, heureUtc, minutes, nombre, pourcent } from "@/lib/i18n/format";

const FINE = " ";

describe("the French formats", () => {
  it("writes numbers with a narrow no-break space between thousands and a decimal comma", () => {
    expect(nombre(101827)).toBe(`101${FINE}827`);
    expect(nombre(0.054, 3)).toBe("0,054");
    expect(nombre(41720)).not.toMatch(/[  ]/);
  });

  it("keeps « % » and a unit with their number", () => {
    expect(pourcent(1.11)).toBe(`1,11${FINE}%`);
    expect(pourcent(100, 0)).toBe(`100${FINE}%`);
    expect(minutes(189)).toBe(`189${FINE}min`);
  });

  it("writes the UTC day as 21/11/2026, and the UTC time, never an unreadable value", () => {
    expect(dateFr("2026-11-21")).toBe("21/11/2026");
    expect(dateFr("2026-11-21T23:59:59.000Z")).toBe("21/11/2026");
    expect(heureUtc("2026-11-21T21:18:08.728Z")).toBe("21:18");
    expect(dateFr("hier")).toBe("");
    expect(heureUtc("")).toBe("");
  });
});
