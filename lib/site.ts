// Facts about the deployed site that pages and scripts share. Nothing here is personal: the account name of the
// repository comes from configuration (SOVERMAP_GITHUB_OWNER), never from the code.

type Env = Readonly<Record<string, string | undefined>>;

/** The commit this build was made from (Vercel sets VERCEL_GIT_COMMIT_SHA at build time), short form. */
export function servedVersion(env: Env = process.env): string {
  const sha = env["VERCEL_GIT_COMMIT_SHA"] ?? env["GITHUB_SHA"] ?? "";
  return /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7).toLowerCase() : "local";
}

/**
 * The production door (brief of chantier 2, A.6): open only on the exact value SITE_PUBLIC=open, set at the launch on
 * the owner's decision. Absent, empty or any other value keeps it closed: only the waiting page answers (lib/porte.ts),
 * and no data is read: every data reader checks this function before any read, at build time as at request time.
 */
export function sitePublic(env: Env = process.env): boolean {
  return env["SITE_PUBLIC"] === "open";
}

/** Search engines may index the site only through an open door AND with SITE_INDEXING "open" (at launch). */
export function indexingOpen(env: Env = process.env): boolean {
  return sitePublic(env) && env["SITE_INDEXING"] === "open";
}
