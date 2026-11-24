// A pull request's trial never measures during, or around the start of, a day's collection.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { creneauEssaiLibre, DEPARTS_MINUTES, MARGE_AVANT_MINUTES } from "./creneau";

const a = (heure: string) => new Date(`2026-11-22T${heure}:00Z`);

describe("the slot of a trial", () => {
  it("knows the very times the workflow schedules (collecte.yml's cron lines)", () => {
    const workflow = readFileSync(".github/workflows/collecte.yml", "utf8");
    const departs = [...workflow.matchAll(/- cron: "(\d+) (\d+) \* \* \*"/g)].map(
      ([, minute = "", heure = ""]) => Number(heure) * 60 + Number(minute),
    );
    expect(departs.sort((x, y) => x - y)).toEqual([...DEPARTS_MINUTES].sort((x, y) => x - y));
  });

  it("is free far from the day's collections, and never while one runs or waits", () => {
    expect(creneauEssaiLibre(a("12:30"), 0)).toBe(true);
    expect(creneauEssaiLibre(a("12:30"), 1)).toBe(false);
  });

  it("is closed 90 minutes before 03:17, 09:47 and 15:17 UTC and 120 minutes after (a scheduled run may start late)", () => {
    for (const heure of ["01:47", "03:00", "03:17", "04:17", "05:17", "08:17", "09:47", "11:47", "13:47", "17:17"]) {
      expect(creneauEssaiLibre(a(heure), 0)).toBe(false);
    }
    for (const heure of ["01:46", "05:18", "08:16", "11:48", "13:46", "17:18", "23:59", "00:00"]) {
      expect(creneauEssaiLibre(a(heure), 0)).toBe(true);
    }
  });

  it("counts the distance across midnight", () => {
    // A scheduled time at 00:05: closed from 22:35 to 02:05, free at 22:34 and 02:06.
    expect(["22:34", "22:35", "23:59", "00:00", "02:05", "02:06"].map((h) => creneauEssaiLibre(a(h), 0, [5]))).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it("keeps the margin before a collection at least as long as a trial may last: its three jobs (collecte.yml)", () => {
    const workflow = readFileSync(".github/workflows/collecte.yml", "utf8");
    const limites = [...workflow.matchAll(/pull_request' && (\d+) \|\|/g)].map((m) => Number(m[1]));
    expect(limites).toHaveLength(3);
    expect(MARGE_AVANT_MINUTES).toBeGreaterThanOrEqual(limites.reduce((a, b) => a + b, 0));
  });
});
