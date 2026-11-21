// A pull request's trial never measures during, or around the start of, a day's collection.
import { describe, expect, it } from "vitest";
import { creneauEssaiLibre } from "./creneau";

const a = (heure: string) => new Date(`2026-11-22T${heure}:00Z`);

describe("the slot of a trial", () => {
  it("is free far from the day's collections, and never while one runs or waits", () => {
    expect(creneauEssaiLibre(a("14:00"), 0)).toBe(true);
    expect(creneauEssaiLibre(a("14:00"), 1)).toBe(false);
  });

  it("is closed within 45 minutes of 03:17 and 09:47 UTC, before as after (a scheduled run may start late)", () => {
    for (const heure of ["02:33", "03:00", "03:17", "03:50", "04:02", "09:02", "09:47", "10:32"]) {
      expect(creneauEssaiLibre(a(heure), 0)).toBe(false);
    }
    for (const heure of ["02:31", "04:03", "09:01", "10:33", "23:59", "00:00"]) {
      expect(creneauEssaiLibre(a(heure), 0)).toBe(true);
    }
  });
});
