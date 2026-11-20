// Facts about the deployed site that pages and scripts share. Nothing here is personal: the account name of the
// repository comes from configuration (SOVERMAP_GITHUB_OWNER), never from the code.

type Env = Readonly<Record<string, string | undefined>>;

/** The commit this build was made from (Vercel sets VERCEL_GIT_COMMIT_SHA at build time), short form. */
export function servedVersion(env: Env = process.env): string {
  const sha = env["VERCEL_GIT_COMMIT_SHA"] ?? env["GITHUB_SHA"] ?? "";
  return /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7).toLowerCase() : "local";
}

/** Search engines may index the site only when SITE_INDEXING is "open" (at launch, on the owner's decision). */
export function indexingOpen(env: Env = process.env): boolean {
  return env["SITE_INDEXING"] === "open";
}
