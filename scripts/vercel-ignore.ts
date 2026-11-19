// Vercel's « Ignored Build Step » (vercel.json, `ignoreCommand`): decides whether a deployment is worth building.
//   node scripts/vercel-ignore.ts      exit 0 = skip the build, exit 1 = build
// Every deployment is stored and counts in the free plan's quotas, and most commits cannot change what a visitor is
// served (documents, tests, CI, the collection pipeline). Two rules, nothing clever:
//   - the production branch ALWAYS builds;
//   - any other branch is skipped only when EVERY file changed since its last built commit is INERT.
// When anything is unknown (no branch, no usable git history, an unreadable diff) the answer is « build ».
// Adapted from a generic tool of another project of the owner. No dependency: Node runs this file as it is.
import { execFileSync } from "node:child_process";

/** Paths that cannot alter the site as served. */
export const INERT: readonly RegExp[] = [
  /^docs\//,
  /^specs\//,
  /^\.specify\//,
  /^\.claude\//,
  /^\.github\//,
  /^e2e\//,
  /^tests\//,
  /^pipeline\//,
  /^referentiels\//,
  /^scripts\//,
  /^[^/]+\.md$/i,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^\.prettierrc\.json$/,
  /^\.prettierignore$/,
  /^\.env\.example$/,
  /^playwright\.config\.ts$/,
  /^vitest\.config\.mts$/,
  /^eslint\.config\.mjs$/,
  /^LICENSE$/,
];

/** The branch Vercel treats as production. */
export const PRODUCTION_BRANCH = "main";

export type Decision = { build: boolean; reason: string };

/** Pure: the decision from the facts Vercel gives. `changed` is null when the diff could not be read. */
export function decide(facts: { branch: string | null; vercelEnv: string | null; changed: readonly string[] | null }): Decision {
  const { branch, vercelEnv, changed } = facts;
  if (vercelEnv === "production" || branch === PRODUCTION_BRANCH) return { build: true, reason: "production: always built" };
  if (branch === null || branch === "") return { build: true, reason: "no branch name: built, to be safe" };
  if (changed === null) return { build: true, reason: "the changed files could not be read: built, to be safe" };
  if (changed.length === 0) return { build: true, reason: "no changed file listed: built, to be safe" };
  const visible = changed.filter((file) => !INERT.some((pattern) => pattern.test(file)));
  if (visible.length > 0) {
    const shown = visible.slice(0, 3).join(", ") + (visible.length > 3 ? ", …" : "");
    return { build: true, reason: `${visible.length} file(s) can change the site (${shown})` };
  }
  return { build: false, reason: `only documents, tests, CI or tooling changed (${changed.length} file(s)): not built` };
}

/** The files changed since the last built commit of this branch (VERCEL_GIT_PREVIOUS_SHA), null when unknown. */
export function changedFiles(base: string | null): string[] | null {
  if (base === null || base === "") return null;
  try {
    const out = execFileSync("git", ["diff", "--name-only", "--no-renames", base, "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.split("\n").filter((line) => line !== "");
  } catch {
    return null;
  }
}

export function main(env: NodeJS.ProcessEnv = process.env): number {
  const decision = decide({
    branch: env["VERCEL_GIT_COMMIT_REF"] ?? null,
    vercelEnv: env["VERCEL_ENV"] ?? null,
    changed: changedFiles(env["VERCEL_GIT_PREVIOUS_SHA"] ?? null),
  });
  console.log(`vercel-ignore: ${decision.reason}`);
  // Vercel: exit code 0 cancels the build, 1 lets it run.
  return decision.build ? 1 : 0;
}

// Run unless a test imports this file. Fails SAFE: any error means « build ».
if (process.env["VITEST"] === undefined) {
  try {
    process.exit(main());
  } catch (error) {
    console.log(`vercel-ignore: ${error instanceof Error ? error.message : "error"}: built, to be safe`);
    process.exit(1);
  }
}
