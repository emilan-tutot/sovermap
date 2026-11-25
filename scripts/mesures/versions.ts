// Version ranges of GitHub's advisory database (« >= 15.0.0, < 15.2.3 », « < 1.2.3 », « = 1.0.0 »), read without a
// dependency: a range is a list of comparators that must all hold. A comparator of an unknown form counts as holding,
// so that a doubtful advisory is shown rather than hidden.

/** « 16.4.6 » → [16, 4, 6]; a pre-release keeps its numbers (« 16.5.0-canary.1 » → [16, 5, 0]). */
const nombres = (version: string): number[] => (version.split("-")[0] ?? "").split(".").map((x) => Number(x));

/** Negative, zero or positive, as version a comes before, with or after version b. */
export function comparerVersions(a: string, b: string): number {
  const x = nombres(a);
  const y = nombres(b);
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const ecart = (x[i] ?? 0) - (y[i] ?? 0);
    if (ecart !== 0) return ecart;
  }
  return 0;
}

/** Does the range hold the version? */
export function dansLaPlage(version: string, plage: string): boolean {
  return plage
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c !== "")
    .every((c) => {
      const lu = /^(>=|<=|>|<|=)?\s*([0-9][^\s]*)$/.exec(c);
      if (lu === null) return true;
      const ecart = comparerVersions(version, lu[2] ?? "");
      switch (lu[1]) {
        case ">=":
          return ecart >= 0;
        case "<=":
          return ecart <= 0;
        case ">":
          return ecart > 0;
        case "<":
          return ecart < 0;
        default:
          return ecart === 0;
      }
    });
}
