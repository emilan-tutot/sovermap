// Facts about the deployed site that pages and scripts share. Nothing here is personal: the account name of the
// repository comes from configuration (SOVERMAP_GITHUB_OWNER), never from the code.

type Env = Readonly<Record<string, string | undefined>>;

/** The commit this build was made from (Vercel sets VERCEL_GIT_COMMIT_SHA at build time), short form. */
export function servedVersion(env: Env = process.env): string {
  const sha = env["VERCEL_GIT_COMMIT_SHA"] ?? env["GITHUB_SHA"] ?? "";
  return /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7).toLowerCase() : "local";
}

/**
 * The site's configured origin (NEXT_PUBLIC_SITE_URL), or null when none is set. A value that is not a bare origin
 * (a path, a typo) stops the build: the site never announces two different origins.
 */
export function origineConfiguree(env: Env = process.env): string | null {
  const valeur = env["NEXT_PUBLIC_SITE_URL"]?.trim();
  if (valeur === undefined || valeur === "") return null;
  const origine = valeur.replace(/\/$/, "");
  if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origine)) {
    throw new Error("NEXT_PUBLIC_SITE_URL doit être une origine, sans chemin (par exemple https://sovermap.com).");
  }
  return origine;
}

/**
 * The site's absolute origin, for the addresses that must be absolute (the share image): the configured one, else the
 * production domain Vercel gives every build (VERCEL_PROJECT_PRODUCTION_URL: the shortest custom domain, else the
 * vercel.app one), else the local server. No variable is added in production.
 */
export function origineDuSite(env: Env = process.env): string {
  const configuree = origineConfiguree(env);
  if (configuree !== null) return configuree;
  const vercel = env["VERCEL_PROJECT_PRODUCTION_URL"]?.trim();
  if (vercel !== undefined && /^[a-z0-9.-]+$/i.test(vercel)) return `https://${vercel}`;
  return "http://localhost:3100";
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
